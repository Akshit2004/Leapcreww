import { ok, route, requireOrg, body, requireFields, ApiError } from "@/shared/lib/api";
import { setMarketplaceBotEnabled } from "../../services/settingsService";

/** POST /api/marketplace/settings — toggle the marketplace automation bot. */
export const POST = route(async (req) => {
  const input = await body<{ orgId: string; enabled: boolean }>(req);
  requireFields(input, ["orgId"]);
  if (typeof input.enabled !== "boolean") {
    throw new ApiError("Enabled parameter must be a boolean.", 400);
  }
  await requireOrg(input.orgId, "ADMIN");

  const organization = await setMarketplaceBotEnabled(input.orgId, input.enabled);
  return ok({ success: true, organization });
});
