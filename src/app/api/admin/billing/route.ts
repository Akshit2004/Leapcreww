/**
 * GET /api/admin/billing?days=30
 *
 * Revenue overview for a configurable rolling window. Returns aggregate totals,
 * per-org usage breakdown (top 20), and a daily revenue series for charting.
 */
import { route, ok, requirePlatformAdmin } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";

export const GET = route(async (req) => {
  await requirePlatformAdmin();

  const { searchParams } = new URL(req.url);
  const days = Math.max(1, parseInt(searchParams.get("days") ?? "30", 10));
  const since = new Date(Date.now() - days * 86400_000);

  const [usageAgg, topupsAgg, perOrgUsage, usageEvents] = await Promise.all([
    prisma.usageEvent.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { costMinor: true },
    }),
    prisma.walletTopup.aggregate({
      where: { status: "paid", createdAt: { gte: since } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.usageEvent.groupBy({
      by: ["organizationId"],
      where: { createdAt: { gte: since } },
      _sum: { costMinor: true },
      orderBy: { _sum: { costMinor: "desc" } },
      take: 20,
    }),
    prisma.usageEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, costMinor: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Enrich per-org rows with org name/slug (single IN query — no N+1).
  type OrgRow = { id: string; name: string; slug: string };
  type UsageGroupRow = { organizationId: string; _sum: { costMinor: number | null } };

  const orgIds = perOrgUsage.map((r: UsageGroupRow) => r.organizationId);
  const orgs: OrgRow[] =
    orgIds.length > 0
      ? await prisma.organization.findMany({
          where: { id: { in: orgIds } },
          select: { id: true, name: true, slug: true },
        })
      : [];
  const orgMap: Record<string, OrgRow> = Object.fromEntries(
    orgs.map((o: OrgRow) => [o.id, o])
  );

  const perOrgBreakdown = perOrgUsage.map((r: UsageGroupRow) => ({
    orgId: r.organizationId,
    orgName: orgMap[r.organizationId]?.name ?? null,
    orgSlug: orgMap[r.organizationId]?.slug ?? null,
    totalSpentMinor: r._sum.costMinor ?? 0,
  }));

  type UsageEventRow = { createdAt: Date; costMinor: number };

  // Bucket usage events into calendar-day totals in JS.
  const dailyMap = usageEvents.reduce<Record<string, number>>(
    (acc: Record<string, number>, e: UsageEventRow) => {
      const day = e.createdAt.toISOString().slice(0, 10);
      acc[day] = (acc[day] ?? 0) + e.costMinor;
      return acc;
    },
    {}
  );
  const dailyRevenue = Object.entries(dailyMap).map(
    ([date, minor]: [string, number]) => ({ date, minor })
  );

  return ok({
    periodDays: days,
    totalRevenueMinor: usageAgg._sum.costMinor ?? 0,
    totalTopupsMajor: topupsAgg._sum.amount ?? 0,
    totalTopupsCount: topupsAgg._count,
    perOrgBreakdown,
    dailyRevenue,
  });
});
