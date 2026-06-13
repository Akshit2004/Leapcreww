import { route, ok, body, requireFields, requireOrg } from "@/shared/lib/api";
import { launchSessionBroadcast } from "../../services/broadcastService";
import type { LaunchSessionBroadcastInput } from "../../types";

export const POST = route(async (req) => {
  const payload = await body<LaunchSessionBroadcastInput>(req);
  requireFields(payload, ["name", "targetTag", "text", "organizationId"]);
  await requireOrg(payload.organizationId, "AGENT");

  const result = await launchSessionBroadcast(payload);
  return ok(result);
});
