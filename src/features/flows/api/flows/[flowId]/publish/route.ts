import { route, requireOrg, ok } from "@/shared/lib/api";
import { publishToMeta } from "@/features/flows/services/flowService";

export const POST = route(async (req, { params }) => {
  const orgId = params!.orgId;
  await requireOrg(orgId, "AGENT");
  const flowId = params!.flowId;

  const result = await publishToMeta(flowId, orgId);
  return ok(result);
});
