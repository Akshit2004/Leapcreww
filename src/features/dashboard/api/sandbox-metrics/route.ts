import { route, ok, requireOrg } from "@/shared/lib/api";
import { getSandboxMetrics } from "../../services/dashboardService";

/** GET /api/org/[orgId]/sandbox-metrics — sandbox usage counters for an org. */
export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "AGENT");

  const result = await getSandboxMetrics(orgId);
  return ok(result);
});
