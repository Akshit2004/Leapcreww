import type { Prisma } from "@prisma/client";
import { route, ok, fail, requireOrg, body } from "@/shared/lib/api";
import { getAutomation, updateAutomation, deleteAutomation } from "../../../services/automationService";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  const id = params?.id as string;
  await requireOrg(orgId);
  const automation = await getAutomation(id, orgId);
  if (!automation) return fail("Automation not found", 404);
  return ok({ automation });
});

export const PATCH = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  const id = params?.id as string;
  await requireOrg(orgId);

  const payload = await body<{
    name?: string;
    triggerType?: string;
    triggerConfig?: Record<string, unknown>;
    templateName?: string;
    templateParams?: string[];
    isActive?: boolean;
  }>(req);

  const automation = await updateAutomation(id, orgId, {
    ...(payload.name !== undefined && { name: payload.name.trim() }),
    ...(payload.triggerType !== undefined && { triggerType: payload.triggerType }),
    ...(payload.triggerConfig !== undefined && { triggerConfig: payload.triggerConfig as Prisma.InputJsonValue }),
    ...(payload.templateName !== undefined && { templateName: payload.templateName.trim() }),
    ...(payload.templateParams !== undefined && { templateParams: payload.templateParams }),
    ...(payload.isActive !== undefined && { isActive: payload.isActive }),
  });

  return ok({ automation });
});

export const DELETE = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  const id = params?.id as string;
  await requireOrg(orgId);
  await deleteAutomation(id, orgId);
  return ok({ deleted: true });
});
