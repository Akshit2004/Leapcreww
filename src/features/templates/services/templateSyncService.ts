/**
 * templateSyncService.ts — Pull message templates from Meta and reconcile them
 * with the local `Template` table for an organization.
 */
import { ApiError } from "@/shared/lib/api";
import * as repo from "../repositories/templateRepo";

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

interface MetaTemplateComponent {
  type: string;
  text?: string;
  format?: string;
  buttons?: Array<{ text: string }>;
}

interface MetaTemplateInput {
  id: string;
  name: string;
  category: string;
  status: string;
  components?: MetaTemplateComponent[];
}

export interface SyncResult {
  success: true;
  count: number;
}

export interface SyncSkipped {
  success: false;
  message: string;
}

/**
 * Sync local templates with Meta's message_templates endpoint for the org's WABA.
 * Returns `{success:false, message}` (without throwing) when WhatsApp simply isn't
 * connected yet — that's a normal state, not an error.
 */
export async function syncTemplatesFromMeta(organizationId: string): Promise<SyncResult | SyncSkipped> {
  const organization = await repo.findOrgWaba(organizationId);
  if (!organization) {
    throw new ApiError("Organization not found.", 404);
  }

  const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  if (!systemToken || !organization.whatsappConnected || !organization.whatsappBusinessAccountId) {
    return { success: false, message: "WhatsApp not connected or system user token missing." };
  }

  const metaRes = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${organization.whatsappBusinessAccountId}/message_templates?limit=250`,
    { headers: { Authorization: `Bearer ${systemToken}` } }
  );

  if (!metaRes.ok) {
    const errData = await metaRes.json().catch(() => null);
    console.error(`Failed to sync templates from Meta (Status ${metaRes.status})`, errData);
    throw new ApiError("Failed to fetch message templates from Meta.", 400);
  }

  const metaData = await metaRes.json();
  const metaTemplates: MetaTemplateInput[] = metaData.data || [];
  const allMetaTemplates = new Map<string, MetaTemplateInput>();
  for (const t of metaTemplates) {
    if (t.id) allMetaTemplates.set(t.id, t);
  }

  const activeMetaIds = Array.from(allMetaTemplates.keys());

  // 1. Purge local templates not present in Meta's active list.
  await repo.deleteUnsyncedTemplates(organizationId, activeMetaIds);

  // 2. Upsert each real template returned by Meta.
  for (const t of allMetaTemplates.values()) {
    const bodyComp = t.components?.find((c) => c.type === "BODY");
    const bodyText = bodyComp?.text || "";

    const buttonsComp = t.components?.find((c) => c.type === "BUTTONS");
    const buttonsList = buttonsComp?.buttons?.map((b) => b.text).filter(Boolean) || [];

    const headerComp = t.components?.find((c) => c.type === "HEADER");
    let mediaType = "none";
    if (headerComp?.format === "IMAGE") mediaType = "image";
    else if (headerComp?.format === "VIDEO") mediaType = "video";
    else if (headerComp?.format === "DOCUMENT") mediaType = "file";

    const categoryFormatted =
      t.category === "UTILITY" ? "Utility" :
      t.category === "MARKETING" ? "Marketing" :
      t.category === "AUTHENTICATION" ? "Authentication" :
      t.category.charAt(0) + t.category.slice(1).toLowerCase();

    const statusFormatted =
      t.status === "APPROVED" ? "approved" :
      t.status === "REJECTED" ? "rejected" : "pending";

    const existingTemplates = await repo.findByNameOrMetaId(organizationId, t.name, t.id);

    if (existingTemplates.length > 0) {
      const primary = existingTemplates[0];
      await repo.updateTemplate(primary.id, {
        name: t.name,
        body: bodyText,
        category: categoryFormatted,
        buttons: buttonsList,
        mediaType,
        metaStatus: statusFormatted,
        metaId: t.id,
        isShared: primary.isShared,
      });

      if (existingTemplates.length > 1) {
        const duplicateIds = existingTemplates.slice(1).map((x) => x.id);
        await repo.deleteTemplatesByIds(duplicateIds);
      }
    } else {
      await repo.createTemplate({
        organizationId,
        name: t.name,
        body: bodyText,
        category: categoryFormatted,
        buttons: buttonsList,
        mediaType,
        metaStatus: statusFormatted,
        metaId: t.id,
      });
    }
  }

  return { success: true, count: allMetaTemplates.size };
}
