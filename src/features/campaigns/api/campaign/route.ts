import { route, ok, requireOrg, requireFields, body, ApiError } from "@/shared/lib/api";
import { launchCampaign } from "../../services/broadcastService";
import type { LaunchCampaignInput } from "../../types";

export const POST = route(async (req) => {
  const input = await body<LaunchCampaignInput>(req);
  requireFields(input, ["name", "organizationId"]);
  // organizationId is caller-supplied — verify membership before launching a
  // broadcast that sends real WhatsApp messages and bills this org's wallet.
  await requireOrg(input.organizationId, "AGENT");
  
  if (!input.targetTag && !input.segmentId) {
    throw new ApiError("Either targetTag or segmentId must be provided.", 400);
  }

  if (input.segmentId && !input.targetTag) {
    input.targetTag = "";
  }
  
  if (!input.templateName && !input.flowId) {
    throw new ApiError("Either templateName or flowId must be provided.", 400);
  }

  const campaign = await launchCampaign(input);
  return ok({ campaign });
});
