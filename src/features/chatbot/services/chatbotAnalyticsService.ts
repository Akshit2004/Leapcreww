import * as repo from "../repositories/chatbotAnalyticsRepo";

export interface NodeAnalyticsStats {
  impressions: number;
  responses: number;
  dropoffs: number;
  rate: number;
}

/** Aggregate per-node impression/response analytics for the chatbot flow visualizer. */
export async function getNodeAnalyticsStats(organizationId: string): Promise<Record<string, NodeAnalyticsStats>> {
  const [impressions, responses] = await Promise.all([
    repo.groupImpressionsByNode(organizationId),
    repo.groupResponsesByNode(organizationId),
  ]);

  const stats: Record<string, NodeAnalyticsStats> = {};

  impressions.forEach((imp) => {
    stats[imp.nodeId] = {
      impressions: imp._count.id,
      responses: 0,
      dropoffs: imp._count.id,
      rate: 0,
    };
  });

  responses.forEach((resp) => {
    if (stats[resp.nodeId]) {
      const impCount = stats[resp.nodeId].impressions;
      const respCount = resp._count.id;
      const dropoffs = Math.max(0, impCount - respCount);
      stats[resp.nodeId].responses = respCount;
      stats[resp.nodeId].dropoffs = dropoffs;
      stats[resp.nodeId].rate = impCount > 0 ? Math.round((respCount / impCount) * 100) : 0;
    }
  });

  return stats;
}
