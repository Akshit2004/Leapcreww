import { route, ok, body, requireFields, requireOrg } from "@/shared/lib/api";
import { getTemplateOrgId, setTemplateShare } from "../../services/templateShareService";

interface ToggleShareBody {
  templateId: string;
  isShared: boolean;
}

export const PATCH = route(async (req) => {
  const payload = await body<ToggleShareBody>(req);
  requireFields(payload, ["templateId", "isShared"]);

  const template = await getTemplateOrgId(payload.templateId);
  await requireOrg(template.organizationId);

  const result = await setTemplateShare(payload.templateId, payload.isShared);
  return ok(result);
});
