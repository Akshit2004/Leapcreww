/**
 * templateStatusService.ts — Poll Meta for a template's approval status and
 * reconcile the local mirror.
 *
 * Extracted verbatim from the old check-template-status route so the route
 * stays thin.
 */
import { ApiError } from "@/shared/lib/api";
import * as repo from "../repositories/templateRepo";

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

export interface TemplateStatusResult {
  metaStatus: string;
  metaData: unknown;
  metaError?: string;
}

/** Check `templateId`'s Meta approval status, persist any change, and drive
 * any AI-strategist campaign parked on this template forward. */
export async function checkTemplateStatus(templateId: string): Promise<TemplateStatusResult> {
  const template = await repo.findTemplateById(templateId);

  if (!template || !template.metaId) {
    throw new ApiError("Template not found or not sent to Meta", 404);
  }

  let dbStatus = template.metaStatus;
  let metaData: unknown = null;

  // Sandbox Mock Template Auto-Approval Simulator (for local testing only —
  // never auto-approve in production, even for legacy mock-meta- rows).
  if (process.env.NODE_ENV !== "production" && template.metaId.startsWith("mock-meta-")) {
    const ageMs = Date.now() - new Date(template.createdAt).getTime();
    dbStatus = ageMs > 12000 ? "approved" : "pending";
    metaData = { status: dbStatus.toUpperCase(), simulated: true };
  } else {
    // Real Meta API verification using System User Token
    const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;

    if (!systemToken) {
      throw new ApiError("WhatsApp System User Token not configured", 500);
    }

    // Query template status from Meta using System User Token
    const metaRes = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${template.metaId}?fields=status`,
      {
        headers: { Authorization: `Bearer ${systemToken}` },
      }
    );

    const metaJson = await metaRes.json();
    metaData = metaJson;

    if (!metaRes.ok) {
      console.warn(`[Template Status] Meta API error for ${template.metaId}:`, metaJson.error?.message);
      return { metaStatus: dbStatus, metaData: null, metaError: metaJson.error?.message };
    }

    const metaStatus = metaJson.status?.toLowerCase() || "pending";
    dbStatus = metaStatus === "approved" ? "approved" : metaStatus === "rejected" ? "rejected" : "pending";
  }

  // Update status in PostgreSQL if it changed
  if (dbStatus !== template.metaStatus) {
    await repo.updateTemplate(templateId, { metaStatus: dbStatus });

    await repo.createLog({
      type: "crm",
      message: `Template approval status updated: "${template.name}" is now ${dbStatus.toUpperCase()}`,
      organizationId: template.organizationId,
    });

    // Drive any AI-strategist campaign parked on this template forward. The
    // webhook normally handles this, but the poll covers environments without
    // live template webhooks (incl. the local mock auto-approval simulator).
    const { resumeCampaignsAwaitingTemplate, failCampaignsAwaitingTemplate } = await import(
      "@/features/campaigns/services/strategistActivation"
    );
    if (dbStatus === "approved") {
      await resumeCampaignsAwaitingTemplate(template.organizationId, template.name);
    } else if (dbStatus === "rejected") {
      await failCampaignsAwaitingTemplate(template.organizationId, template.name);
    }
  }

  return { metaStatus: dbStatus, metaData };
}
