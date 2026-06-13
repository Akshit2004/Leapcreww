import { ok, route, requireOrg, body, requireFields, ApiError } from "@/shared/lib/api";
import { connectWhatsapp } from "../../services/whatsappConnectionService";

/**
 * POST /api/whatsapp/connect
 *
 * Called after Embedded Signup completes. The customer's short-lived token
 * is used ONLY to fetch their WABA details, then discarded. All subsequent
 * API calls use the platform's System User Token.
 */
export const POST = route(async (req) => {
  const input = await body<{ orgId: string; code: string }>(req);
  requireFields(input, ["orgId", "code"]);
  await requireOrg(input.orgId, "ADMIN");

  try {
    const result = await connectWhatsapp(input.orgId, input.code);
    return ok(result);
  } catch (err) {
    console.error("[Connect] Embedded Signup connect error:", err);
    if (err instanceof ApiError) throw err;
    throw new ApiError((err instanceof Error ? err.message : String(err)) || "Internal server error", 500);
  }
});
