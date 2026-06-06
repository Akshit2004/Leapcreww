/**
 * broadcastService.ts — Broadcast business logic.
 *
 * Consolidates the template-send loop that was previously duplicated between
 * the launch route and the scheduled-cron route. Both now delegate here.
 */
import type { Campaign, Contact } from "@prisma/client";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import * as repo from "../repositories/campaignRepo";
import type {
  CampaignVariable,
  LaunchCampaignInput,
  WhatsAppTemplateParameter,
  WhatsAppTemplatePayload,
} from "../types";

const hhmm = (d = new Date()) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** Build a Meta template payload for one contact, resolving variables + media header. */
export function buildTemplatePayload(
  templateName: string,
  variables: CampaignVariable[],
  contact: Contact,
  mediaType?: string | null,
  mediaUrl?: string | null
): { payload: WhatsAppTemplatePayload; parameters: WhatsAppTemplateParameter[] } {
  const parameters: WhatsAppTemplateParameter[] = variables.map((v) => {
    if (v.type === "contact_field") {
      if (v.value === "name") return { type: "text", text: contact.name };
      if (v.value === "email") return { type: "text", text: contact.email };
      if (v.value === "phone") return { type: "text", text: contact.phone };
    }
    return { type: "text", text: v.value || "" };
  });

  const payload: WhatsAppTemplatePayload = { name: templateName, language: { code: "en_US" } };

  if (parameters.length > 0) {
    payload.components = [{ type: "body", parameters }];
  }

  if (mediaType && mediaType !== "none" && mediaUrl) {
    const headerParams: WhatsAppTemplateParameter = { type: mediaType };
    headerParams[mediaType] = { link: mediaUrl };
    payload.components = payload.components || [];
    payload.components.push({ type: "header", parameters: [headerParams] });
  }

  return { payload, parameters };
}

/**
 * Send a campaign (template or flow) to a list of contacts, updating delivered metrics,
 * system logs and CRM message bubbles as it goes. Returns delivered count.
 */
export async function runBroadcast(campaign: Campaign, contacts: Contact[]): Promise<number> {
  const { id: campaignId, name, templateName, mediaType, mediaUrl, organizationId, flowId } = campaign;
  const delaySeconds = campaign.delay ?? 1;

  await repo.updateCampaign(campaignId, { sent: contacts.length });

  // If this is a Flow broadcast, fetch flow configuration
  let flow: any = null;
  let screenId = "WELCOME_SCREEN";
  if (flowId) {
    const { prisma } = await import("@/shared/lib/prisma");
    flow = await prisma.flow.findUnique({ where: { id: flowId } });
    if (!flow || !flow.metaFlowId) {
      await repo.updateCampaign(campaignId, { status: "Failed" });
      await repo.logCampaignEvent(
        organizationId,
        campaignId,
        `Failed to run flow broadcast: Flow or Meta Flow ID not found for Flow ID ${flowId}.`,
        hhmm()
      );
      return 0;
    }
    const flowJson = flow.flowJson as any;
    screenId = flowJson?.screens?.[0]?.id || "WELCOME_SCREEN";
  }

  let delivered = 0;
  for (const contact of contacts) {
    const phone = formatPhoneNumber(contact.phone);
    let result;
    let preview = "";

    if (flowId && flow) {
      // Send interactive Flow message
      const flowVars = (campaign.variables as any) || {};
      result = await sendWhatsAppMessage(
        {
          to: phone,
          flow: {
            flowId: flow.metaFlowId,
            flowToken: `campaign-token-${campaignId}-${contact.id}`,
            flowCta: flowVars.ctaText || "Open Form",
            screen: screenId,
            title: flowVars.title || `Flow: ${flow.name}`,
            footer: flowVars.footer || "Sent via Campaign",
          }
        },
        organizationId
      );
      preview = `[Flow: ${flow.name}] | CTA: ${flowVars.ctaText || "Open Form"}`;
    } else {
      // Send template message (original path)
      const variables = (campaign.variables as unknown as CampaignVariable[]) || [];
      const { payload, parameters } = buildTemplatePayload(
        templateName || "",
        variables,
        contact,
        mediaType,
        mediaUrl
      );
      result = await sendWhatsAppMessage(
        {
          to: phone,
          template: payload as unknown as {
            name: string;
            language: { code: string };
            components?: Record<string, unknown>[];
          },
        },
        organizationId
      );
      preview =
        parameters.length > 0
          ? `[Template: ${templateName}] | Params: ${parameters.map((p) => p.text).join(", ")}`
          : `[Template Message: ${templateName}]`;
    }

    const ts = hhmm();
    if (!result.ok) {
      await repo.logCampaignEvent(
        organizationId,
        campaignId,
        `Broadcast delivery failed to ${contact.name} (${phone}): ${result.error}`,
        ts
      );
    } else {
      delivered++;
      await repo.logCampaignEvent(
        organizationId,
        campaignId,
        `Broadcast successfully sent to ${contact.name} (${phone})`,
        ts
      );
      await repo.recordOutboundMessage({
        organizationId,
        campaignId,
        contactId: contact.id,
        text: preview,
        timestamp: ts,
        waMessageId: result.data?.messages?.[0]?.id,
      });
    }

    await repo.updateCampaign(campaignId, { delivered });
    if (delaySeconds > 0) await new Promise((r) => setTimeout(r, delaySeconds * 1000));
  }

  await repo.updateCampaign(campaignId, { status: "Completed" });
  await repo.logCampaignEvent(
    organizationId,
    campaignId,
    `Broadcast campaign '${name}' processing completely finalized.`,
    hhmm()
  );
  return delivered;
}

/**
 * Create a campaign record. If scheduled, returns immediately for the cron to
 * pick up. Otherwise fires the broadcast in the background and returns the record.
 */
export async function launchCampaign(input: LaunchCampaignInput): Promise<Campaign> {
  const contacts = await repo.findTargetContacts(
    input.organizationId,
    input.targetTag,
    input.excludeTag,
    input.segmentId
  );
  const isScheduled = !!input.scheduledAt;

  const campaign = await repo.createCampaign({
    name: input.name,
    targetTag: input.targetTag,
    excludeTag: input.excludeTag,
    templateName: input.templateName || null,
    flowId: input.flowId || null,
    mediaType: input.mediaType,
    mediaUrl: input.mediaUrl,
    variables: (input.variables as unknown as object) || [],
    delay: input.delay || 1,
    segmentId: input.segmentId,
    sent: contacts.length,
    delivered: 0,
    read: 0,
    clicked: 0,
    status: isScheduled ? "Scheduled" : "Sending",
    date: new Date().toISOString().split("T")[0],
    scheduledAt: isScheduled ? new Date(input.scheduledAt as string) : null,
    organizationId: input.organizationId,
  });

  if (!isScheduled) {
    // Fire-and-forget background worker.
    void runBroadcast(campaign, contacts).catch(async (err) => {
      console.error("[Broadcast Background Worker Error]:", err);
      await repo.updateCampaign(campaign.id, { status: "Failed" }).catch(() => {});
    });
  }

  return campaign;
}

/** Cron entrypoint: run all scheduled campaigns whose time has arrived. */
export async function processScheduledCampaigns() {
  const due = await repo.findScheduledDue(new Date());
  const results: Array<Record<string, unknown>> = [];

  for (const campaign of due) {
    try {
      await repo.updateCampaign(campaign.id, {
        status: "Sending",
        date: new Date().toISOString().split("T")[0],
      });
      await repo.logCampaignEvent(
        campaign.organizationId,
        campaign.id,
        `Scheduled broadcast campaign '${campaign.name}' processing has commenced. (${campaign.id})`,
        hhmm()
      );
      const contacts = await repo.findTargetContacts(
        campaign.organizationId,
        campaign.targetTag,
        campaign.excludeTag ?? undefined,
        campaign.segmentId
      );
      const delivered = await runBroadcast(campaign, contacts);
      results.push({ campaignId: campaign.id, name: campaign.name, recipients: contacts.length, delivered, status: "Completed" });
    } catch (err) {
      console.error(`Error processing campaign ${campaign.id}:`, err);
      await repo.updateCampaign(campaign.id, { status: "Failed" }).catch(() => {});
      results.push({ campaignId: campaign.id, name: campaign.name, error: err instanceof Error ? err.message : String(err), status: "Failed" });
    }
  }
  return results;
}

/** Delete a campaign after verifying the requesting user owns its org. */
export async function deleteCampaignFor(campaignId: string, userEmail: string): Promise<void> {
  const campaign = await repo.findCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found");
  const isMember = await repo.userIsOrgMember(userEmail, campaign.organizationId);
  if (!isMember) throw new Error("Forbidden");
  await repo.deleteCampaign(campaignId);
}
