/** publicApiRepo.ts — Prisma access for the public /v1 surface (T-08). */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

// ─── Contacts ────────────────────────────────────────────────────────────────

export function findContactByPhone(organizationId: string, phone: string) {
  return prisma.contact.findFirst({ where: { organizationId, phone } });
}

export function createContact(data: Prisma.ContactUncheckedCreateInput) {
  return prisma.contact.create({ data });
}

export function updateContact(id: string, data: Prisma.ContactUncheckedUpdateInput) {
  return prisma.contact.update({ where: { id }, data });
}

export function listContacts(
  organizationId: string,
  filters: { phone?: string; tag?: string },
  limit: number,
  offset: number
) {
  const where: Prisma.ContactWhereInput = { organizationId };
  if (filters.phone) where.phone = filters.phone;
  if (filters.tag) where.tags = { has: filters.tag };
  return prisma.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      status: true,
      tags: true,
      source: true,
      attributes: true,
      createdAt: true,
    },
  });
}

// ─── Organizations ───────────────────────────────────────────────────────────

export function findOrgName(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
}

// ─── Events ──────────────────────────────────────────────────────────────────

export function listEvents(
  organizationId: string,
  filters: { type?: string },
  after: Date,
  limit: number
) {
  return prisma.event.findMany({
    where: {
      organizationId,
      createdAt: { gt: after },
      ...(filters.type ? { type: filters.type } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

// ─── Templates ───────────────────────────────────────────────────────────────

export function listTemplates(organizationId: string) {
  return prisma.template.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, category: true, body: true, metaStatus: true, createdAt: true },
  });
}

// ─── Outbound message log (keeps API sends visible in the Inbox) ────────────

export function logOutboundMessage(data: {
  text: string;
  contactId: string;
  organizationId: string;
  waMessageId: string | null;
}) {
  return prisma.message.create({
    data: { sender: "agent", ...data },
  });
}

// ─── Idempotency ─────────────────────────────────────────────────────────────

export function findIdempotencyKey(organizationId: string, key: string) {
  return prisma.idempotencyKey.findUnique({
    where: { organizationId_key: { organizationId, key } },
  });
}

export function storeIdempotencyKey(organizationId: string, key: string, response: Prisma.InputJsonValue) {
  return prisma.idempotencyKey.create({ data: { organizationId, key, response } });
}
