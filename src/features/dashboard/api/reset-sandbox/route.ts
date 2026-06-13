import { route, ok, requireOrg } from "@/shared/lib/api";
import { resetSandbox } from "../../services/dashboardService";

/** POST /api/org/[orgId]/reset-sandbox — destructive: wipe sandbox data and reset contacts to baseline. */
export const POST = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "OWNER");

  const result = await resetSandbox(orgId);
  return ok(result);
});
