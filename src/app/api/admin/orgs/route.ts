/**
 * GET /api/admin/orgs
 *
 * Paginated, searchable list of all organizations across every tenant.
 * Includes membership/contact/campaign counts via Prisma _count.
 */
import { route, ok, requirePlatformAdmin } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export const GET = route(async (req) => {
  await requirePlatformAdmin();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const take = 20;
  const skip = (page - 1) * take;

  const where: Prisma.OrganizationWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [orgs, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        walletBalance: true,
        whatsappConnected: true,
        chatbotBuilderEnabled: true,
        createdAt: true,
        partnerId: true,
        _count: {
          select: { memberships: true, contacts: true, campaigns: true },
        },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  return ok({ orgs, total, page, take });
});
