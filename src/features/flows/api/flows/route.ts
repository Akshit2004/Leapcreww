import { route, ok, requireOrg, requireFields, body } from "@/shared/lib/api";
import { listFlows, createFlow } from "../../services/flowService";
import type { FlowInput } from "../../types";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  return ok({ flows: await listFlows(orgId) });
});

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const input = await body<FlowInput>(req);
  input.organizationId = orgId;
  requireFields(input, ["name", "flowJson"]);
  return ok({ flow: await createFlow(input) }, { status: 201 });
});
