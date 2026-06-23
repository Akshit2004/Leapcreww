import type { Prisma } from "@prisma/client";
import { route, ok, fail, requireOrg, body } from "@/shared/lib/api";
import { AUTOMATION_CATALOG } from "../../../config/catalog";
import { createAutomation } from "../../../services/automationService";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  return ok({ catalog: AUTOMATION_CATALOG });
});

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);

  const { catalogId } = await body<{ catalogId: string }>(req);
  if (!catalogId) return fail("catalogId is required", 400);

  const item = AUTOMATION_CATALOG.find((c) => c.id === catalogId);
  if (!item) return fail("Catalog item not found", 404);

  const automation = await createAutomation({
    name: item.title,
    organizationId: orgId,
    triggerType: item.triggerType,
    triggerConfig: item.triggerConfig as Prisma.InputJsonValue,
    steps: item.steps as unknown as Prisma.InputJsonValue,
    templateName: "",
    templateParams: [],
  });

  return ok({ automation }, { status: 201 });
});
