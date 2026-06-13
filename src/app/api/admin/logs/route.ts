/**
 * GET /api/admin/logs
 *
 * Cross-org system log viewer. Supports filtering by free-text search, org,
 * log type, and a rolling time window.
 */
import { route, ok, requirePlatformAdmin } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export const GET = route(async (req) => {
  await requirePlatformAdmin();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const orgId = searchParams.get("orgId") ?? "";
  const type = searchParams.get("type") ?? "";
  const days = Math.max(1, parseInt(searchParams.get("days") ?? "7", 10));
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const take = 50;
  const skip = (page - 1) * take;

  const since = new Date(Date.now() - days * 86400_000);

  const where: Prisma.SystemLogWhereInput = {
    createdAt: { gte: since },
    ...(orgId ? { organizationId: orgId } : {}),
    ...(type ? { type } : {}),
    ...(search ? { message: { contains: search, mode: "insensitive" } } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.systemLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        message: true,
        createdAt: true,
        organizationId: true,
        campaignId: true,
        organization: { select: { name: true, slug: true } },
      },
    }),
    prisma.systemLog.count({ where }),
  ]);

  return ok({ logs, total, page, take });
});
