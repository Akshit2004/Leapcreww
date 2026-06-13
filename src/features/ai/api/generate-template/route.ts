import { body, ok, requireOrg, requireFields, route } from "@/shared/lib/api";
import { generateTemplateBody } from "../../services/templateGenerationService";

export const POST = route(async (req) => {
  const { topic, url, orgId } = await body<{ topic?: string; url?: string; orgId?: string }>(req);
  requireFields({ topic, orgId }, ["topic", "orgId"]);

  await requireOrg(orgId!, "AGENT");

  const generatedText = await generateTemplateBody(orgId!, topic!, url);
  return ok({ generatedText });
});
