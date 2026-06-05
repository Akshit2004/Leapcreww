import { route, ok, requireSession, requireFields, body } from "@/shared/lib/api";
import { launchCampaign } from "../../services/broadcastService";
import type { LaunchCampaignInput } from "../../types";

export const POST = route(async (req) => {
  await requireSession();
  const input = await body<LaunchCampaignInput>(req);
  requireFields(input, ["name", "targetTag", "templateName", "organizationId"]);
  const campaign = await launchCampaign(input);
  return ok({ campaign });
});
