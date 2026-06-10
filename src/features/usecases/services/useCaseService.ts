/**
 * useCaseService.ts — Business logic for the Use Cases console.
 *
 * Owns the "exactly one active agent" rule: switching activeUseCase keeps the
 * legacy marketplaceBotEnabled flag in sync so older dashboard panels keep
 * working. The marketplace agent requires a connected Razorpay account (catalog
 * checkout); the appointment agent does not — appointment fees are collected
 * offline, so a slot's `price` is purely informational.
 */
import type { Prisma } from "@prisma/client";
import { ApiError } from "@/shared/lib/api";
import { isValidUseCase, isValidPreset, getPreset } from "@/shared/config/useCasePresets";
import { istDateTimeToUtc, formatSlotDateTime } from "@/shared/lib/datetime";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import { logBotMessage, formatPrice } from "@/shared/lib/botMessaging";
import * as repo from "../repositories/useCaseRepo";
import type {
  CreateSlotsInput,
  GenerateSlotsInput,
  SlotInput,
  UpdateBookingInput,
  UseCaseSettingsInput,
} from "../types";

export function listSlots(organizationId: string) {
  return repo.listSlots(organizationId);
}

async function razorpayConnected(organizationId: string): Promise<boolean> {
  const integration = await repo.getRazorpayIntegration(organizationId);
  return integration?.status === "connected";
}

function validateSlot(slot: SlotInput): { serviceName: string; startTime: Date; durationMinutes: number; price: number } {
  const serviceName = (slot.serviceName || "").trim();
  if (!serviceName) throw new ApiError("Each slot needs a name.", 400);

  const startTime = new Date(slot.startTime);
  if (isNaN(startTime.getTime())) throw new ApiError("Each slot needs a valid date/time.", 400);

  const price = Math.round(Number(slot.price));
  if (!Number.isFinite(price) || price < 0) throw new ApiError("Slot fee must be zero or a positive amount.", 400);

  const durationMinutes = slot.durationMinutes && slot.durationMinutes > 0 ? Math.round(slot.durationMinutes) : 30;

  return { serviceName, startTime, durationMinutes, price };
}

export async function createSlots(input: CreateSlotsInput) {
  if (!Array.isArray(input.slots) || input.slots.length === 0) {
    throw new ApiError("Provide at least one slot to create.", 400);
  }

  const validated = input.slots.map(validateSlot);

  await repo.createSlots(
    validated.map((s) => ({
      serviceName: s.serviceName,
      startTime: s.startTime,
      durationMinutes: s.durationMinutes,
      price: s.price,
      organizationId: input.organizationId,
    }))
  );

  return listSlots(input.organizationId);
}

// ─── Recurring schedule generator ────────────────────────────────────────────

const MAX_WEEKS_AHEAD = 8;
const MAX_GENERATED_SLOTS = 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // India has no DST, so a fixed offset is exact.

function parseHHMM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((value || "").trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Expand a weekly recurrence into concrete slots for the next `weeksAhead`
 * weeks. Calendar days are walked in IST (offset-shifted, valid because India
 * has no DST); past times and duplicates are skipped.
 */
export async function generateSlots(input: GenerateSlotsInput) {
  const serviceName = (input.serviceName || "").trim();
  if (!serviceName) throw new ApiError("Choose a service name to generate slots for.", 400);

  const daysOfWeek = Array.from(new Set(input.daysOfWeek || [])).filter((d) => d >= 0 && d <= 6);
  if (daysOfWeek.length === 0) throw new ApiError("Pick at least one day of the week.", 400);

  const ranges = (input.timeRanges || []).map((r) => {
    const start = parseHHMM(r.start);
    const end = parseHHMM(r.end);
    if (start === null || end === null) throw new ApiError("Each time range needs valid HH:MM start and end times.", 400);
    if (end <= start) throw new ApiError("Each time range's end must be after its start.", 400);
    return { start, end };
  });
  if (ranges.length === 0) throw new ApiError("Add at least one daily time range.", 400);

  const durationMinutes = Math.round(Number(input.durationMinutes));
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new ApiError("Slot duration must be a positive number of minutes.", 400);
  }

  const price = Math.round(Number(input.price));
  if (!Number.isFinite(price) || price < 0) throw new ApiError("Fee must be zero or a positive amount.", 400);

  const weeksAhead = Math.min(Math.max(Math.round(Number(input.weeksAhead) || 1), 1), MAX_WEEKS_AHEAD);
  const totalDays = weeksAhead * 7;

  const now = Date.now();
  const istNow = new Date(now + IST_OFFSET_MS); // UTC fields now read as IST wall clock
  const rows: Prisma.AppointmentSlotCreateManyInput[] = [];

  for (let i = 0; i < totalDays && rows.length < MAX_GENERATED_SLOTS; i++) {
    const day = new Date(istNow.getTime() + i * MS_PER_DAY);
    if (!daysOfWeek.includes(day.getUTCDay())) continue;
    const dateStr = `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;

    for (const range of ranges) {
      for (let m = range.start; m + durationMinutes <= range.end; m += durationMinutes) {
        if (rows.length >= MAX_GENERATED_SLOTS) break;
        const startTime = istDateTimeToUtc(dateStr, `${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
        if (startTime.getTime() < now) continue; // skip times already in the past
        rows.push({ serviceName, startTime, durationMinutes, price, organizationId: input.organizationId });
      }
    }
  }

  if (rows.length === 0) {
    throw new ApiError("That schedule produced no upcoming slots. Try a wider date or time range.", 400);
  }

  const result = await repo.createSlots(rows);
  return { created: result.count, slots: await listSlots(input.organizationId) };
}

export async function deleteSlot(id: string, organizationId: string) {
  const result = await repo.deleteSlot(id, organizationId);
  if (result.count === 0) throw new ApiError("Slot not found.", 404);
  return { success: true };
}

// ─── Bookings ──────────────────────────────────────────────────────────────

export function listBookings(organizationId: string) {
  return repo.listBookings(organizationId);
}

const BOOKING_ACTIONS = ["completed", "no_show", "cancelled"] as const;

export async function updateBookingStatus(id: string, input: UpdateBookingInput) {
  if (!BOOKING_ACTIONS.includes(input.status)) {
    throw new ApiError("Invalid booking status.", 400);
  }

  const booking = await repo.findBooking(id, input.organizationId);
  if (!booking) throw new ApiError("Booking not found.", 404);

  await repo.updateBookingStatus(id, input.status);

  // Cancelling frees the slot for other customers and notifies the contact.
  if (input.status === "cancelled") {
    if (booking.slotId) {
      await repo.reopenSlot(booking.slotId).catch(() => {
        /* slot may have been deleted — booking record stands on its own */
      });
    }
    if (booking.contact) {
      await notifyBookingCancelled(input.organizationId, booking.contact, booking.serviceName, booking.startTime, booking.price);
    }
  }

  return listBookings(input.organizationId);
}

async function notifyBookingCancelled(
  orgId: string,
  contact: { id: string; phone: string },
  serviceName: string,
  startTime: Date,
  price: number,
) {
  const preset = getPreset((await repo.getOrganization(orgId))?.appointmentPreset);
  const feeNote = price > 0 ? `\n💳 ${preset.feeLabel}: ${formatPrice(price)} — not charged.` : "";
  const text = `⚠️ *${capitalize(preset.bookingNoun)} Cancelled*

Your ${preset.bookingNoun} for *${serviceName}* on ${formatSlotDateTime(startTime)} has been cancelled by the team.${feeNote}

Reply *BOOK* to schedule a new ${preset.bookingNoun}. 😊`;
  const result = await sendWhatsAppMessage({ to: formatPhoneNumber(contact.phone), text }, orgId);
  await logBotMessage(contact.id, orgId, text, result.data?.messages?.[0]?.id);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function updateSettings(input: UseCaseSettingsInput) {
  const data: Prisma.OrganizationUpdateInput = {};

  if (input.activeUseCase !== undefined) {
    if (!isValidUseCase(input.activeUseCase)) {
      throw new ApiError("Invalid use case.", 400);
    }

    // Marketplace activation keeps its Razorpay precondition (catalog checkout).
    if (input.activeUseCase === "MARKETPLACE" && !(await razorpayConnected(input.organizationId))) {
      throw new ApiError(
        "Connect your Razorpay account in the Integrations tab before enabling the E-Commerce agent.",
        400
      );
    }

    data.activeUseCase = input.activeUseCase;
    // Keep the legacy flag aligned so existing marketplace UI/automation works.
    data.marketplaceBotEnabled = input.activeUseCase === "MARKETPLACE";
  }

  if (input.appointmentPreset !== undefined) {
    if (!isValidPreset(input.appointmentPreset)) {
      throw new ApiError("Invalid appointment preset.", 400);
    }
    data.appointmentPreset = input.appointmentPreset;
  }

  if (Object.keys(data).length === 0) {
    throw new ApiError("Nothing to update.", 400);
  }

  return repo.updateUseCaseSettings(input.organizationId, data);
}
