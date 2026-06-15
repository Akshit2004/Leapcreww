/** usecases feature DTOs. */
import type { UseCaseId, AppointmentPresetId } from "@/shared/config/useCasePresets";

export interface SlotInput {
  serviceName: string;
  startTime: string;      // ISO 8601 (absolute UTC instant)
  durationMinutes?: number;
  price: number;          // paise; informational fee shown to the customer (0 = free)
}

export interface CreateSlotsInput {
  organizationId: string;
  slots: SlotInput[];
}

/**
 * Recurring-schedule generator input. For each chosen weekday within the next
 * `weeksAhead` weeks, slots of `durationMinutes` are laid down across every
 * `timeRange` (IST wall-clock "HH:MM").
 */
export interface GenerateSlotsInput {
  organizationId: string;
  serviceName: string;
  daysOfWeek: number[];                              // 0=Sun .. 6=Sat (IST)
  timeRanges: { start: string; end: string }[];      // "HH:MM" IST
  durationMinutes: number;
  price: number;                                     // paise; informational
  weeksAhead: number;                                // 1..8
}

export type BookingStatusAction = "completed" | "no_show" | "cancelled";

export interface UpdateBookingInput {
  organizationId: string;
  status: BookingStatusAction;
}

export type BusinessVertical = "ECOMMERCE" | "APPOINTMENT" | "GENERAL";

export interface UseCaseSettingsInput {
  organizationId: string;
  activeUseCase?: UseCaseId;
  appointmentPreset?: AppointmentPresetId;
  businessVertical?: BusinessVertical;
  useCaseOnboarded?: boolean;
  navShowAllTabs?: boolean;
}
