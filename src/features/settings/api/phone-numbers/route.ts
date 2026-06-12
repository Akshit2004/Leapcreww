import { requireOrg, ok, route, ApiError } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";

export const GET = route(async (_req, ctx) => {
  const orgId = ctx.params!.orgId;
  await requireOrg(orgId);
  const numbers = await prisma.phoneNumber.findMany({
    where: { organizationId: orgId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return ok({ phoneNumbers: numbers });
});

export const POST = route(async (req, ctx) => {
  const orgId = ctx.params!.orgId;
  await requireOrg(orgId, "ADMIN");
  const { displayName, phoneNumber, phoneNumberId, whatsappBusinessAccountId, accessToken } =
    await req.json() as { displayName: string; phoneNumber: string; phoneNumberId: string; whatsappBusinessAccountId?: string; accessToken?: string };
  if (!displayName || !phoneNumber || !phoneNumberId) {
    throw new ApiError("displayName, phoneNumber, and phoneNumberId are required", 400);
  }
  const existing = await prisma.phoneNumber.count({ where: { organizationId: orgId } });
  const record = await prisma.phoneNumber.create({
    data: {
      displayName,
      phoneNumber,
      phoneNumberId,
      whatsappBusinessAccountId: whatsappBusinessAccountId ?? null,
      accessToken: accessToken ?? null,
      isDefault: existing === 0,
      organizationId: orgId,
    },
  });
  return ok(record, { status: 201 });
});
