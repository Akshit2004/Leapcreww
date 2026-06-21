import { z } from "zod";
import { route, ok, requireOrg } from "@/shared/lib/api";
import { parseBody } from "@/shared/lib/validation";
import { createLead } from "../../services/leadCaptureService";

const TestLeadSchema = z.object({
  to: z.string().trim().min(5).max(20),
});

/**
 * POST /api/org/[orgId]/lead-submissions/test — Settings card "send test".
 * Session-authed, but runs the exact /v1/leads capture path (billing + template
 * send), so what the merchant sees is what an integrator's POST will produce.
 */
export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const { to } = await parseBody(req, TestLeadSchema);
  const result = await createLead(orgId, {
    phone: to,
    name: "Lead Capture Test",
    source: "dashboard_test",
    result:
      "✅ Sample quiz result from LeapCreww — your Lead Capture integration works end-to-end.",
    attributes: { test: true },
  });
  return ok(result);
});
