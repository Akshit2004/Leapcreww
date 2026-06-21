import { route, ok, requireOrg } from "@/shared/lib/api";
import { listRecentSubmissions } from "../../services/leadCaptureService";

/** GET /api/org/[orgId]/lead-submissions — recent captures for the Settings card. */
export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  return ok({ submissions: await listRecentSubmissions(orgId) });
});
