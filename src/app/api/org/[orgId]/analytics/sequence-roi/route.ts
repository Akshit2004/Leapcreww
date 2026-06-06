import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { estimateSendCostMinor } from "@/features/analytics/services/cost";

/**
 * Sequence ROI ledger (D-04).
 *
 * Mirror of the campaign ledger, grouped by `attributedSequenceId`. Cost per
 * sequence is the centralized send rate × the number of sequence sends recorded
 * as AttributionTouch rows (channel="sequence").
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    const sequences = await prisma.sequence.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    const paidOrders = await prisma.order.findMany({
      where: { organizationId: orgId, paymentStatus: "paid" },
      select: { attributedSequenceId: true, total: true },
    });

    // Count sequence sends (touches) per sequence to drive the cost basis.
    const touchCounts = await prisma.attributionTouch.groupBy({
      by: ["sequenceId"],
      where: { organizationId: orgId, channel: "sequence" },
      _count: { _all: true },
    });
    const sendsBySeq: Record<string, number> = {};
    for (const t of touchCounts) {
      if (t.sequenceId) sendsBySeq[t.sequenceId] = t._count._all;
    }

    const bySeq: Record<string, { revenue: number; conversions: number }> = {};
    for (const order of paidOrders) {
      if (!order.attributedSequenceId) continue;
      const entry = (bySeq[order.attributedSequenceId] ??= { revenue: 0, conversions: 0 });
      entry.revenue += order.total;
      entry.conversions += 1;
    }

    const ledger = sequences.map((seq) => {
      const agg = bySeq[seq.id] || { revenue: 0, conversions: 0 };
      const sends = sendsBySeq[seq.id] || 0;
      const costPaise = estimateSendCostMinor("marketing", sends);
      const roi = costPaise > 0 ? Number((agg.revenue / costPaise).toFixed(1)) : 0;

      return {
        id: seq.id,
        name: seq.name,
        trigger: seq.trigger,
        sends,
        costPaise,
        attributedRevenuePaise: agg.revenue,
        conversions: agg.conversions,
        roi,
        status: seq.status,
      };
    });

    const totalCost = ledger.reduce((acc, s) => acc + s.costPaise, 0);
    const totalRevenue = ledger.reduce((acc, s) => acc + s.attributedRevenuePaise, 0);
    const totalConversions = ledger.reduce((acc, s) => acc + s.conversions, 0);
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
    console.error("Sequence ROI API error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
