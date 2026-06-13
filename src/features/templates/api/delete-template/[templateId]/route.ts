import { route, ok, requireSession, ApiError } from "@/shared/lib/api";
import { deleteTemplate } from "../../../services/templateDeleteService";

export const DELETE = route(async (_req, { params }) => {
  await requireSession();

  const templateId = params?.templateId;
  if (!templateId) throw new ApiError("Missing templateId", 400);

  const result = await deleteTemplate(templateId);
  return ok(result);
});
