/** billingRepo.ts — Prisma access for usage events + wallet. */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

/** Record a usage event and atomically debit the org wallet in one transaction. */
export function recordUsageAndDebit(
  event: Prisma.UsageEventUncheckedCreateInput,
  costMajor: number
) {
  return prisma.$transaction([
    prisma.usageEvent.create({ data: event }),
    prisma.organization.update({
      where: { id: event.organizationId },
      data: { walletBalance: { decrement: costMajor } },
    }),
  ]);
}

export function listUsage(organizationId: string, take = 100) {
  return prisma.usageEvent.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export function sumUsageCost(organizationId: string) {
  return prisma.usageEvent.aggregate({
    where: { organizationId },
    _sum: { costMinor: true },
  });
}

export function getWalletBalance(organizationId: string) {
  return prisma.organization
    .findUnique({ where: { id: organizationId }, select: { walletBalance: true, partnerId: true } });
}

export function getPartnerMarkup(partnerId: string) {
  return prisma.partner
    .findUnique({ where: { id: partnerId }, select: { pricingMarkup: true } })
    .then((p) => p?.pricingMarkup ?? 0);
}
