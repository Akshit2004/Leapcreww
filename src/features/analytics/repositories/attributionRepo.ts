/**
 * attributionRepo.ts — All Prisma access for the analytics attribution feature.
 * Services call these; routes never touch prisma directly.
 */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function createAttributionTouch(data: Prisma.AttributionTouchUncheckedCreateInput) {
  return prisma.attributionTouch.create({ data });
}

/** Find the most recent attribution touch for a contact within a time window. */
export function findLatestTouch(organizationId: string, contactId: string, since: Date) {
  return prisma.attributionTouch.findFirst({
    where: {
      organizationId,
      contactId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
  });
}
