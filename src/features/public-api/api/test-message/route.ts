import { z } from "zod";
import { route, ok, requireOrg } from "@/shared/lib/api";
import { parseBody } from "@/shared/lib/validation";
import { sendV1Message } from "../../services/v1Service";

const TestMessageSchema = z.object({
  to: z.string().trim().min(5).max(20),
});

/**
 * POST /api/org/[orgId]/test-message — Developer Quickstart "send a test to my
 * phone" button. Session-authed, but runs the exact /v1 send path (billing
 * included) so what the developer sees is what their integration will get.
 */
export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const { to } = await parseBody(req, TestMessageSchema);
  const result = await sendV1Message(orgId, {
    to,
    text: "🚀 Test message from WappFlow — your API integration path works end-to-end.",
  });
  return ok(result);
});
