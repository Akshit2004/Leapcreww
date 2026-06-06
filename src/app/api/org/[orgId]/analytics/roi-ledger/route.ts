import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { estimateSendCostMinor } from "@/features/analytics/services/cost";

/**
 * Campaign ROI ledger (D-04).
 *
 * Revenue is attributed explicitly: a paid Order carries the campaign that
 * drove it (`attributedCampaignId`, stamped at order creation via last-touch
 * resolution) — no more 72h time-window guessing. Cost is the centralized
 * simulated send rate.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    const paidOrders = await prisma.order.findMany({
      where: { organizationId: orgId, paymentStatus: "paid" },
      select: { attributedCampaignId: true, total: true },
    });

    // Group attributed revenue + conversions by campaign.
    const byCampaign: Record<string, { revenue: number; conversions: number }> = {};
    for (const order of paidOrders) {
      if (!order.attributedCampaignId) continue;
      const entry = (byCampaign[order.attributedCampaignId] ??= { revenue: 0, conversions: 0 });
      entry.revenue += order.total;
      entry.conversions += 1;
    }

    const ledger = campaigns.map((camp) => {
      const agg = byCampaign[camp.id] || { revenue: 0, conversions: 0 };
      const costPaise = estimateSendCostMinor("marketing", camp.delivered || camp.sent);
      const roi = costPaise > 0 ? Number((agg.revenue / costPaise).toFixed(1)) : 0;

      return {
        id: camp.id,
        name: camp.name,
        templateName: camp.templateName,
        sent: camp.sent,
        delivered: camp.delivered,
        costPaise,
        attributedRevenuePaise: agg.revenue,
        conversions: agg.conversions,
        roi,
        status: camp.status,
        date: camp.date,
      };
    });

    const totalCost = ledger.reduce((acc, c) => acc + c.costPaise, 0);
    const totalRevenue = ledger.reduce((acc, c) => acc + c.attributedRevenuePaise, 0);
    const totalConversions = ledger.reduce((acc, c) => acc + c.conversions, 0);
    const overallRoi = totalCost > 0 ? Number((totalRevenue / totalCost).toFixed(1)) : 0;

    return NextResponse.json({
      ledger,
      summary: {
        totalCostPaise: totalCost,
        totalRevenuePaise: totalRevenue,
        totalConversions,
        overallRoi,
      },
    });
  } catch (error) {
    console.error("ROI ledger API error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
