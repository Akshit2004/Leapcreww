/**
 * templateDeleteService.ts — Permanently delete a template, mirroring the
 * deletion on Meta when it's a real (non-mock) template.
 *
 * Extracted verbatim from the old delete-template route so the route stays
 * thin.
 */
import { ApiError } from "@/shared/lib/api";
import * as repo from "../repositories/templateRepo";

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

/** Delete `templateId` from Meta (if real) and from the local database. */
export async function deleteTemplate(templateId: string) {
  // 1. Fetch template from database
  const template = await repo.findTemplateById(templateId);

  if (!template) {
    throw new ApiError("Template not found", 404);
  }

  // 2. Perform Meta Graph API Deletion if it is a real template
  const isMock = template.metaId?.startsWith("mock-meta-") || !template.metaId;

  if (!isMock) {
    const org = await repo.findWabaIdForOrg(template.organizationId);

    const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    const wabaId = org?.whatsappBusinessAccountId;

    if (systemToken && wabaId) {
      const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${wabaId}/message_templates?name=${template.name}`;

      try {
        console.log(`[Meta API] Deleting template '${template.name}' from WABA ${wabaId}...`);
        const metaRes = await fetch(url, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${systemToken}`,
          },
        });

        const metaData = await metaRes.json();
        if (metaRes.ok) {
          console.log(`[Meta API] Deleted template '${template.name}' from WABA ${wabaId}`);
        } else {
          console.warn(`[Meta API] Deletion warning:`, metaData.error?.message);
        }
      } catch (apiErr) {
        console.error(`[Meta API Exception] Failed to reach Graph API:`, apiErr);
      }
    }
  }

  // 3. Delete from local PostgreSQL database
  await repo.deleteTemplateById(templateId);

  // 4. Create system log trace
  await repo.createLog({
    type: "crm",
    message: `Permanently deleted template: "${template.name}" from LeapCreww${!isMock ? " and Meta Business Manager" : ""}.`,
    organizationId: template.organizationId,
  });

  return { success: true };
}
