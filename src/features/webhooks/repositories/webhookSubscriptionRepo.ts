/** webhookSubscriptionRepo.ts — Prisma access for outbound webhook delivery (T-08). */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function listSubscriptions(organizationId: string) {
  return prisma.webhookSubscription.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

export function findSubscription(organizationId: string, id: string) {
  return prisma.webhookSubscription.findFirst({ where: { id, organizationId } });
}

export function findEnabledByEvent(organizationId: string, event: string) {
  return prisma.webhookSubscription.findMany({
    where: { organizationId, enabled: true, events: { has: event } },
  });
}

export function createSubscription(data: { url: string; events: string[]; secret: string; organizationId: string }) {
  return prisma.webhookSubscription.create({ data });
}

export function deleteSubscription(organizationId: string, id: string) {
  return prisma.webhookSubscription.deleteMany({ where: { id, organizationId } });
}

export function createDelivery(data: Prisma.WebhookDeliveryUncheckedCreateInput) {
  return prisma.webhookDelivery.create({ data });
}

export function updateDelivery(id: string, data: Prisma.WebhookDeliveryUncheckedUpdateInput) {
  return prisma.webhookDelivery.update({ where: { id }, data });
}

export function findDueDeliveries(now: Date, limit = 50) {
  return prisma.webhookDelivery.findMany({
    where: { status: "pending", nextAttemptAt: { lte: now } },
    include: { subscription: true },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
  });
}

/** Recent deliveries per subscription, for the Settings UI health column. */
export function recentDeliveryStats(organizationId: string) {
  return prisma.webhookDelivery.groupBy({
    by: ["subscriptionId", "status"],
    where: { organizationId },
    _count: { _all: true },
  });
}

/** Append-only Event log entry — source of truth for the polling API (T-08). */
export function createEvent(data: Prisma.EventUncheckedCreateInput) {
  return prisma.event.create({ data });
}
