/** phoneNumberService.ts — CRUD for additional org WhatsApp phone numbers. */
import { ApiError } from "@/shared/lib/api";
import * as repo from "../repositories/phoneNumberRepo";

export interface CreatePhoneNumberInput {
  displayName: string;
  phoneNumber: string;
  phoneNumberId: string;
  whatsappBusinessAccountId?: string;
  accessToken?: string;
}

export interface UpdatePhoneNumberInput {
  displayName?: string;
  isDefault?: boolean;
}

export function listPhoneNumbers(organizationId: string) {
  return repo.findManyForOrg(organizationId);
}

export async function createPhoneNumber(organizationId: string, input: CreatePhoneNumberInput) {
  const { displayName, phoneNumber, phoneNumberId, whatsappBusinessAccountId, accessToken } = input;
  if (!displayName || !phoneNumber || !phoneNumberId) {
    throw new ApiError("displayName, phoneNumber, and phoneNumberId are required", 400);
  }

  const existing = await repo.countForOrg(organizationId);
  return repo.create({
    displayName,
    phoneNumber,
    phoneNumberId,
    whatsappBusinessAccountId: whatsappBusinessAccountId ?? null,
    accessToken: accessToken ?? null,
    isDefault: existing === 0,
    organizationId,
  });
}

export async function updatePhoneNumber(organizationId: string, id: string, input: UpdatePhoneNumberInput) {
  const record = await repo.findById(id);
  if (!record || record.organizationId !== organizationId) throw new ApiError("Not found", 404);

  if (input.isDefault) {
    await repo.clearDefaults(organizationId);
  }

  return repo.update(id, {
    ...(input.displayName !== undefined && { displayName: input.displayName }),
    ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
  });
}

export async function deletePhoneNumber(organizationId: string, id: string) {
  const record = await repo.findById(id);
  if (!record || record.organizationId !== organizationId) throw new ApiError("Not found", 404);
  if (record.isDefault) {
    throw new ApiError("Cannot delete the default phone number. Set another as default first.", 409);
  }
  await repo.remove(id);
}
