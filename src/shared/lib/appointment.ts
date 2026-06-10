/**
 * appointment.ts — WhatsApp Appointment Booking sub-agent.
 *
 * Mirrors the marketplace bot contract: handleAppointmentMessage() returns true
 * when it owns the inbound message, false to let the autoresponder take over.
 *
 * Flow:
 *   menu → Book Slot / My Bookings
 *   Book Slot → interactive list of available future slots (numbered fallback)
 *   select slot → free: confirm instantly · paid: 30-min soft-hold + Razorpay link
 *   CONFIRM/Paid → re-check Razorpay payment-link status, lock booking if paid
 *
 * Terminology (doctor vs. table vs. interviewer …) comes from the org's
 * appointmentPreset via shared/config/useCasePresets.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { sendWhatsAppMessage, formatPhoneNumber } from "./whatsapp";
import { getRazorpayInstance, createRazorpayPaymentLink } from "./razorpay";
import { formatPrice, logBotMessage, CURRENCY_SYMBOL } from "./botMessaging";
import { getPreset, type AppointmentPreset } from "@/shared/config/useCasePresets";

const HOLD_MINUTES = 30;

/** Soft-hold predicate: a paid slot is held while its hold has not expired. */
function activeHoldFilter() {
  return { OR: [{ holdExpiresAt: null }, { holdExpiresAt: { lt: new Date() } }] };
}

async function getOrgPreset(orgId: string): Promise<AppointmentPreset> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { appointmentPreset: true },
  });
  return getPreset(org?.appointmentPreset);
}

function formatSlotTime(start: Date): string {
  return start.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function slotPriceLabel(price: number, preset: AppointmentPreset): string {
  return price > 0 ? `${preset.feeLabel}: ${formatPrice(price)}` : "Free";
}

// ─── Main Menu ────────────────────────────────────────────────────────────────

export async function sendAppointmentMenu(phone: string, contactId: string, orgId: string) {
  const preset = await getOrgPreset(orgId);

  // Clear any stale slot offering so a menu "1"/"2" reply isn't mistaken for a
  // slot selection from an earlier browse, and mark the contact as being at the
  // menu so numbered replies route to menu options, not stale slot ids.
  const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { attributes: true } });
  const attrs = (contact?.attributes as Record<string, unknown>) || {};
  delete attrs.appt_offered;
  attrs.appt_state = "MENU";
  await prisma.contact.update({ where: { id: contactId }, data: { attributes: attrs as Prisma.InputJsonValue } });

  const text = `📅 *Appointment Booking*

What would you like to do?

1️⃣ *Book Slot* — see available ${preset.bookingNoun} times
2️⃣ *My Bookings* — view your confirmed ${preset.bookingNoun}s

Tap a button below or reply with a number.`;

  const result = await sendWhatsAppMessage(
    {
      to: formatPhoneNumber(phone),
      text,
      buttons: [
        { type: "reply", reply: { id: "appt_book", title: "📅 Book Slot" } },
        { type: "reply", reply: { id: "appt_bookings", title: "📋 My Bookings" } },
      ],
    },
    orgId
  );

  await logBotMessage(contactId, orgId, text, result.data?.messages?.[0]?.id);
}

// ─── Browse available slots ─────────────────────────────────────────────────

async function getAvailableSlots(orgId: string) {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  return prisma.appointmentSlot.findMany({
    where: {
      organizationId: orgId,
      isBooked: false,
      startTime: { gte: todayStart },
      ...activeHoldFilter(),
    },
    orderBy: { startTime: "asc" },
    take: 20,
  });
}

export async function sendAvailableSlots(phone: string, contactId: string, orgId: string) {
  const preset = await getOrgPreset(orgId);
  const slots = await getAvailableSlots(orgId);

  if (slots.length === 0) {
    const text = `Sorry, there are no open ${preset.bookingNoun} slots right now. Please check back later! 😊`;
    const result = await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text }, orgId);
    await logBotMessage(contactId, orgId, text, result.data?.messages?.[0]?.id);
    return;
  }

  // Persist the offered ordering so a numbered reply ("2") resolves to a slot id.
  const offered = slots.map((s) => s.id);
  const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { attributes: true } });
  const attrs = (contact?.attributes as Record<string, unknown>) || {};
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      attributes: {
        ...attrs,
        appt_offered: offered,
        appt_state: "AWAITING_SLOT_SELECTION",
      } as Prisma.InputJsonValue,
    },
  });

  // Interactive list (≤10 rows). Group by date into sections; fall back to a
  // numbered text list when there are too many slots or the list send fails.
  if (slots.length <= 10) {
    const sectionsMap: Record<string, typeof slots> = {};
    for (const s of slots) {
      const day = s.startTime.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
      if (!sectionsMap[day]) sectionsMap[day] = [];
      sectionsMap[day].push(s);
    }
    const sections = Object.keys(sectionsMap).slice(0, 10).map((day) => ({
      title: day.substring(0, 24),
      rows: sectionsMap[day].map((s) => ({
        id: `appt_slot_${s.id}`,
        title: s.serviceName.substring(0, 24),
        description: `${formatSlotTime(s.startTime)} · ${slotPriceLabel(s.price, preset)}`.substring(0, 72),
      })),
    }));

    const result = await sendWhatsAppMessage(
      {
        to: formatPhoneNumber(phone),
        list: {
          buttonText: "View Slots",
          title: "Available Slots",
          description: `Pick a ${preset.bookingNoun} slot below. ${preset.slotLabel} and timings are shown for each.`,
          sections,
        },
      },
      orgId
    );

    if (result.ok) {
      await logBotMessage(contactId, orgId, "Sent available appointment slots.", result.data?.messages?.[0]?.id);
      return;
    }
  }

  // Numbered text fallback.
  let text = `📅 *Available Slots*\n\n`;
  slots.forEach((s, i) => {
    text += `*${i + 1}.* ${s.serviceName}\n   ${formatSlotTime(s.startTime)} · ${slotPriceLabel(s.price, preset)}\n\n`;
  });
  text += `Reply with the *number* of the slot you'd like to book.`;
  const result = await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text }, orgId);
  await logBotMessage(contactId, orgId, text, result.data?.messages?.[0]?.id);
}

// ─── Select a slot ───────────────────────────────────────────────────────────

/** Resolve a slot id from an interactive list reply id or a numbered reply. */
async function resolveSelectedSlotId(text: string, contactId: string): Promise<string | null> {
  const lower = text.trim().toLowerCase();
  const listMatch = lower.match(/^appt_slot_(.+)$/);
  if (listMatch) return listMatch[1];

  if (/^\d+$/.test(lower)) {
    const idx = parseInt(lower, 10) - 1;
    const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { attributes: true } });
    const attrs = (contact?.attributes as Record<string, unknown>) || {};
    // Only treat a bare number as a slot pick when the contact is actively
    // choosing a slot. Otherwise "1"/"2" belong to the main menu.
    if (attrs.appt_state !== "AWAITING_SLOT_SELECTION") return null;
    const offered = (attrs.appt_offered as string[] | undefined) || [];
    if (idx >= 0 && idx < offered.length) return offered[idx];
  }
  return null;
}

async function bookSlotInstantly(
  slotId: string,
  phone: string,
  contactId: string,
  orgId: string,
  preset: AppointmentPreset
) {
  // Atomically claim the free slot: only succeeds if still unbooked.
  const claimed = await prisma.appointmentSlot.updateMany({
    where: { id: slotId, organizationId: orgId, isBooked: false },
    data: { isBooked: true, paymentStatus: "free", contactId, holdExpiresAt: null },
  });

  if (claimed.count === 0) {
    const text = "Sorry, that slot was just taken. Reply *BOOK* to see what's still available.";
    const result = await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text }, orgId);
    await logBotMessage(contactId, orgId, text, result.data?.messages?.[0]?.id);
    return;
  }

  const slot = await prisma.appointmentSlot.findUnique({ where: { id: slotId } });
  const text = `✅ *${capitalize(preset.bookingNoun)} Confirmed!* 🎉

*${slot?.serviceName}*
🗓️ ${slot ? formatSlotTime(slot.startTime) : ""}
💳 No payment required — you're all set!

Reply *MY BOOKINGS* anytime to review your ${preset.bookingNoun}s.`;
  const result = await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text }, orgId);
  await logBotMessage(contactId, orgId, text, result.data?.messages?.[0]?.id);

  await logSystemEvent(orgId, `Free ${preset.bookingNoun} booked: ${slot?.serviceName}`);
}

async function reserveAndSendPaymentLink(
  slotId: string,
  phone: string,
  contactId: string,
  contactName: string,
  orgId: string,
  preset: AppointmentPreset
) {
  // Soft-hold the slot: claim it only if currently free or its prior hold lapsed.
  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
  const held = await prisma.appointmentSlot.updateMany({
    where: {
      id: slotId,
      organizationId: orgId,
      isBooked: false,
      ...activeHoldFilter(),
    },
    data: { paymentStatus: "pending", holdExpiresAt, contactId },
  });

  if (held.count === 0) {
    const text = "Sorry, that slot is no longer available. Reply *BOOK* to see open slots.";
    const result = await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text }, orgId);
    await logBotMessage(contactId, orgId, text, result.data?.messages?.[0]?.id);
    return;
  }

  const slot = await prisma.appointmentSlot.findUnique({ where: { id: slotId } });
  if (!slot) return;

  let link: { id: string; short_url: string };
  try {
    link = await createRazorpayPaymentLink(slot.price, `APPT-${slot.id.slice(0, 8)}`, phone, contactName, orgId);
  } catch (err) {
    console.error("[Appointment] Failed to create payment link", err);
    // Release the hold so the slot isn't stranded.
    await prisma.appointmentSlot.updateMany({
      where: { id: slotId },
      data: { paymentStatus: "none", holdExpiresAt: null, contactId: null },
    });
    // Surface the failure on the merchant's dashboard so they can diagnose
    // a broken / disconnected Razorpay integration without reading server logs.
    await logIntegrationError(
      orgId,
      `Appointment booking failed: ${(err as Error)?.message || String(err)}`
    );
    const text = "We couldn't generate a payment link right now. Please try again in a moment.";
    const result = await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text }, orgId);
    await logBotMessage(contactId, orgId, text, result.data?.messages?.[0]?.id);
    return;
  }

  await prisma.appointmentSlot.update({
    where: { id: slotId },
    data: { razorpayPaymentLinkId: link.id },
  });

  const text = `🧾 *${capitalize(preset.bookingNoun)} Reservation*

*${slot.serviceName}*
🗓️ ${formatSlotTime(slot.startTime)}
💰 ${preset.feeLabel}: *${formatPrice(slot.price)}*

This slot is held for you for *${HOLD_MINUTES} minutes*.

💳 *Pay to confirm:*
${link.short_url}

After paying, tap *✅ Paid* below to lock your ${preset.bookingNoun}.`;

  const result = await sendWhatsAppMessage(
    {
      to: formatPhoneNumber(phone),
      text,
      buttons: [{ type: "reply", reply: { id: "appt_confirm", title: "✅ Paid" } }],
    },
    orgId
  );
  await logBotMessage(contactId, orgId, text, result.data?.messages?.[0]?.id);
}

// ─── Confirm receipt (manual re-check) ──────────────────────────────────────

async function confirmAppointmentPayment(phone: string, contactId: string, orgId: string, preset: AppointmentPreset) {
  // The most recent slot this contact is holding/has paid for.
  const slot = await prisma.appointmentSlot.findFirst({
    where: { contactId, organizationId: orgId },
    orderBy: { updatedAt: "desc" },
  });

  if (!slot || slot.paymentStatus === "none") {
    const text = "You don't have a pending reservation. Reply *BOOK* to see available slots.";
    const result = await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text }, orgId);
    await logBotMessage(contactId, orgId, text, result.data?.messages?.[0]?.id);
    return;
  }

  if (slot.isBooked && slot.paymentStatus === "paid") {
    await sendBookingConfirmed(phone, contactId, orgId, slot.id, preset);
    return;
  }

  // Re-check the live payment-link status with Razorpay.
  let paid = false;
  let shortUrl = "";
  if (slot.razorpayPaymentLinkId) {
    try {
      const rzp = await getRazorpayInstance(orgId);
      const plink = await (rzp.paymentLink as unknown as Record<string, (id: string) => Promise<{ status?: string; short_url?: string }>>).fetch(slot.razorpayPaymentLinkId);
      paid = plink?.status === "paid";
      shortUrl = plink?.short_url || "";
    } catch (err) {
      console.error("[Appointment] Failed to fetch payment link status", err);
    }
  }

  if (paid) {
    await prisma.appointmentSlot.update({
      where: { id: slot.id },
      data: { isBooked: true, paymentStatus: "paid", holdExpiresAt: null },
    });
    await sendBookingConfirmed(phone, contactId, orgId, slot.id, preset);
    await logSystemEvent(orgId, `Paid ${preset.bookingNoun} confirmed: ${slot.serviceName}`);
    return;
  }

  const linkStr = shortUrl ? `\n\n💳 *Pay here:* ${shortUrl}` : "";
  const text = `⚠️ We haven't received payment for *${slot.serviceName}* yet.${linkStr}\n\nOnce paid, tap *✅ Paid* again.`;
  const result = await sendWhatsAppMessage(
    {
      to: formatPhoneNumber(phone),
      text,
      buttons: shortUrl ? [{ type: "reply", reply: { id: "appt_confirm", title: "✅ Paid" } }] : undefined,
    },
    orgId
  );
  await logBotMessage(contactId, orgId, text, result.data?.messages?.[0]?.id);
}

/** Dispatch the confirmation receipt for a locked booking (used by bot + webhook). */
export async function sendBookingConfirmed(
  phone: string,
  contactId: string,
  orgId: string,
  slotId: string,
  preset?: AppointmentPreset
) {
  const resolved = preset || (await getOrgPreset(orgId));
  const slot = await prisma.appointmentSlot.findUnique({ where: { id: slotId } });
  if (!slot) return;

  const text = `✅ *${capitalize(resolved.bookingNoun)} Confirmed!* 🎉

*${slot.serviceName}*
🗓️ ${formatSlotTime(slot.startTime)}
💳 Paid: *${formatPrice(slot.price)}*

Thank you! Reply *MY BOOKINGS* anytime to review your ${resolved.bookingNoun}s.`;
  const result = await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text }, orgId);
  await logBotMessage(contactId, orgId, text, result.data?.messages?.[0]?.id);
}

// ─── My bookings ─────────────────────────────────────────────────────────────

export async function sendMyBookings(phone: string, contactId: string, orgId: string) {
  const preset = await getOrgPreset(orgId);
  const slots = await prisma.appointmentSlot.findMany({
    where: { contactId, organizationId: orgId, isBooked: true },
    orderBy: { startTime: "asc" },
    take: 10,
  });

  if (slots.length === 0) {
    const text = `You don't have any confirmed ${preset.bookingNoun}s yet. Reply *BOOK* to schedule one! 😊`;
    const result = await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text }, orgId);
    await logBotMessage(contactId, orgId, text, result.data?.messages?.[0]?.id);
    return;
  }

  let text = `📋 *Your ${capitalize(preset.bookingNoun)}s*\n\n`;
  slots.forEach((s) => {
    const fee = s.price > 0 ? `${CURRENCY_SYMBOL}${(s.price / 100).toFixed(2)}` : "Free";
    text += `*${s.serviceName}*\n🗓️ ${formatSlotTime(s.startTime)} · ${fee}\n\n`;
  });
  const result = await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text }, orgId);
  await logBotMessage(contactId, orgId, text, result.data?.messages?.[0]?.id);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function logSystemEvent(orgId: string, message: string) {
  await prisma.systemLog.create({
    data: { timestamp: nowTimeStr(), type: "chat", message, organizationId: orgId },
  });
}

async function logIntegrationError(orgId: string, message: string) {
  await prisma.systemLog.create({
    data: { timestamp: nowTimeStr(), type: "integration", message, organizationId: orgId },
  });
}

// ─── Router ──────────────────────────────────────────────────────────────────

export async function handleAppointmentMessage(
  text: string,
  phone: string,
  contactId: string,
  orgId: string
): Promise<boolean> {
  const lower = text.trim().toLowerCase();
  const preset = await getOrgPreset(orgId);

  // Slot selection (interactive list id or numbered reply) takes priority.
  const slotId = await resolveSelectedSlotId(text, contactId);
  if (slotId) {
    const slot = await prisma.appointmentSlot.findFirst({
      where: { id: slotId, organizationId: orgId },
    });
    if (!slot) {
      const t = "That slot is no longer available. Reply *BOOK* to see open slots.";
      const result = await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text: t }, orgId);
      await logBotMessage(contactId, orgId, t, result.data?.messages?.[0]?.id);
      return true;
    }
    const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { name: true } });
    if (slot.price > 0) {
      await reserveAndSendPaymentLink(slotId, phone, contactId, contact?.name || "Customer", orgId, preset);
    } else {
      await bookSlotInstantly(slotId, phone, contactId, orgId, preset);
    }
    return true;
  }

  if (lower === "appt_book" || lower === "1" || ["book", "slots", "slot", "booking"].includes(lower) || lower.includes("book")) {
    await sendAvailableSlots(phone, contactId, orgId);
    return true;
  }

  if (lower === "appt_bookings" || lower === "2" || ["bookings", "my bookings", "appointments"].includes(lower)) {
    await sendMyBookings(phone, contactId, orgId);
    return true;
  }

  if (lower === "appt_confirm" || lower === "confirm_order" || lower === "confirm" || lower.includes("paid")) {
    await confirmAppointmentPayment(phone, contactId, orgId, preset);
    return true;
  }

  if (["menu", "hi", "hello", "start", "help"].includes(lower) || lower.includes("main menu")) {
    await sendAppointmentMenu(phone, contactId, orgId);
    return true;
  }

  return false;
}
