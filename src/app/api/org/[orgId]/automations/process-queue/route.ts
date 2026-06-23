import { route, ok, requireOrg } from "@/shared/lib/api";
import { processQueuedSteps } from "@/features/automations/services/automationQueueService";

export const POST = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  const processed = await processQueuedSteps(orgId);
  return ok({ processed });
});
