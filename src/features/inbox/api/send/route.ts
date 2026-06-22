import { route, ok, requireOrg, requireFields, body } from "@/shared/lib/api";
import { sendAgentMessage } from "../../services/inboxService";
import type { SendMessageInput } from "../../types";

export const POST = route(async (req) => {
  const input = await body<SendMessageInput>(req);
  requireFields(input, ["to", "text", "contactId", "orgId"]);
  // orgId is caller-supplied — verify membership before sending a WhatsApp
  // message billed to this org and written into its conversation history.
  const session = await requireOrg(input.orgId, "AGENT");
  const agentName = session.user.name || "Agent";
  const result = await sendAgentMessage(input, agentName);
  return ok(result);
});
