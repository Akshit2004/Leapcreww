import { route, ok } from "@/shared/lib/api";
import { authenticateApiKey, requireScope } from "../../../services/apiKeyService";
import { listV1Templates } from "../../../services/v1Service";

/** GET /v1/templates — list templates with Meta approval status. */
export const GET = route(async (req) => {
  const ctx = await authenticateApiKey(req);
  requireScope(ctx, "templates:read");
  return ok({ templates: await listV1Templates(ctx.organizationId) });
});
