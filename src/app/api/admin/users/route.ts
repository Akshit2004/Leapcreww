/**
 * GET /api/admin/users
 *
 * Paginated, searchable list of all platform users with their org memberships.
 */
import { route, ok, requirePlatformAdmin } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export const GET = route(async (req) => {
  await requirePlatformAdmin();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const take = 25;
  const skip = (page - 1) * take;

  const where: Prisma.UserWhereInput = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            organization: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return ok({ users, total, page, take });
});
