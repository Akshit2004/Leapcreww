import { route, requireOrg, ok } from "@/shared/lib/api";
import { getFlowResponses } from "@/features/flows/services/flowService";

export const GET = route(async (_req, { params }) => {
  const orgId = params!.orgId;
  await requireOrg(orgId, "AGENT");
  const flowId = params!.flowId;

  const result = await getFlowResponses(flowId, orgId);

  return ok(result);
});
