import { route, ok, requireOrg, body } from "@/shared/lib/api";
import { updateFlow, deleteFlow } from "../../../services/flowService";
import type { FlowInput } from "../../../types";

export const PUT = route(async (req, { params }) => {
  const { orgId, flowId } = params!;
  await requireOrg(orgId, "AGENT");

  const input = await body<Partial<FlowInput>>(req);
  return ok(await updateFlow(flowId, orgId, input));
});

export const DELETE = route(async (_req, { params }) => {
  const { orgId, flowId } = params!;
  await requireOrg(orgId, "ADMIN");

  return ok(await deleteFlow(flowId, orgId));
});
