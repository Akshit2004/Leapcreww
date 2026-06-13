import { ok, requireOrg, route, body } from "@/shared/lib/api";
import { saveNodes } from "../../services/chatbotBuilderService";
import type { ChatbotNodeInput } from "../../repositories/chatbotRepo";

export const POST = route(async (req, ctx) => {
  const orgId = ctx.params!.orgId;
  await requireOrg(orgId, "AGENT");

  const { nodes = [] } = await body<{ nodes?: ChatbotNodeInput[] }>(req);

  const result = await saveNodes(orgId, nodes);
  return ok({ success: true, count: result.count });
});
