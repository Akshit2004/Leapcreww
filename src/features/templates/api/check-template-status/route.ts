import { route, ok, requireSession, ApiError } from "@/shared/lib/api";
import { checkTemplateStatus } from "../../services/templateStatusService";

export const GET = route(async (req) => {
  await requireSession();

  const { searchParams } = new URL(req.url);
  const templateId = searchParams.get("templateId");

  if (!templateId) throw new ApiError("Missing templateId", 400);

  const result = await checkTemplateStatus(templateId);
  return ok(result);
});
