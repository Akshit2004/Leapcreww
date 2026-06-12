import { requireOrg, ok, route, ApiError } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";

export const PATCH = route(async (req, ctx) => {
  const { orgId, id } = ctx.params!;
  await requireOrg(orgId, "ADMIN");
  const body = await req.json() as { displayName?: string; isDefault?: boolean };
  const record = await prisma.phoneNumber.findUnique({ where: { id } });
  if (!record || record.organizationId !== orgId) throw new ApiError("Not found", 404);

  if (body.isDefault) {
    await prisma.phoneNumber.updateMany({ where: { organizationId: orgId }, data: { isDefault: false } });
  }
  const updated = await prisma.phoneNumber.update({
    where: { id },
    data: {
      ...(body.displayName !== undefined && { displayName: body.displayName }),
      ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
    },
  });
  return ok(updated);
});

export const DELETE = route(async (_req, ctx) => {
  const { orgId, id } = ctx.params!;
  await requireOrg(orgId, "ADMIN");
  const record = await prisma.phoneNumber.findUnique({ where: { id } });
  if (!record || record.organizationId !== orgId) throw new ApiError("Not found", 404);
  if (record.isDefault) throw new ApiError("Cannot delete the default phone number. Set another as default first.", 409);
  await prisma.phoneNumber.delete({ where: { id } });
  return ok({ deleted: true });
});
