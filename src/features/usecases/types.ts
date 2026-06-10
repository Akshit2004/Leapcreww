/** usecases feature DTOs. */
import type { UseCaseId, AppointmentPresetId } from "@/shared/config/useCasePresets";

export interface SlotInput {
  serviceName: string;
  startTime: string;      // ISO 8601
  durationMinutes?: number;
  price: number;          // paise; 0 = free
}

export interface CreateSlotsInput {
  organizationId: string;
  slots: SlotInput[];
}

export interface UseCaseSettingsInput {
  organizationId: string;
  activeUseCase?: UseCaseId;
  appointmentPreset?: AppointmentPresetId;
}
