/** contactRepo.ts — Prisma access for contacts, messages and CRM logs. */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function findContact(id: string) {
  return prisma.contact.findUnique({ where: { id } });
}

export function updateContact(id: string, data: Prisma.ContactUncheckedUpdateInput) {
  return prisma.contact.update({ where: { id }, data });
}

/** Delete a contact and its dependent orders in one transaction. */
export function deleteContactCascade(id: string) {
  return prisma.$transaction([
    prisma.order.deleteMany({ where: { contactId: id } }),
    prisma.contact.delete({ where: { id } }),
  ]);
}

export function createMessage(data: Prisma.MessageUncheckedCreateInput) {
  return prisma.message.create({ data });
}

export function createLog(data: Prisma.SystemLogUncheckedCreateInput) {
  return prisma.systemLog.create({ data });
}

export function bulkCreateContacts(data: Prisma.ContactCreateManyInput[]) {
  return prisma.contact.createMany({ data });
}

export function createContact(data: Prisma.ContactUncheckedCreateInput) {
  return prisma.contact.create({ data });
}

export function findMembership(userId: string, organizationId: string) {
  return prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
}
