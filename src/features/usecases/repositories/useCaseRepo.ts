/** useCaseRepo.ts — Prisma access for appointment slots + use-case settings. */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function listSlots(organizationId: string) {
  return prisma.appointmentSlot.findMany({
    where: { organizationId },
    orderBy: { startTime: "asc" },
    include: { contact: { select: { id: true, name: true, phone: true } } },
  });
}

export function createSlots(rows: Prisma.AppointmentSlotCreateManyInput[]) {
  return prisma.appointmentSlot.createMany({ data: rows });
}

export function findSlot(id: string, organizationId: string) {
  return prisma.appointmentSlot.findFirst({ where: { id, organizationId } });
}

export function deleteSlot(id: string, organizationId: string) {
  return prisma.appointmentSlot.deleteMany({ where: { id, organizationId } });
}

export function getOrganization(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, activeUseCase: true, appointmentPreset: true, marketplaceBotEnabled: true },
  });
}

export function updateUseCaseSettings(organizationId: string, data: Prisma.OrganizationUpdateInput) {
  return prisma.organization.update({
    where: { id: organizationId },
    data,
    select: { id: true, activeUseCase: true, appointmentPreset: true, marketplaceBotEnabled: true },
  });
}

export function getRazorpayIntegration(organizationId: string) {
  return prisma.integration.findUnique({
    where: { id_organizationId: { id: "razorpay", organizationId } },
    select: { status: true },
  });
}
