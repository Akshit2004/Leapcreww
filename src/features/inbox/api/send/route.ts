import { route, ok, requireSession, requireFields, body } from "@/shared/lib/api";
import { sendAgentMessage } from "../../services/inboxService";
import type { SendMessageInput } from "../../types";

export const POST = route(async (req) => {
  const session = await requireSession();
  const input = await body<SendMessageInput>(req);
  requireFields(input, ["to", "text", "contactId", "orgId"]);
  const agentName = session.user.name || "Agent";
  const result = await sendAgentMessage(input, agentName);
  return ok(result);
});
