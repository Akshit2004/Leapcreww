/** leadCaptureRepo.ts — Prisma access for lead capture (quiz → WhatsApp result). */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function createSubmission(data: Prisma.LeadSubmissionUncheckedCreateInput) {
  return prisma.leadSubmission.create({ data });
}

/** Tenant-scoped lookup — never resolve a submission outside its org. */
export function findSubmissionById(id: string, organizationId: string) {
  return prisma.leadSubmission.findFirst({ where: { id, organizationId } });
}

export function markDelivered(id: string) {
  return prisma.leadSubmission.update({
    where: { id },
    data: { resultDelivered: true, deliveredAt: new Date() },
  });
}

/** Recent submissions for the Settings → Developer card (proof the path landed). */
export function listRecentSubmissions(organizationId: string, limit: number) {
  return prisma.leadSubmission.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      source: true,
      result: true,
      resultDelivered: true,
      deliveredAt: true,
      createdAt: true,
      contact: { select: { name: true, phone: true } },
    },
  });
}
