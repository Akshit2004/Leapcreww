import { route, ok, requireSession, requireFields, body, ApiError } from "@/shared/lib/api";
import { launchCampaign } from "../../services/broadcastService";
import type { LaunchCampaignInput } from "../../types";

export const POST = route(async (req) => {
  await requireSession();
  const input = await body<LaunchCampaignInput>(req);
  requireFields(input, ["name", "organizationId"]);
  
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
