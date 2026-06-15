/** useCaseRepo.ts — Prisma access for appointment slots, bookings + use-case settings. */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function listSlots(organizationId: string) {
  return prisma.appointmentSlot.findMany({
    where: { organizationId },
    orderBy: { startTime: "asc" },
  });
}

/** Bulk-create slots, silently skipping any that collide with the
 * (organizationId, serviceName, startTime) unique constraint. */
export function createSlots(rows: Prisma.AppointmentSlotCreateManyInput[]) {
  return prisma.appointmentSlot.createMany({ data: rows, skipDuplicates: true });
}

export function findSlot(id: string, organizationId: string) {
  return prisma.appointmentSlot.findFirst({ where: { id, organizationId } });
}

export function deleteSlot(id: string, organizationId: string) {
  return prisma.appointmentSlot.deleteMany({ where: { id, organizationId } });
}

// ─── Bookings ──────────────────────────────────────────────────────────────

export function listBookings(organizationId: string) {
  return prisma.booking.findMany({
    where: { organizationId },
    orderBy: { startTime: "desc" },
    include: { contact: { select: { id: true, name: true, phone: true } } },
  });
}

export function findBooking(id: string, organizationId: string) {
  return prisma.booking.findFirst({
    where: { id, organizationId },
    include: { contact: { select: { id: true, name: true, phone: true } } },
  });
}

export function updateBookingStatus(id: string, status: string) {
  return prisma.booking.update({ where: { id }, data: { status } });
}

/** Reopen a slot for re-booking (used when a booking is cancelled). */
export function reopenSlot(slotId: string) {
  return prisma.appointmentSlot.update({ where: { id: slotId }, data: { isBooked: false } });
}

export function getOrganization(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, activeUseCase: true, appointmentPreset: true, marketplaceBotEnabled: true, businessVertical: true, useCaseOnboarded: true, navShowAllTabs: true },
  });
}

export function updateUseCaseSettings(organizationId: string, data: Prisma.OrganizationUpdateInput) {
  return prisma.organization.update({
    where: { id: organizationId },
    data,
    select: { id: true, activeUseCase: true, appointmentPreset: true, marketplaceBotEnabled: true, businessVertical: true, useCaseOnboarded: true, navShowAllTabs: true },
  });
}

export function getRazorpayIntegration(organizationId: string) {
  return prisma.integration.findUnique({
    where: { id_organizationId: { id: "razorpay", organizationId } },
    select: { status: true },
  });
}
