import { route, ok, body, requireFields, requireOrg } from "@/shared/lib/api";
import { bulkCreateLibraryTemplates } from "../../services/libraryTemplateService";

interface BulkCreateLibraryBody {
  organizationId: string;
}

export const POST = route(async (req) => {
  const payload = await body<BulkCreateLibraryBody>(req);
  requireFields(payload, ["organizationId"]);
  await requireOrg(payload.organizationId);

  const result = await bulkCreateLibraryTemplates(payload.organizationId);
  return ok(result);
});
