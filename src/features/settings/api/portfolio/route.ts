import { ok, route, requireOrg, body, requireFields, ApiError } from "@/shared/lib/api";
import { getPortfolio, switchPortfolio } from "../../services/whatsappConnectionService";

/**
 * GET /api/whatsapp/portfolio?orgId=xxx
 *
 * Returns the org's connected WABA and its phone numbers, using the System
 * User Token. The tenant only sees their own connected WABA.
 */
export const GET = route(async (req) => {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) throw new ApiError("Missing orgId", 400);
  await requireOrg(orgId, "AGENT");

  const result = await getPortfolio(orgId);
  return ok(result);
});

/**
 * POST /api/whatsapp/portfolio
 *
 * Switch the active WABA and phone number for this org. Used during
 * onboarding when the tenant selects their WABA/phone from Embedded Signup.
 */
export const POST = route(async (req) => {
  const input = await body<{ orgId: string; wabaId: string; phoneNumberId: string; metaCatalogId?: string | null }>(req);
  requireFields(input, ["orgId", "wabaId", "phoneNumberId"]);
  await requireOrg(input.orgId, "ADMIN");

  await switchPortfolio(input.orgId, {
    wabaId: input.wabaId,
    phoneNumberId: input.phoneNumberId,
    metaCatalogId: input.metaCatalogId,
  });
  return ok({ success: true });
});
