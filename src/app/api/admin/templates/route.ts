/**
 * GET /api/admin/templates
 *
 * Paginated list of all shared templates across every org. Supports filtering
 * by free-text search and by template category.
 */
import { route, ok, requirePlatformAdmin } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export const GET = route(async (req) => {
  await requirePlatformAdmin();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const take = 25;
  const skip = (page - 1) * take;

  const where: Prisma.TemplateWhereInput = {
    isShared: true,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { body: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(category ? { category } : {}),
  };

  const [templates, total] = await Promise.all([
    prisma.template.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        body: true,
        category: true,
        metaStatus: true,
        isShared: true,
        createdAt: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.template.count({ where }),
  ]);

  return ok({ templates, total, page, take });
});
