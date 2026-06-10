/**
 * useCaseService.ts — Business logic for the Use Cases console.
 *
 * Owns the "exactly one active agent" rule: switching activeUseCase keeps the
 * legacy marketplaceBotEnabled flag in sync so older dashboard panels keep
 * working. Paid appointment slots require a connected Razorpay account; free
 * slots and agent activation do not.
 */
import type { Prisma } from "@prisma/client";
import { ApiError } from "@/shared/lib/api";
import { isValidUseCase, isValidPreset } from "@/shared/config/useCasePresets";
import * as repo from "../repositories/useCaseRepo";
import type { CreateSlotsInput, SlotInput, UseCaseSettingsInput } from "../types";

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
  if (!Number.isFinite(price) || price < 0) throw new ApiError("Slot price must be zero or a positive amount.", 400);

  const durationMinutes = slot.durationMinutes && slot.durationMinutes > 0 ? Math.round(slot.durationMinutes) : 30;

  return { serviceName, startTime, durationMinutes, price };
}

export async function createSlots(input: CreateSlotsInput) {
  if (!Array.isArray(input.slots) || input.slots.length === 0) {
    throw new ApiError("Provide at least one slot to create.", 400);
  }

  const validated = input.slots.map(validateSlot);
  const hasPaid = validated.some((s) => s.price > 0);

  if (hasPaid && !(await razorpayConnected(input.organizationId))) {
    throw new ApiError(
      "Connect your Razorpay account in the Integrations tab before adding paid slots.",
      400
    );
  }

  await repo.createSlots(
    validated.map((s) => ({
      serviceName: s.serviceName,
      startTime: s.startTime,
      durationMinutes: s.durationMinutes,
      price: s.price,
      paymentStatus: s.price > 0 ? "none" : "free",
      organizationId: input.organizationId,
    }))
  );

  return listSlots(input.organizationId);
}

export async function deleteSlot(id: string, organizationId: string) {
  const result = await repo.deleteSlot(id, organizationId);
  if (result.count === 0) throw new ApiError("Slot not found.", 404);
  return { success: true };
}

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
