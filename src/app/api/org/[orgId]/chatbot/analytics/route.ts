import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    // Fetch chatbot analytics impressions & responses grouped by nodeId
    const impressions = await prisma.chatbotAnalytics.groupBy({
      by: ["nodeId"],
      where: { organizationId: orgId, action: "impression" },
      _count: { id: true },
    });

    const responses = await prisma.chatbotAnalytics.groupBy({
      by: ["nodeId"],
      where: { organizationId: orgId, action: "response" },
      _count: { id: true },
    });

    // Format as map for quick visual nodes O(1) lookup
    const stats: Record<string, { impressions: number; responses: number; dropoffs: number; rate: number }> = {};

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

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Chatbot analytics route error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
