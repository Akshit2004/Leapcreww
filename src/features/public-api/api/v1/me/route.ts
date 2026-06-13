/**
 * GET /api/v1/me — identity endpoint for API key verification.
 *
 * Used as the Zapier auth test URL: if this returns 200 the key is valid.
 * Returns the org name so Zapier can label the connected account.
 * Requires no scope — any valid key can call it.
 */
import { route, ok } from "@/shared/lib/api";
import { authenticateApiKey } from "../../../services/apiKeyService";
import { getV1OrgInfo } from "../../../services/v1Service";

export const GET = route(async (req) => {
  const ctx = await authenticateApiKey(req);
  const info = await getV1OrgInfo(ctx.organizationId);
  return ok({ ...info, scopes: ctx.scopes });
});
