/**
 * GET /api/admin/stats
 *
 * Platform-wide counters for the superadmin dashboard. All queries run in
 * parallel; no org scoping — intentionally cross-tenant.
 */
import { route, ok, requirePlatformAdmin } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";

export const GET = route(async () => {
  await requirePlatformAdmin();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);

  const [
    totalOrgs,
    totalUsers,
    totalContacts,
    totalCampaigns,
    messagesSentAgg,
    connectedOrgs,
    sharedTemplates,
    newOrgsThisMonth,
    revenueAgg,
    topupsAgg,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.contact.count(),
    prisma.campaign.count(),
    prisma.campaign.aggregate({ _sum: { sent: true } }),
    prisma.organization.count({ where: { whatsappConnected: true } }),
    prisma.template.count({ where: { isShared: true } }),
    prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.usageEvent.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { costMinor: true },
    }),
    prisma.walletTopup.aggregate({
      where: { status: "paid", createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
  ]);

  return ok({
    totalOrgs,
    totalUsers,
    totalContacts,
    totalCampaigns,
    totalMessagesSent: messagesSentAgg._sum.sent ?? 0,
    connectedOrgs,
    sharedTemplates,
    newOrgsThisMonth,
    revenueThisMonthMinor: revenueAgg._sum.costMinor ?? 0,
    topupsThisMonthMajor: topupsAgg._sum.amount ?? 0,
  });
});
