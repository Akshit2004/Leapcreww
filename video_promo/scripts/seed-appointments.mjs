// Seeds the Appointment Booking use-case (Healthcare preset) for promo screenshots.
// Sets org.activeUseCase/appointmentPreset (saving prior values for revert),
// seeds doctor slots + patient contacts + bookings, and records all ids.
// Also clears leftover demo templates from the previous seed run.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const ORG = process.env.E2E_ORG_ID || "7aba66c7-773e-4403-ac39-dcb4e38b4a62";
const IDS_FILE = path.resolve(__dirname, "seed-appt-ids.json");
const LEFTOVER_TEMPLATES = [
  "c6ade8b6-1811-494d-8bd9-5ea8c498f497", "b91d7a2e-7f96-48d8-a624-243d7eef0f40",
  "cfbf3260-518e-4ade-ac0a-495753d4e145", "39b85d97-85ee-43df-86f6-c5a06bbbe8a0",
  "3ed03321-b020-48b7-8c08-6b0841ff8e5e", "630a7498-2b2d-4b1c-b0b5-9bad7bcefa5d",
];

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// clean leftover demo templates
const delT = await prisma.template.deleteMany({ where: { organizationId: ORG, id: { in: LEFTOVER_TEMPLATES } } });
console.log(`✓ removed leftover templates: ${delT.count}`);

// snapshot + set org use-case
const prevOrg = await prisma.organization.findUnique({ where: { id: ORG }, select: { activeUseCase: true, appointmentPreset: true } });
await prisma.organization.update({ where: { id: ORG }, data: { activeUseCase: "APPOINTMENT", appointmentPreset: "HEALTHCARE" } });
console.log("✓ org set to APPOINTMENT / HEALTHCARE (was", prevOrg, ")");

const created = { slots: [], bookings: [], contacts: [] };

// IST datetime helper → UTC Date (IST = UTC+5:30)
function ist(dayOffset, hh, mm) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  // hh:mm IST → subtract 5:30
  return new Date(d.getTime() + (hh * 60 + mm - 330) * 60000);
}

const DOCTORS = ["Dr. Sharma — Cardiology", "Dr. Verma — Dermatology", "Dr. Iyer — Pediatrics"];
const TIMES = [[10, 0], [10, 30], [11, 0], [11, 30], [12, 0], [15, 0], [15, 30], [16, 0]];
const PRICE = 50000; // ₹500 in paise

// Build slots across the next 4 days for each doctor.
const slotRows = [];
for (let day = 1; day <= 4; day++) {
  for (const doc of DOCTORS) {
    for (const [hh, mm] of TIMES) {
      // vary availability: skip a few to look natural; only some times per doctor
      if (Math.random() < 0.45) continue;
      slotRows.push({ id: randomUUID(), serviceName: doc, startTime: ist(day, hh, mm), durationMinutes: 30, price: PRICE });
    }
  }
}

// Seed patient contacts
const PATIENTS = ["Aarav Mehta", "Diya Kapoor", "Kabir Singh", "Anaya Reddy", "Vivaan Nair", "Myra Sharma"];
for (const name of PATIENTS) {
  const id = randomUUID();
  try {
    await prisma.contact.create({
      data: {
        id, name, phone: "+9197" + String(Math.floor(10000000 + Math.random() * 89999999)),
        email: name.toLowerCase().replace(/\s+/g, ".") + "@gmail.com",
        source: "WhatsApp", tags: ["patient"], status: "Active",
        lastMessage: "✅ Appointment Confirmed!", assignedAgent: "None", organizationId: ORG,
      },
    });
    created.contacts.push(id);
  } catch {}
}

// Insert slots; mark ~6 as booked and create bookings against them
let bookingIdx = 0;
const bookingDefs = [
  { patient: "Aarav Mehta", status: "booked" },
  { patient: "Diya Kapoor", status: "booked" },
  { patient: "Kabir Singh", status: "booked" },
  { patient: "Anaya Reddy", status: "booked" },
  { patient: "Vivaan Nair", status: "completed" },
  { patient: "Myra Sharma", status: "booked" },
];

slotRows.forEach((s, i) => { s._book = false; });
// deterministically pick 6 spread-out slots to book
for (let k = 0; k < bookingDefs.length && k * 3 < slotRows.length; k++) slotRows[k * 3]._book = true;

for (const s of slotRows) {
  const willBook = s._book && bookingIdx < bookingDefs.length;
  await prisma.appointmentSlot.create({ data: { id: s.id, serviceName: s.serviceName, startTime: s.startTime, durationMinutes: s.durationMinutes, price: s.price, isBooked: willBook, organizationId: ORG } });
  created.slots.push(s.id);
  if (willBook) {
    const def = bookingDefs[bookingIdx++];
    const contact = created.contacts[Math.floor(Math.random() * created.contacts.length)];
    const bId = randomUUID();
    await prisma.booking.create({
      data: {
        id: bId, slotId: s.id, serviceName: s.serviceName, startTime: s.startTime, price: s.price,
        bookingForName: def.patient, status: def.status, contactId: contact, organizationId: ORG,
      },
    });
    created.bookings.push(bId);
  }
}
// ensure we created at least a few bookings even if random was stingy
console.log(`✓ slots: ${created.slots.length}, bookings: ${created.bookings.length}, contacts: ${created.contacts.length}`);

fs.writeFileSync(IDS_FILE, JSON.stringify({ org: ORG, prevOrg, ...created }, null, 2));
console.log("✓ recorded ids →", IDS_FILE);
await prisma.$disconnect();
await pool.end();
