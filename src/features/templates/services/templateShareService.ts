/**
 * templateShareService.ts — Toggle whether a template is shared org-wide.
 *
 * Extracted verbatim from the old toggle-share route so the route stays thin.
 */
import { ApiError } from "@/shared/lib/api";
import * as repo from "../repositories/templateRepo";

/** Look up the template's owning org, or throw 404. Used by the route to
 * authorize before mutating. */
export async function getTemplateOrgId(templateId: string): Promise<{ id: string; name: string; organizationId: string }> {
  const template = await repo.findTemplateForShare(templateId);
  if (!template) throw new ApiError("Template not found", 404);
  return template;
}

export async function setTemplateShare(templateId: string, isShared: boolean) {
  await repo.updateTemplate(templateId, { isShared });
  return { success: true, isShared };
}
