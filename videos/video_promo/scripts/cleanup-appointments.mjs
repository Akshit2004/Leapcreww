// Reverts everything seed-appointments.mjs created: deletes seeded bookings,
// slots, and patient contacts by id, and restores the org's prior use-case settings.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const IDS_FILE = path.resolve(__dirname, "seed-appt-ids.json");
if (!fs.existsSync(IDS_FILE)) { console.error("No seed-appt-ids.json — nothing to clean up."); process.exit(1); }
const { org, prevOrg, slots = [], bookings = [], contacts = [] } = JSON.parse(fs.readFileSync(IDS_FILE, "utf8"));

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const b = await prisma.booking.deleteMany({ where: { organizationId: org, id: { in: bookings } } });
const s = await prisma.appointmentSlot.deleteMany({ where: { organizationId: org, id: { in: slots } } });
const c = await prisma.contact.deleteMany({ where: { organizationId: org, id: { in: contacts } } });
if (prevOrg) {
  await prisma.organization.update({ where: { id: org }, data: { activeUseCase: prevOrg.activeUseCase, appointmentPreset: prevOrg.appointmentPreset } });
}
console.log(`✓ deleted bookings=${b.count} slots=${s.count} contacts=${c.count}; org reverted to`, prevOrg);
fs.renameSync(IDS_FILE, IDS_FILE + ".done");
await prisma.$disconnect();
await pool.end();
