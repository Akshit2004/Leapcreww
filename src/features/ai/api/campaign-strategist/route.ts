import { route, ok, body, requireFields, requireOrg, ApiError } from "@/shared/lib/api";
import {
  generateCampaignStrategy,
  applyCampaignStrategy,
  type ApplyStrategyInput,
} from "@/features/ai/services/campaignStrategistService";

interface StrategistBody extends ApplyStrategyInput {
  action: "generate" | "apply";
  orgId: string;
  prompt?: string;
}

/** POST /api/ai/campaign-strategist — generate or apply an AI campaign strategy. */
export const POST = route(async (req) => {
  const payload = await body<StrategistBody>(req);
  requireFields(payload, ["action", "orgId"]);

  const { action, orgId } = payload;
  await requireOrg(orgId, "AGENT");

  if (action === "generate") {
    requireFields(payload, ["prompt"]);
    const strategy = await generateCampaignStrategy(orgId, payload.prompt as string);
    return ok({ strategy });
  }

  if (action === "apply") {
    const { template, segment, schedule, sequence, leadQualifier } = payload;
    requireFields({ template, segment, schedule }, ["template", "segment", "schedule"]);
    const result = await applyCampaignStrategy(orgId, { template, segment, schedule, sequence: sequence ?? null, leadQualifier });
    return ok(result);
  }

  throw new ApiError("Invalid action", 400);
});
