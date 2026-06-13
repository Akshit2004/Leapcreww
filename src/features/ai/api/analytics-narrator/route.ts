import { route, ok, requireOrg, ApiError } from "@/shared/lib/api";
import { generateAnalyticsNarration } from "@/features/ai/services/analyticsNarratorService";

/** GET /api/ai/analytics-narrator?orgId=... — AI summary of campaign/revenue telemetry. */
export const GET = route(async (req) => {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) throw new ApiError("Missing organization ID (orgId)", 400);

  await requireOrg(orgId, "AGENT");

  const narration = await generateAnalyticsNarration(orgId);
  return ok({ narration });
});
