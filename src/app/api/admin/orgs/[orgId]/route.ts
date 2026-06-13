/**
 * GET  /api/admin/orgs/[orgId]  — org detail with aggregates and recent logs.
 * PATCH /api/admin/orgs/[orgId] — toggle features or adjust wallet balance.
 */
import { route, ok, requirePlatformAdmin, body, ApiError } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";

export const GET = route(async (_req, { params }) => {
  await requirePlatformAdmin();

  const orgId = params!.orgId as string;

  const [org, contactCount, campaignCount, spentAgg, recentLogs] =
    await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          partner: { select: { name: true, slug: true } },
          memberships: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      }),
      prisma.contact.count({ where: { organizationId: orgId } }),
      prisma.campaign.count({ where: { organizationId: orgId } }),
      prisma.usageEvent.aggregate({
        where: { organizationId: orgId },
        _sum: { costMinor: true },
      }),
      prisma.systemLog.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          message: true,
          createdAt: true,
          campaignId: true,
        },
      }),
    ]);

  if (!org) throw new ApiError("Not found", 404);

  return ok({
    org,
    contactCount,
    campaignCount,
    totalSpentMinor: spentAgg._sum.costMinor ?? 0,
    recentLogs,
  });
});

export const PATCH = route(async (req, { params }) => {
  await requirePlatformAdmin();

  const orgId = params!.orgId as string;
  const input = await body<{
    chatbotBuilderEnabled?: boolean;
    whatsappConnected?: boolean;
    walletAdjustment?: number;
  }>(req);

  const data: Record<string, unknown> = {};
  if (input.chatbotBuilderEnabled !== undefined) {
    data.chatbotBuilderEnabled = input.chatbotBuilderEnabled;
  }
  if (input.whatsappConnected !== undefined) {
    data.whatsappConnected = input.whatsappConnected;
  }
  if (input.walletAdjustment !== undefined) {
    data.walletBalance = { increment: input.walletAdjustment };
  }

  const org = await prisma.organization.update({
    where: { id: orgId },
    data,
    select: {
      id: true,
      name: true,
      walletBalance: true,
      chatbotBuilderEnabled: true,
      whatsappConnected: true,
    },
  });

  return ok({ org });
});
