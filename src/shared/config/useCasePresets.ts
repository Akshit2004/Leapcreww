/**
 * useCasePresets.ts — Use-case agent registry + appointment terminology presets.
 *
 * Single source of truth shared by the WhatsApp appointment bot (server) and
 * the Use Cases console (client) so labels never drift between the two.
 */

export type UseCaseId = "NONE" | "MARKETPLACE" | "APPOINTMENT";

export const USE_CASE_IDS: UseCaseId[] = ["NONE", "MARKETPLACE", "APPOINTMENT"];

export function isValidUseCase(value: string | null | undefined): value is UseCaseId {
  return !!value && USE_CASE_IDS.includes(value as UseCaseId);
}

export type AppointmentPresetId = "HEALTHCARE" | "HOSPITALITY" | "EDUCATION" | "CORPORATE";

export interface AppointmentPreset {
  id: AppointmentPresetId;
  label: string;       // industry display name
  slotLabel: string;   // what a slot's serviceName represents
  feeLabel: string;    // what the price represents
  clientLabel: string; // what the booking contact represents
  bookingNoun: string; // the word the bot uses for a confirmed booking
}

export const APPOINTMENT_PRESETS: Record<AppointmentPresetId, AppointmentPreset> = {
  HEALTHCARE: {
    id: "HEALTHCARE",
    label: "Healthcare",
    slotLabel: "Doctor Name",
    feeLabel: "Consultation Fee",
    clientLabel: "Patient Name",
    bookingNoun: "appointment",
  },
  HOSPITALITY: {
    id: "HOSPITALITY",
    label: "Hospitality",
    slotLabel: "Table / Room No",
    feeLabel: "Reservation Deposit",
    clientLabel: "Guest Name",
    bookingNoun: "reservation",
  },
  EDUCATION: {
    id: "EDUCATION",
    label: "Education",
    slotLabel: "Interviewer Name",
    feeLabel: "Booking Cost",
    clientLabel: "Student Name",
    bookingNoun: "session",
  },
  CORPORATE: {
    id: "CORPORATE",
    label: "Corporate",
    slotLabel: "Agent / Service Desk",
    feeLabel: "Consultation Cost",
    clientLabel: "Client Name",
    bookingNoun: "appointment",
  },
};

export const APPOINTMENT_PRESET_IDS = Object.keys(APPOINTMENT_PRESETS) as AppointmentPresetId[];

export function isValidPreset(value: string | null | undefined): value is AppointmentPresetId {
  return !!value && value in APPOINTMENT_PRESETS;
}

/** Resolve a preset by id, falling back to Healthcare for unknown values. */
export function getPreset(id: string | null | undefined): AppointmentPreset {
  return isValidPreset(id) ? APPOINTMENT_PRESETS[id] : APPOINTMENT_PRESETS.HEALTHCARE;
}
