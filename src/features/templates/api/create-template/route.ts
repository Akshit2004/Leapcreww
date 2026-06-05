import { route, ok, requireSession, requireFields, body } from "@/shared/lib/api";
import { createTemplate } from "../../services/metaTemplateService";
import type { CreateTemplateInput } from "../../types";

export const POST = route(async (req) => {
  await requireSession();
  const input = await body<CreateTemplateInput>(req);
  requireFields(input, ["name", "category", "body", "organizationId"]);
  const template = await createTemplate(input);
  return ok({ template });
});
