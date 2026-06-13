import { route, ok, requireOrg, body, requireFields } from "@/shared/lib/api";
import { setOnboardingDismissed } from "../../services/dashboardService";

/** POST /api/org/[orgId]/onboarding — dismiss (or restore) the onboarding checklist. */
export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "AGENT");

  const input = await body<{ dismissed: boolean }>(req);
  requireFields(input, ["dismissed"]);

  const result = await setOnboardingDismissed(orgId, input.dismissed);
  return ok(result);
});
