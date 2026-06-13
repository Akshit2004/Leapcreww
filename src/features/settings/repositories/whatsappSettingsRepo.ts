/** whatsappSettingsRepo.ts — Prisma access for WhatsApp Business connection settings. */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

/** Fields needed to drive the Embedded Signup connect flow. */
export function findOrgForConnect(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
}

/** Fields needed for status / portfolio / catalog-sync reads. */
export function findOrgConnectionInfo(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      whatsappConnected: true,
      whatsappBusinessAccountId: true,
      whatsappPhoneNumberId: true,
      metaBusinessId: true,
      metaCatalogId: true,
    },
  });
}

/** Persist a successful connection (single WABA / phone auto-select path). */
export function setConnection(
  organizationId: string,
  data: {
    whatsappBusinessAccountId: string;
    whatsappPhoneNumberId: string;
    metaBusinessId: string | null;
    metaCatalogId: string | null;
  }
) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: {
      whatsappBusinessAccountId: data.whatsappBusinessAccountId,
      whatsappPhoneNumberId: data.whatsappPhoneNumberId,
      metaBusinessId: data.metaBusinessId,
      metaCatalogId: data.metaCatalogId,
      whatsappConnected: true,
    },
  });
}

/** Switch active WABA / phone number (portfolio selection). */
export function updateConnection(organizationId: string, data: Prisma.OrganizationUpdateInput) {
  return prisma.organization.update({ where: { id: organizationId }, data });
}

/** Clear all WhatsApp connection fields. */
export function clearConnection(organizationId: string) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: {
      whatsappBusinessAccountId: null,
      whatsappPhoneNumberId: null,
      metaBusinessId: null,
      whatsappConnected: false,
    },
  });
}

/** Persist a programmatically-created catalog id. */
export function setCatalogId(organizationId: string, metaCatalogId: string) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: { metaCatalogId },
  });
}

export function createLog(data: Prisma.SystemLogUncheckedCreateInput) {
  return prisma.systemLog.create({ data });
}
