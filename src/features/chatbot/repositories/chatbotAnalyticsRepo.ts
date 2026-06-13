/** chatbotAnalyticsRepo.ts — Prisma access for chatbot flow analytics. */
import { prisma } from "@/shared/lib/prisma";

export function groupImpressionsByNode(organizationId: string) {
  return prisma.chatbotAnalytics.groupBy({
    by: ["nodeId"],
    where: { organizationId, action: "impression" },
    _count: { id: true },
  });
}

export function groupResponsesByNode(organizationId: string) {
  return prisma.chatbotAnalytics.groupBy({
    by: ["nodeId"],
    where: { organizationId, action: "response" },
    _count: { id: true },
  });
}
