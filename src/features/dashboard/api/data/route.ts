import { route, ok, requireOrg } from "@/shared/lib/api";
import { getDashboardData } from "../../services/dashboardService";

/** GET /api/org/[orgId]/data — main dashboard hydration endpoint. */
export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "AGENT");

  const data = await getDashboardData(orgId);
  return ok(data);
});
