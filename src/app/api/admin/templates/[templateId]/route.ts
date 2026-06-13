/**
 * PATCH  /api/admin/templates/[templateId] — toggle isShared flag.
 * DELETE /api/admin/templates/[templateId] — hard-delete a template.
 */
import { route, ok, requirePlatformAdmin, body, ApiError } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";

export const PATCH = route(async (req, { params }) => {
  await requirePlatformAdmin();

  const templateId = params!.templateId as string;
  const input = await body<{ isShared: boolean }>(req);

  if (typeof input.isShared !== "boolean") {
    throw new ApiError("isShared must be a boolean", 400);
  }

  const template = await prisma.template.update({
    where: { id: templateId },
    data: { isShared: input.isShared },
    select: { id: true, name: true, isShared: true },
  });

  return ok({ template });
});

export const DELETE = route(async (_req, { params }) => {
  await requirePlatformAdmin();

  const templateId = params!.templateId as string;

  await prisma.template.delete({ where: { id: templateId } });

  return ok({ deleted: true });
});
