import { route, requireOrg, ok, body, requireFields, ApiError } from "@/shared/lib/api";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import * as repo from "../../../../repositories/flowRepo";

export const POST = route(async (req, { params }) => {
  const orgId = params!.orgId;
  await requireOrg(orgId, "AGENT");
  const flowId = params!.flowId;

  const payload = await body<{ to: string }>(req);
  requireFields(payload, ["to"]);

  const flow = await repo.getFlowById(flowId, orgId);
  if (!flow) {
    throw new ApiError("Flow not found", 404);
  }

  if (!flow.metaFlowId || flow.status !== "published") {
    throw new ApiError("Flow must be published to Meta before testing.", 400);
  }

  // Find the target welcome or lead capture screen
  const flowJson = flow.flowJson as any;
  const screenId = flowJson?.screens?.[0]?.id || "WELCOME_SCREEN";

  const result = await sendWhatsAppMessage({
    to: formatPhoneNumber(payload.to),
    flow: {
      flowId: flow.metaFlowId,
      flowToken: `test-token-${Date.now()}`,
      flowCta: "Open Form",
      screen: screenId,
      title: `Test Flow: ${flow.name}`,
      footer: "WappFlow Testing Mode",
    }
  }, orgId);

  if (!result.ok) {
    throw new ApiError(result.error || "Failed to send test flow message", 500);
  }

  return ok({ success: true, waMessageId: result.data?.messages?.[0]?.id });
});
