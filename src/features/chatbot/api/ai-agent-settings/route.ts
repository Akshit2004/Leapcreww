import { body, ok, requireOrg, requireFields, route } from "@/shared/lib/api";
import { updateAiAgentSettings } from "../../services/chatbotBuilderService";

export const POST = route(async (req) => {
  const { orgId, aiKnowledgeBase, aiPersona, aiTemperature } = await body<{
    orgId?: string;
    aiKnowledgeBase?: unknown;
    aiPersona?: unknown;
    aiTemperature?: unknown;
  }>(req);
  requireFields({ orgId }, ["orgId"]);

  await requireOrg(orgId!, "ADMIN");

  const organization = await updateAiAgentSettings(orgId!, { aiKnowledgeBase, aiPersona, aiTemperature });
  return ok({ success: true, organization });
});
