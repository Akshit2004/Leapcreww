/**
 * broadcastService.ts — Broadcast business logic with queue engine.
 *
 * Queue design: launchCampaign creates the record and returns immediately.
 * The cron (processAllCampaigns) advances each "Sending" campaign 50 contacts
 * at a time (CHUNK_SIZE). This eliminates serverless timeout death on large
 * lists and makes campaigns resumable after a crash.
 *
 * Optimistic locking: advanceCampaignChunk uses a WHERE currentOffset =
 * expectedOffset so two concurrent cron ticks cannot double-process the same
 * chunk — the second one gets count=0 and exits early.
 */
import type { Campaign, Contact } from "@prisma/client";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import { recordTouch } from "@/features/analytics/services/attribution";
import { canAfford, recordUsage } from "@/features/billing/services/billingService";
import * as repo from "../repositories/campaignRepo";
import { ApiError } from "@/shared/lib/api";
import {
  SESSION_BROADCAST_TEMPLATE,
  type CampaignVariable,
  type LaunchCampaignInput,
  type LaunchSessionBroadcastInput,
  type SessionBroadcastVariables,
  type WhatsAppTemplateParameter,
  type WhatsAppTemplatePayload,
} from "../types";

/** Max contacts to send per cron tick per campaign. 50 × 1s delay = 50s worst-case. */
export const CHUNK_SIZE = 50;

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
      if (v.value === "email") return { type: "text", text: contact.email ?? "" };
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

/** Send one contact and return whether it succeeded. */
async function sendToContact(campaign: Campaign, contact: Contact, flow: any, screenId: string): Promise<boolean> {
  const { id: campaignId, templateName, mediaType, mediaUrl, organizationId, flowId } = campaign;
  const phone = formatPhoneNumber(contact.phone);
  let result;
  let preview = "";

  if (templateName === SESSION_BROADCAST_TEMPLATE) {
    const { sessionText } = (campaign.variables as unknown as SessionBroadcastVariables) || { sessionText: "" };
    result = await sendWhatsAppMessage({ to: phone, text: sessionText }, organizationId);
    preview = sessionText.length > 50 ? sessionText.substring(0, 47) + "..." : sessionText;
  } else if (flowId && flow) {
    const flowVars = (campaign.variables as any) || {};
    result = await sendWhatsAppMessage(
      {
        to: phone,
        flow: {
          flowId: flow.metaFlowId,
          flowToken: `flow_${flow.id}_campaign_${campaignId}_${contact.id}`,
          flowCta: flowVars.ctaText || "Open Form",
          screen: screenId,
          title: flowVars.title || `Flow: ${flow.name}`,
          footer: flowVars.footer || "Sent via Campaign",
        },
      },
      organizationId
    );
    preview = `[Flow: ${flow.name}] | CTA: ${flowVars.ctaText || "Open Form"}`;
  } else {
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

  if (!result.ok) {
    await repo.logCampaignEvent(
      organizationId,
      campaignId,
      `Broadcast delivery failed to ${contact.name} (${phone}): ${result.error}`
    );
    return false;
  }

  await repo.logCampaignEvent(
    organizationId,
    campaignId,
    `Broadcast successfully sent to ${contact.name} (${phone})`
  );
  await repo.recordOutboundMessage({
    organizationId,
    campaignId,
    contactId: contact.id,
    text: preview,
    waMessageId: result.data?.messages?.[0]?.id,
  });
  await recordUsage({ type: "message", category: "marketing", organizationId, campaignId }).catch(() => {});
  await recordTouch({ organizationId, contactId: contact.id, channel: "campaign", campaignId });
  return true;
}

/**
 * Resolve flow metadata once per chunk so we don't re-fetch on every contact.
 * Returns { flow, screenId } or null if the campaign is a template broadcast.
 */
async function resolveFlow(campaign: Campaign): Promise<{ flow: any; screenId: string } | null> {
  if (!campaign.flowId) return null;
  const { prisma } = await import("@/shared/lib/prisma");
  const flow = await prisma.flow.findUnique({ where: { id: campaign.flowId } });
  if (!flow?.metaFlowId || flow.status !== "published") {
    await repo.updateCampaign(campaign.id, { status: "Failed" });
    await repo.logCampaignEvent(
      campaign.organizationId,
      campaign.id,
      `Campaign '${campaign.name}' aborted: Flow ${campaign.flowId} not found or not published.`
    );
    return null;
  }
  const rawScreenId = (flow.flowJson as any)?.screens?.[0]?.id || "WELCOME_SCREEN";
  const screenId =
    rawScreenId.replace(/[^a-zA-Z_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") ||
    "WELCOME_SCREEN";
  return { flow, screenId };
}

/**
 * Process one CHUNK_SIZE slice of a campaign's contact list.
 *
 * The optimistic lock: advanceCampaignChunk writes only when
 * currentOffset still equals the value we read — a concurrent cron tick
 * that already advanced the offset will get count=0 and this function exits.
 */
export async function processCampaignChunk(campaign: Campaign): Promise<void> {
  const { id: campaignId, organizationId, name } = campaign;
  const startOffset = campaign.currentOffset;

  // Wallet pre-flight once per chunk
  if (!(await canAfford(organizationId, "marketing"))) {
    await repo.updateCampaign(campaignId, { status: "Failed" });
    await repo.logCampaignEvent(
      organizationId,
      campaignId,
      `Campaign '${name}' paused: insufficient wallet balance.`
    );
    return;
  }

  // Load the next slice of contacts with a stable order
  const contacts =
    campaign.templateName === SESSION_BROADCAST_TEMPLATE
      ? await repo.findContactsByIds(
          organizationId,
          ((campaign.variables as unknown as SessionBroadcastVariables)?.contactIds || []).slice(
            startOffset,
            startOffset + CHUNK_SIZE
          )
        )
      : await repo.findTargetContactsPaged(
          organizationId,
          campaign.targetTag,
          campaign.excludeTag ?? undefined,
          campaign.segmentId,
          startOffset,
          CHUNK_SIZE
        );

  if (!contacts.length) {
    // All contacts processed — close the campaign
    await repo.updateCampaign(campaignId, { status: "Completed" });
    await repo.logCampaignEvent(
      organizationId,
      campaignId,
      `Broadcast campaign '${name}' completed.`
    );
    return;
  }

  const flowCtx = await resolveFlow(campaign);
  if (campaign.flowId && !flowCtx) return; // resolveFlow already marked it Failed

  const delaySeconds = campaign.delay ?? 1;
  let delivered = 0;

  for (const contact of contacts) {
    const ok = await sendToContact(
      campaign,
      contact,
      flowCtx?.flow ?? null,
      flowCtx?.screenId ?? "WELCOME_SCREEN"
    );
    if (ok) delivered++;
    if (delaySeconds > 0) await new Promise((r) => setTimeout(r, delaySeconds * 1000));
  }

  const newOffset = startOffset + contacts.length;
  const isComplete = contacts.length < CHUNK_SIZE; // last chunk is smaller than full size

  // Optimistic commit — safe to ignore if another cron tick already advanced
  await repo.advanceCampaignChunk(campaignId, startOffset, newOffset, delivered, isComplete);

  if (isComplete) {
    await repo.logCampaignEvent(
      organizationId,
      campaignId,
      `Broadcast campaign '${name}' completed (${newOffset} contacts processed).`
    );
  }
}

/**
 * Create a campaign record and return immediately.
 *
 * The actual sending is handled by the cron (processAllCampaigns) which
 * advances "Sending" campaigns CHUNK_SIZE contacts per tick.
 */
export async function launchCampaign(input: LaunchCampaignInput): Promise<Campaign> {
  const totalContacts = await repo.countTargetContacts(
    input.organizationId,
    input.targetTag,
    input.segmentId
  );
  const isScheduled = !!input.scheduledAt;

  return repo.createCampaign({
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
    sent: totalContacts,
    delivered: 0,
    read: 0,
    clicked: 0,
    currentOffset: 0,
    status: isScheduled ? "Scheduled" : "Sending",
    date: new Date().toISOString().split("T")[0],
    scheduledAt: isScheduled ? new Date(input.scheduledAt as string) : null,
    organizationId: input.organizationId,
  });
}

/**
 * Launch a free-form 24h-session broadcast. Eligibility (tag + customer-initiated
 * message within the last 24h) is resolved once at launch time and the resulting
 * contact ids are stored on the campaign; the queue engine (processAllCampaigns)
 * then sends to them CHUNK_SIZE at a time, same as template broadcasts.
 */
export async function launchSessionBroadcast(input: LaunchSessionBroadcastInput): Promise<{
  campaign: Campaign;
  eligibleCount: number;
  totalTagged: number;
  skippedInactive: number;
}> {
  const taggedContacts = await repo.findTargetContactsPaged(input.organizationId, input.targetTag);
  if (taggedContacts.length === 0) {
    throw new ApiError("No contacts match the selected tag", 400);
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const contactIds = taggedContacts.map((c) => c.id);
  const recentIds = new Set(await repo.findRecentlyActiveContactIds(contactIds, twentyFourHoursAgo));
  const eligibleIds = contactIds.filter((id) => recentIds.has(id));

  if (eligibleIds.length === 0) {
    throw new ApiError(
      "No contacts with messages in the last 24 hours. Free-form session messaging only works within the customer-initiated window.",
      400
    );
  }

  const isScheduled = !!input.scheduledAt;
  const variables: SessionBroadcastVariables = { sessionText: input.text, contactIds: eligibleIds };

  const campaign = await repo.createCampaign({
    name: input.name,
    targetTag: input.targetTag,
    templateName: SESSION_BROADCAST_TEMPLATE,
    variables: variables as unknown as object,
    delay: input.delay || 1,
    sent: eligibleIds.length,
    delivered: 0,
    read: 0,
    clicked: 0,
    currentOffset: 0,
    status: isScheduled ? "Scheduled" : "Sending",
    date: new Date().toISOString().split("T")[0],
    scheduledAt: isScheduled ? new Date(input.scheduledAt as string) : null,
    organizationId: input.organizationId,
  });

  return {
    campaign,
    eligibleCount: eligibleIds.length,
    totalTagged: taggedContacts.length,
    skippedInactive: taggedContacts.length - eligibleIds.length,
  };
}

/**
 * Cron entrypoint: start due scheduled campaigns, then advance all in-progress
 * campaigns by one chunk each.  Runs every minute.
 */
export async function processAllCampaigns() {
  const results: Array<Record<string, unknown>> = [];

  // 1. Promote due scheduled campaigns to "Sending"
  const due = await repo.findScheduledDue(new Date());
  for (const campaign of due) {
    await repo.updateCampaign(campaign.id, {
      status: "Sending",
      date: new Date().toISOString().split("T")[0],
    });
    await repo.logCampaignEvent(
      campaign.organizationId,
      campaign.id,
      `Scheduled campaign '${campaign.name}' started.`
    );
  }

  // 2. Advance every campaign currently sending (includes newly promoted ones)
  const sending = await repo.findSendingCampaigns();
  for (const campaign of sending) {
    try {
      await processCampaignChunk(campaign);
      results.push({ campaignId: campaign.id, name: campaign.name, offset: campaign.currentOffset });
    } catch (err) {
      console.error(`[BroadcastQueue] chunk failed for campaign ${campaign.id}:`, err);
      await repo.updateCampaign(campaign.id, { status: "Failed" }).catch(() => {});
      results.push({
        campaignId: campaign.id,
        error: err instanceof Error ? err.message : String(err),
        status: "Failed",
      });
    }
  }

  return results;
}

/** @deprecated Use processAllCampaigns — kept for backwards-compat with old cron callers. */
export const processScheduledCampaigns = processAllCampaigns;

/** Delete a campaign after verifying the requesting user owns its org. */
export async function deleteCampaignFor(campaignId: string, userEmail: string): Promise<void> {
  const campaign = await repo.findCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found");
  const isMember = await repo.userIsOrgMember(userEmail, campaign.organizationId);
  if (!isMember) throw new Error("Forbidden");
  await repo.deleteCampaign(campaignId);
}
