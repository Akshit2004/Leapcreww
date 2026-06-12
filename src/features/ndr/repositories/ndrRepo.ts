/**
 * ndrRepo.ts — Prisma access for the NDR (Non-Delivery Report) feature.
 *
 * This is the ONLY place @/shared/lib/prisma may be imported within the ndr
 * feature. Every query is scoped by organizationId (Article II).
 */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export type NdrEventCreateData = {
  awb: string;
  orderId?: string;
  courier?: string;
  attempt?: number;
  reason?: string;
  customerPhone: string;
  customerName?: string;
  contactId?: string;
  organizationId: string;
};

export type NdrEventUpdateData = Partial<{
  status: string;
  rescheduledDate: string;
  updatedAddress: string;
  resolvedAt: Date;
}>;

export function createNdrEvent(data: NdrEventCreateData) {
  return prisma.ndrEvent.create({ data });
}

export function findNdrEventByAwb(awb: string, organizationId: string) {
  return prisma.ndrEvent.findFirst({
    where: { awb, organizationId },
    orderBy: { createdAt: "desc" },
  });
}

/** Most recent pending NDR for a contact — used in reply interception. */
export function findPendingNdrForContact(contactId: string, organizationId: string) {
  return prisma.ndrEvent.findFirst({
    where: { contactId, organizationId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
}

export function updateNdrEvent(id: string, organizationId: string, data: NdrEventUpdateData) {
  return prisma.ndrEvent.update({
    where: { id },
    data: {
      ...data,
      // Guard: always confirm the row belongs to the tenant
      organization: { is: { id: organizationId } },
    } as Prisma.NdrEventUpdateInput,
  });
}

export function listNdrEvents(organizationId: string, filter?: { status?: string }) {
  const where: Prisma.NdrEventWhereInput = { organizationId };
  if (filter?.status) where.status = filter.status;
  return prisma.ndrEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
