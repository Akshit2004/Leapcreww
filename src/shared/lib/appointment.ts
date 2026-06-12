/**
 * appointment.ts — WhatsApp Appointment Booking sub-agent.
 *
 * Mirrors the marketplace bot contract: handleAppointmentMessage() returns true
 * when it owns the inbound message, false to let the autoresponder take over.
 *
 * Flow:
 *   menu → Book / My Bookings
 *   Book → pick service/provider → pick day & time (two-step browse)
 *   pick slot → capture "who is this for?" (reused one-tap on later bookings)
 *           → instant confirmation (no online payment; fee shown as pay-at-venue)
 *   My Bookings → pick a booking → Reschedule (same service, new time) / Cancel
 *
 * State machine lives in contact.attributes.appt_state; the saved booking name
 * lives in contact.attributes.appt_name for one-tap reuse. Terminology
 * (doctor vs. table vs. interviewer …) comes from the org's appointmentPreset.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { sendWhatsAppMessage, formatPhoneNumber } from "./whatsapp";
import { logBotMessage, formatPrice } from "./botMessaging";
import { formatSlotDateTime, formatSlotDayLong, formatSlotTime } from "./datetime";
import { getPreset, type AppointmentPreset } from "@/shared/config/useCasePresets";

// Conversation states held in contact.attributes.appt_state.
type ApptState =
  | "MENU"
  | "AWAITING_SERVICE"
  | "AWAITING_SLOT"
  | "AWAITING_NAME"
  | "AWAITING_NAME_CONFIRM"
  | "MANAGING"
  | "RESCHEDULE_SLOT";

const NAV_WORDS = new Set(["menu", "hi", "hello", "start", "help", "back", "cancel", "main menu"]);

// ─── attribute helpers ───────────────────────────────────────────────────────

type Attrs = Record<string, unknown>;

async function getAttrs(contactId: string): Promise<Attrs> {
  const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { attributes: true } });
  return ((contact?.attributes as Attrs) || {}) as Attrs;
}

async function saveAttrs(contactId: string, attrs: Attrs) {
  await prisma.contact.update({
    where: { id: contactId },
    data: { attributes: attrs as Prisma.InputJsonValue },
  });
}

// ─── outbound helpers ────────────────────────────────────────────────────────

async function reply(
  phone: string,
  contactId: string,
  orgId: string,
  text: string,
  buttons?: { type: "reply"; reply: { id: string; title: string } }[],
) {
  const result = await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text, buttons }, orgId);
  await logBotMessage(contactId, orgId, text, result.data?.messages?.[0]?.id);
  return result;
}

async function getOrgPreset(orgId: string): Promise<AppointmentPreset> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { appointmentPreset: true },
  });
  return getPreset(org?.appointmentPreset);
}

function feeLabel(price: number, preset: AppointmentPreset): string {
  return price > 0 ? `${preset.feeLabel}: ${formatPrice(price)}` : "Free";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Main Menu ────────────────────────────────────────────────────────────────

export async function sendAppointmentMenu(phone: string, contactId: string, orgId: string) {
  const preset = await getOrgPreset(orgId);

  // Reset transient browse/management state so a "1"/"2" reply maps to the menu,
  // not a stale slot/service/booking offering. The saved booking name is kept.
  const attrs = await getAttrs(contactId);
  for (const k of ["appt_services", "appt_slots", "appt_service", "appt_pending_slot", "appt_bookings", "appt_active_booking", "appt_reschedule_booking"]) {
    delete attrs[k];
  }
  attrs.appt_state = "MENU" satisfies ApptState;
  await saveAttrs(contactId, attrs);

  const text = `📅 *${capitalize(preset.bookingNoun)} Booking*

What would you like to do?

1️⃣ *Book* — see available ${preset.bookingNoun} times
2️⃣ *My Bookings* — view or change your ${preset.bookingNoun}s

Tap a button below or reply with a number.`;

  await reply(phone, contactId, orgId, text, [
    { type: "reply", reply: { id: "appt_book", title: "📅 Book" } },
    { type: "reply", reply: { id: "appt_bookings", title: "📋 My Bookings" } },
  ]);
}

// ─── Step 1: choose a service / provider ──────────────────────────────────────

function nowInstant(): Date {
  return new Date();
}

async function distinctAvailableServices(orgId: string): Promise<string[]> {
  const slots = await prisma.appointmentSlot.findMany({
    where: { organizationId: orgId, isBooked: false, startTime: { gte: nowInstant() } },
    orderBy: { startTime: "asc" },
    select: { serviceName: true },
  });
  return [...new Set(slots.map((s) => s.serviceName))];
}

export async function sendServiceChoices(phone: string, contactId: string, orgId: string) {
  const preset = await getOrgPreset(orgId);
  const services = await distinctAvailableServices(orgId);

  if (services.length === 0) {
    await reply(phone, contactId, orgId, `Sorry, there are no open ${preset.bookingNoun} slots right now. Please check back later! 😊`);
    return;
  }

  // One provider → skip straight to its slots; nothing to choose.
  if (services.length === 1) {
    await sendSlotsForService(phone, contactId, orgId, services[0], "AWAITING_SLOT");
    return;
  }

  const attrs = await getAttrs(contactId);
  attrs.appt_services = services;
  attrs.appt_state = "AWAITING_SERVICE" satisfies ApptState;
  delete attrs.appt_reschedule_booking; // a fresh Book flow is not a reschedule
  await saveAttrs(contactId, attrs);

  // Interactive list (≤10 rows); numbered text fallback otherwise / on failure.
  if (services.length <= 10) {
    const result = await sendWhatsAppMessage(
      {
        to: formatPhoneNumber(phone),
        list: {
          buttonText: `Choose ${preset.slotLabel.split(" ")[0]}`.substring(0, 20),
          title: `Choose a ${preset.bookingNoun}`.substring(0, 24),
          description: `Pick the ${preset.slotLabel.toLowerCase()} you'd like to book with.`,
          sections: [
            {
              title: preset.slotLabel.substring(0, 24),
              rows: services.map((name, i) => ({
                id: `appt_svc_${i}`,
                title: name.substring(0, 24),
              })),
            },
          ],
        },
      },
      orgId,
    );
    if (result.ok) {
      await logBotMessage(contactId, orgId, `Sent ${preset.slotLabel} choices.`, result.data?.messages?.[0]?.id);
      return;
    }
  }

  let text = `📅 *Choose a ${preset.slotLabel}*\n\n`;
  services.forEach((name, i) => {
    text += `*${i + 1}.* ${name}\n`;
  });
  text += `\nReply with the *number* of your choice.`;
  await reply(phone, contactId, orgId, text);
}

// ─── Step 2: choose a day & time for that service ─────────────────────────────

async function sendSlotsForService(
  phone: string,
  contactId: string,
  orgId: string,
  serviceName: string,
  state: Extract<ApptState, "AWAITING_SLOT" | "RESCHEDULE_SLOT">,
) {
  const preset = await getOrgPreset(orgId);
  const slots = await prisma.appointmentSlot.findMany({
    where: { organizationId: orgId, isBooked: false, serviceName, startTime: { gte: nowInstant() } },
    orderBy: { startTime: "asc" },
    take: 10, // WhatsApp interactive lists allow at most 10 rows total
  });

  if (slots.length === 0) {
    await reply(phone, contactId, orgId, `No open times left for *${serviceName}* right now. Reply *BOOK* to pick another option. 😊`);
    return;
  }

  const attrs = await getAttrs(contactId);
  attrs.appt_slots = slots.map((s) => s.id);
  attrs.appt_service = serviceName;
  attrs.appt_state = state;
  await saveAttrs(contactId, attrs);

  // Group times into per-day sections for the interactive list.
  const sectionsMap: Record<string, typeof slots> = {};
  for (const s of slots) {
    const day = formatSlotDayLong(s.startTime);
    (sectionsMap[day] ||= []).push(s);
  }
  const sections = Object.keys(sectionsMap)
    .slice(0, 10)
    .map((day) => ({
      title: day.substring(0, 24),
      rows: sectionsMap[day].map((s) => ({
        id: `appt_slot_${s.id}`,
        title: formatSlotTime(s.startTime).substring(0, 24),
        description: `${s.durationMinutes} min · ${feeLabel(s.price, preset)}`.substring(0, 72),
      })),
    }));

  const verb = state === "RESCHEDULE_SLOT" ? "Reschedule" : "Book";
  const result = await sendWhatsAppMessage(
    {
      to: formatPhoneNumber(phone),
      list: {
        buttonText: "View Times",
        title: `${verb}: ${serviceName}`.substring(0, 24),
        description: `Pick a time for your ${preset.bookingNoun} with ${serviceName}.`.substring(0, 72),
        sections,
      },
    },
    orgId,
  );
  if (result.ok) {
    await logBotMessage(contactId, orgId, `Sent available times for ${serviceName}.`, result.data?.messages?.[0]?.id);
    return;
  }

  // Numbered text fallback.
  let text = `📅 *${verb}: ${serviceName}*\n\n`;
  slots.forEach((s, i) => {
    text += `*${i + 1}.* ${formatSlotDateTime(s.startTime)} · ${feeLabel(s.price, preset)}\n`;
  });
  text += `\nReply with the *number* of the time you'd like.`;
  await reply(phone, contactId, orgId, text);
}

// ─── Slot selection → name capture ────────────────────────────────────────────

/** Resolve a slot id from an interactive list id or a numbered reply. */
function resolveSlotId(text: string, attrs: Attrs, activeStates: ApptState[]): string | null {
  const lower = text.trim().toLowerCase();
  const listMatch = lower.match(/^appt_slot_(.+)$/);
  if (listMatch) return listMatch[1];
  if (/^\d+$/.test(lower) && activeStates.includes(attrs.appt_state as ApptState)) {
    const idx = parseInt(lower, 10) - 1;
    const offered = (attrs.appt_slots as string[] | undefined) || [];
    if (idx >= 0 && idx < offered.length) return offered[idx];
  }
  return null;
}

async function handleSlotSelected(phone: string, contactId: string, orgId: string, slotId: string) {
  const preset = await getOrgPreset(orgId);
  const slot = await prisma.appointmentSlot.findFirst({ where: { id: slotId, organizationId: orgId } });
  if (!slot || slot.isBooked) {
    await reply(phone, contactId, orgId, "That time was just taken. Reply *BOOK* to see what's still available.");
    return;
  }

  const attrs = await getAttrs(contactId);
  attrs.appt_pending_slot = slotId;
  const savedName = typeof attrs.appt_name === "string" ? attrs.appt_name : "";

  if (savedName) {
    attrs.appt_state = "AWAITING_NAME_CONFIRM" satisfies ApptState;
    await saveAttrs(contactId, attrs);
    const text = `Booking *${slot.serviceName}* on ${formatSlotDateTime(slot.startTime)}.

Who is this ${preset.bookingNoun} for?`;
    await reply(phone, contactId, orgId, text, [
      { type: "reply", reply: { id: "appt_name_yes", title: `✅ ${savedName}`.substring(0, 20) } },
      { type: "reply", reply: { id: "appt_name_new", title: "✏️ Someone else" } },
    ]);
    return;
  }

  attrs.appt_state = "AWAITING_NAME" satisfies ApptState;
  await saveAttrs(contactId, attrs);
  await reply(phone, contactId, orgId, `Who is this ${preset.bookingNoun} for? Please reply with the ${preset.clientLabel.toLowerCase()}.`);
}

async function confirmBookingForName(phone: string, contactId: string, orgId: string, name: string) {
  const preset = await getOrgPreset(orgId);
  const attrs = await getAttrs(contactId);
  const slotId = typeof attrs.appt_pending_slot === "string" ? attrs.appt_pending_slot : "";
  if (!slotId) {
    await sendAppointmentMenu(phone, contactId, orgId);
    return;
  }

  // Atomically claim the slot — only the first booker wins.
  const claimed = await prisma.appointmentSlot.updateMany({
    where: { id: slotId, organizationId: orgId, isBooked: false },
    data: { isBooked: true },
  });
  if (claimed.count === 0) {
    await reply(phone, contactId, orgId, "Sorry, that time was just taken. Reply *BOOK* to see what's still available.");
    await sendAppointmentMenu(phone, contactId, orgId);
    return;
  }

  const slot = await prisma.appointmentSlot.findUnique({ where: { id: slotId } });
  if (!slot) return;

  await prisma.booking.create({
    data: {
      slotId: slot.id,
      serviceName: slot.serviceName,
      startTime: slot.startTime,
      price: slot.price,
      bookingForName: name,
      status: "booked",
      contactId,
      organizationId: orgId,
    },
  });

  // Remember the name for one-tap reuse; clear transient browse state.
  attrs.appt_name = name;
  attrs.appt_state = "MENU" satisfies ApptState;
  delete attrs.appt_pending_slot;
  delete attrs.appt_slots;
  delete attrs.appt_service;
  await saveAttrs(contactId, attrs);

  const feeNote = slot.price > 0
    ? `💳 ${preset.feeLabel}: *${formatPrice(slot.price)}* — pay at the venue.`
    : `💳 No payment required.`;
  const text = `✅ *${capitalize(preset.bookingNoun)} Confirmed!* 🎉

*${slot.serviceName}*
👤 ${preset.clientLabel}: ${name}
🗓️ ${formatSlotDateTime(slot.startTime)}
${feeNote}

Reply *MY BOOKINGS* anytime to view, reschedule, or cancel.`;
  await reply(phone, contactId, orgId, text);
  await logSystemEvent(orgId, `${capitalize(preset.bookingNoun)} booked: ${slot.serviceName} for ${name}`);
}

// ─── My bookings & management ─────────────────────────────────────────────────

export async function sendMyBookings(phone: string, contactId: string, orgId: string) {
  const preset = await getOrgPreset(orgId);
  const bookings = await prisma.booking.findMany({
    where: { contactId, organizationId: orgId, status: "booked", startTime: { gte: nowInstant() } },
    orderBy: { startTime: "asc" },
    take: 10,
  });

  if (bookings.length === 0) {
    await reply(phone, contactId, orgId, `You don't have any upcoming ${preset.bookingNoun}s. Reply *BOOK* to schedule one! 😊`);
    return;
  }

  const attrs = await getAttrs(contactId);
  attrs.appt_bookings = bookings.map((b) => b.id);
  attrs.appt_state = "MANAGING" satisfies ApptState;
  delete attrs.appt_active_booking;
  await saveAttrs(contactId, attrs);

  const result = await sendWhatsAppMessage(
    {
      to: formatPhoneNumber(phone),
      list: {
        buttonText: "View Bookings",
        title: `Your ${preset.bookingNoun}s`.substring(0, 24),
        description: "Tap a booking to reschedule or cancel it.",
        sections: [
          {
            title: "Upcoming".substring(0, 24),
            rows: bookings.map((b) => ({
              id: `appt_bk_${b.id}`,
              title: b.serviceName.substring(0, 24),
              description: `${formatSlotDateTime(b.startTime)} · ${b.bookingForName}`.substring(0, 72),
            })),
          },
        ],
      },
    },
    orgId,
  );
  if (result.ok) {
    await logBotMessage(contactId, orgId, "Sent upcoming bookings.", result.data?.messages?.[0]?.id);
    return;
  }

  let text = `📋 *Your ${capitalize(preset.bookingNoun)}s*\n\n`;
  bookings.forEach((b, i) => {
    text += `*${i + 1}.* ${b.serviceName}\n   ${formatSlotDateTime(b.startTime)} · ${b.bookingForName}\n\n`;
  });
  text += `Reply with the *number* of the ${preset.bookingNoun} to manage it.`;
  await reply(phone, contactId, orgId, text);
}

function resolveBookingId(text: string, attrs: Attrs): string | null {
  const lower = text.trim().toLowerCase();
  const listMatch = lower.match(/^appt_bk_(.+)$/);
  if (listMatch) return listMatch[1];
  if (/^\d+$/.test(lower) && attrs.appt_state === "MANAGING") {
    const idx = parseInt(lower, 10) - 1;
    const offered = (attrs.appt_bookings as string[] | undefined) || [];
    if (idx >= 0 && idx < offered.length) return offered[idx];
  }
  return null;
}

async function manageBooking(phone: string, contactId: string, orgId: string, bookingId: string) {
  const preset = await getOrgPreset(orgId);
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, contactId, organizationId: orgId } });
  if (!booking || booking.status !== "booked") {
    await reply(phone, contactId, orgId, "That booking isn't available anymore. Reply *MY BOOKINGS* to refresh.");
    return;
  }

  const attrs = await getAttrs(contactId);
  attrs.appt_active_booking = bookingId;
  attrs.appt_state = "MANAGING" satisfies ApptState;
  await saveAttrs(contactId, attrs);

  const text = `📋 *${booking.serviceName}*
👤 ${preset.clientLabel}: ${booking.bookingForName}
🗓️ ${formatSlotDateTime(booking.startTime)}
💳 ${feeLabel(booking.price, preset)}

What would you like to do?`;
  await reply(phone, contactId, orgId, text, [
    { type: "reply", reply: { id: "appt_resched", title: "🔁 Reschedule" } },
    { type: "reply", reply: { id: "appt_cancel", title: "❌ Cancel" } },
  ]);
}

async function cancelActiveBooking(phone: string, contactId: string, orgId: string) {
  const preset = await getOrgPreset(orgId);
  const attrs = await getAttrs(contactId);
  const bookingId = typeof attrs.appt_active_booking === "string" ? attrs.appt_active_booking : "";
  const booking = bookingId
    ? await prisma.booking.findFirst({ where: { id: bookingId, contactId, organizationId: orgId } })
    : null;

  if (!booking || booking.status !== "booked") {
    await reply(phone, contactId, orgId, "That booking isn't active anymore. Reply *MY BOOKINGS* to refresh.");
    await sendAppointmentMenu(phone, contactId, orgId);
    return;
  }

  await prisma.booking.update({ where: { id: booking.id }, data: { status: "cancelled" } });
  if (booking.slotId) {
    await prisma.appointmentSlot.updateMany({ where: { id: booking.slotId }, data: { isBooked: false } });
  }

  attrs.appt_state = "MENU" satisfies ApptState;
  delete attrs.appt_active_booking;
  await saveAttrs(contactId, attrs);

  await reply(phone, contactId, orgId, `✅ Your ${preset.bookingNoun} for *${booking.serviceName}* on ${formatSlotDateTime(booking.startTime)} has been cancelled. Reply *BOOK* to schedule a new one.`);
  await logSystemEvent(orgId, `${capitalize(preset.bookingNoun)} cancelled by customer: ${booking.serviceName}`);
}

async function startReschedule(phone: string, contactId: string, orgId: string) {
  const attrs = await getAttrs(contactId);
  const bookingId = typeof attrs.appt_active_booking === "string" ? attrs.appt_active_booking : "";
  const booking = bookingId
    ? await prisma.booking.findFirst({ where: { id: bookingId, contactId, organizationId: orgId } })
    : null;

  if (!booking || booking.status !== "booked") {
    await reply(phone, contactId, orgId, "That booking isn't active anymore. Reply *MY BOOKINGS* to refresh.");
    await sendAppointmentMenu(phone, contactId, orgId);
    return;
  }

  attrs.appt_reschedule_booking = booking.id;
  await saveAttrs(contactId, attrs);
  // Reschedule keeps the same service; only the time changes.
  await sendSlotsForService(phone, contactId, orgId, booking.serviceName, "RESCHEDULE_SLOT");
}

async function completeReschedule(phone: string, contactId: string, orgId: string, newSlotId: string) {
  const preset = await getOrgPreset(orgId);
  const attrs = await getAttrs(contactId);
  const bookingId = typeof attrs.appt_reschedule_booking === "string" ? attrs.appt_reschedule_booking : "";
  const booking = bookingId
    ? await prisma.booking.findFirst({ where: { id: bookingId, contactId, organizationId: orgId } })
    : null;

  if (!booking || booking.status !== "booked") {
    await reply(phone, contactId, orgId, "That booking isn't active anymore. Reply *MY BOOKINGS* to refresh.");
    await sendAppointmentMenu(phone, contactId, orgId);
    return;
  }

  // Claim the new time atomically before releasing the old one.
  const claimed = await prisma.appointmentSlot.updateMany({
    where: { id: newSlotId, organizationId: orgId, isBooked: false },
    data: { isBooked: true },
  });
  if (claimed.count === 0) {
    await reply(phone, contactId, orgId, "Sorry, that time was just taken. Reply *MY BOOKINGS* to try a different time.");
    return;
  }

  const newSlot = await prisma.appointmentSlot.findUnique({ where: { id: newSlotId } });
  if (!newSlot) return;

  // Free the old slot and repoint the booking at the new time.
  if (booking.slotId && booking.slotId !== newSlotId) {
    await prisma.appointmentSlot.updateMany({ where: { id: booking.slotId }, data: { isBooked: false } });
  }
  await prisma.booking.update({
    where: { id: booking.id },
    data: { slotId: newSlot.id, serviceName: newSlot.serviceName, startTime: newSlot.startTime, price: newSlot.price },
  });

  attrs.appt_state = "MENU" satisfies ApptState;
  delete attrs.appt_reschedule_booking;
  delete attrs.appt_active_booking;
  delete attrs.appt_slots;
  delete attrs.appt_service;
  await saveAttrs(contactId, attrs);

  await reply(phone, contactId, orgId, `🔁 *${capitalize(preset.bookingNoun)} Rescheduled!* 🎉

*${newSlot.serviceName}*
🗓️ ${formatSlotDateTime(newSlot.startTime)}

Reply *MY BOOKINGS* anytime to review.`);
  await logSystemEvent(orgId, `${capitalize(preset.bookingNoun)} rescheduled: ${newSlot.serviceName}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function logSystemEvent(orgId: string, message: string) {
  await prisma.systemLog.create({
    data: { type: "chat", message, organizationId: orgId },
  });
}

// ─── Router ──────────────────────────────────────────────────────────────────

export async function handleAppointmentMessage(
  text: string,
  phone: string,
  contactId: string,
  orgId: string,
): Promise<boolean> {
  const lower = text.trim().toLowerCase();
  const attrs = await getAttrs(contactId);
  const state = attrs.appt_state as ApptState | undefined;

  // 1. Slot selection (interactive id or numbered reply while browsing/rescheduling).
  const slotId = resolveSlotId(text, attrs, ["AWAITING_SLOT", "RESCHEDULE_SLOT"]);
  if (slotId) {
    if (state === "RESCHEDULE_SLOT") {
      await completeReschedule(phone, contactId, orgId, slotId);
    } else {
      await handleSlotSelected(phone, contactId, orgId, slotId);
    }
    return true;
  }

  // 2. Service / provider selection.
  const svcMatch = lower.match(/^appt_svc_(\d+)$/);
  if (svcMatch || (/^\d+$/.test(lower) && state === "AWAITING_SERVICE")) {
    const idx = svcMatch ? parseInt(svcMatch[1], 10) : parseInt(lower, 10) - 1;
    const services = (attrs.appt_services as string[] | undefined) || [];
    if (idx >= 0 && idx < services.length) {
      await sendSlotsForService(phone, contactId, orgId, services[idx], "AWAITING_SLOT");
      return true;
    }
  }

  // 3. Booking selection (manage an existing booking).
  const bookingId = resolveBookingId(text, attrs);
  if (bookingId) {
    await manageBooking(phone, contactId, orgId, bookingId);
    return true;
  }

  // 4. Name confirmation buttons.
  if (lower === "appt_name_yes") {
    const savedName = typeof attrs.appt_name === "string" ? attrs.appt_name : "";
    if (savedName) {
      await confirmBookingForName(phone, contactId, orgId, savedName);
      return true;
    }
  }
  if (lower === "appt_name_new") {
    const preset = await getOrgPreset(orgId);
    attrs.appt_state = "AWAITING_NAME" satisfies ApptState;
    await saveAttrs(contactId, attrs);
    await reply(phone, contactId, orgId, `Who is this ${preset.bookingNoun} for? Please reply with the ${preset.clientLabel.toLowerCase()}.`);
    return true;
  }

  // 5. Free-text name capture (only while we're actually waiting for a name and
  //    the message isn't a navigation keyword).
  if ((state === "AWAITING_NAME" || state === "AWAITING_NAME_CONFIRM") && !NAV_WORDS.has(lower) && text.trim().length > 0) {
    await confirmBookingForName(phone, contactId, orgId, text.trim().slice(0, 80));
    return true;
  }

  // 6. Manage-booking actions.
  if (lower === "appt_resched") {
    await startReschedule(phone, contactId, orgId);
    return true;
  }
  if (lower === "appt_cancel") {
    await cancelActiveBooking(phone, contactId, orgId);
    return true;
  }

  // 7. Book.
  if (lower === "appt_book" || (lower === "1" && (state === "MENU" || state === undefined)) || ["book", "slots", "slot", "booking"].includes(lower)) {
    await sendServiceChoices(phone, contactId, orgId);
    return true;
  }

  // 8. My Bookings.
  if (lower === "appt_bookings" || (lower === "2" && (state === "MENU" || state === undefined)) || ["bookings", "my bookings", "appointments"].includes(lower)) {
    await sendMyBookings(phone, contactId, orgId);
    return true;
  }

  // 9. Menu / greetings / nav.
  if (NAV_WORDS.has(lower)) {
    await sendAppointmentMenu(phone, contactId, orgId);
    return true;
  }

  return false;
}
