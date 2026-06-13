import { body, ok, requireOrg, requireFields, route } from "@/shared/lib/api";
import { setChatbotBuilderEnabled } from "../../services/chatbotBuilderService";

export const POST = route(async (req) => {
  const { orgId, enabled } = await body<{ orgId?: string; enabled?: unknown }>(req);
  requireFields({ orgId }, ["orgId"]);

  await requireOrg(orgId!, "ADMIN");

  const organization = await setChatbotBuilderEnabled(orgId!, enabled);
  return ok({ success: true, organization });
});
