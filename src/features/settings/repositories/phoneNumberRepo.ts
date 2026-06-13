/** phoneNumberRepo.ts — Prisma access for additional org WhatsApp phone numbers. */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function findManyForOrg(organizationId: string) {
  return prisma.phoneNumber.findMany({
    where: { organizationId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export function countForOrg(organizationId: string) {
  return prisma.phoneNumber.count({ where: { organizationId } });
}

export function create(data: Prisma.PhoneNumberUncheckedCreateInput) {
  return prisma.phoneNumber.create({ data });
}

export function findById(id: string) {
  return prisma.phoneNumber.findUnique({ where: { id } });
}

export function clearDefaults(organizationId: string) {
  return prisma.phoneNumber.updateMany({
    where: { organizationId },
    data: { isDefault: false },
  });
}

export function update(id: string, data: Prisma.PhoneNumberUncheckedUpdateInput) {
  return prisma.phoneNumber.update({ where: { id }, data });
}

export function remove(id: string) {
  return prisma.phoneNumber.delete({ where: { id } });
}
