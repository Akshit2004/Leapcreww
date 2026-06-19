/**
 * GET /api/org/[orgId]/analytics/silent-watcher
 *
 * Returns the "Aha! moment" data — high-risk orders detected even before
 * WhatsApp is connected. Powers the onboarding dashboard widget that shows
 * merchants how many risky COD orders they've already received, motivating
 * them to connect WhatsApp and activate the interception pipeline.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params;
    await requireOrg(orgId);

    const [org, highRiskCount, codOrders] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { whatsappConnected: true, silentWatcherEnabled: true },
      }),
      prisma.contact.count({
        where: { organizationId: orgId, tags: { has: "COD-High-Risk" } },
      }),
      prisma.order.findMany({
        where: { organizationId: orgId, codStatus: { not: null } },
        select: { codStatus: true, total: true },
      }),
    ]);

    const totalCodOrders = codOrders.length;

    // Orders still pending = not confirmed, not cancelled = at risk of RTO
    const rtoLossPreventablePaise = codOrders
      .filter((o) => o.codStatus === "pending")
      .reduce((sum, o) => sum + o.total, 0);

    return NextResponse.json({
      highRiskCount,
      totalCodOrders,
      rtoLossPreventablePaise,
      whatsappConnected: org?.whatsappConnected ?? false,
      silentWatcherEnabled: org?.silentWatcherEnabled ?? false,
    });
  } catch (err) {
    console.error("[silent-watcher analytics]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
