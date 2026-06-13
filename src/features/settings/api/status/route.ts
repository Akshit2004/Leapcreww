import { ok, route, requireOrg, ApiError } from "@/shared/lib/api";
import { getStatus } from "../../services/whatsappConnectionService";

/** GET /api/whatsapp/status?orgId=xxx */
export const GET = route(async (req) => {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) throw new ApiError("Missing orgId", 400);
  await requireOrg(orgId, "AGENT");

  const result = await getStatus(orgId);
  return ok(result);
});
