import type { Prisma } from "@prisma/client";
import { route, ok, requireOrg, body } from "@/shared/lib/api";
import { listAutomations, createAutomation } from "../../services/automationService";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  return ok({ automations: await listAutomations(orgId) });
});

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);

  const payload = await body<{
    name: string;
    triggerType: string;
    triggerConfig: Record<string, unknown>;
    steps?: Array<{
      type: string;
      templateName?: string;
      templateParams?: string[];
      tag?: string;
      delayMinutes: number;
    }>;
    templateName?: string;
    templateParams?: string[];
  }>(req);

  if (!payload.name?.trim()) throw new Error("name is required");
  if (!["keyword", "welcome", "tag_added", "button_reply"].includes(payload.triggerType)) {
    throw new Error("Invalid triggerType");
  }

  const hasSteps = Array.isArray(payload.steps) && payload.steps.length > 0;
  if (!hasSteps && !payload.templateName?.trim()) {
    throw new Error("Provide steps or templateName");
  }

  const automation = await createAutomation({
    name: payload.name.trim(),
    organizationId: orgId,
    triggerType: payload.triggerType,
    triggerConfig: (payload.triggerConfig ?? {}) as Prisma.InputJsonValue,
    steps: hasSteps ? (payload.steps as Prisma.InputJsonValue) : [],
    templateName: payload.templateName?.trim() ?? "",
    templateParams: payload.templateParams ?? [],
  });

  return ok({ automation }, { status: 201 });
});
