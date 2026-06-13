/**
 * strategistActivation.ts — Shared activation logic for AI Campaign Strategist.
 *
 * A strategist run can produce a campaign whose template is still awaiting Meta
 * approval. Such campaigns are persisted with status "PendingTemplate" and are
 * NOT broadcast until the template is approved (via the WhatsApp webhook or the
 * template-status poll). This module owns:
 *   - enrolling a segment's contacts into the strategy's follow-up sequence, and
 *   - resuming / failing campaigns once their template's verdict arrives.
 *
 * Sits above broadcastService + sequenceService + segmentService; imported by the
 * strategist route, the WhatsApp webhook, and the template-status poll route.
 */
import { processCampaignChunk } from "./broadcastService";
import * as campaignRepo from "../repositories/campaignRepo";
import * as contactRepo from "@/features/contacts/repositories/contactRepo";
import { resolveSegmentContacts } from "@/features/segments/services/segmentService";
import { enrollOnTrigger } from "@/features/sequences/services/sequenceService";

export const PENDING_TEMPLATE_STATUS = "PendingTemplate";


/**
 * Tag the contacts resolved by a segment with the sequence trigger tag and enroll
 * them into any matching "tag_added" sequence. Deferred until the campaign's
 * broadcast actually opens a 24h session, so drip messages can be delivered.
 */
export async function enrollSegmentContacts(
  organizationId: string,
  segmentId: string,
  triggerTag: string
): Promise<number> {
  const matchedContacts = await resolveSegmentContacts(segmentId);
  for (const contact of matchedContacts) {
    if (!contact.tags.includes(triggerTag)) {
      await contactRepo.setTags(contact.id, [...contact.tags, triggerTag]);
    }
    await enrollOnTrigger(organizationId, "tag_added", contact.id);
  }
  return matchedContacts.length;
}

/** Resolve the follow-up sequence's trigger tag for a campaign's segment. */
async function resolveTriggerTagForSegment(
  organizationId: string,
  segmentId: string | null,
  fallback: string
): Promise<string> {
  if (!segmentId) return fallback;
  const sequence = await campaignRepo.findLatestTagAddedSequence(organizationId, segmentId);
  const tag = (sequence?.triggerConfig as { tag?: string } | null)?.tag;
  return tag || fallback;
}

/**
 * A template has just been approved — launch (or schedule) every campaign that
 * was parked waiting on it, then enroll its audience into the follow-up drip.
 */
export async function resumeCampaignsAwaitingTemplate(
  organizationId: string,
  templateName: string
): Promise<number> {
  const parked = await campaignRepo.findCampaignsAwaitingTemplate(
    organizationId,
    templateName,
    PENDING_TEMPLATE_STATUS
  );

  const now = new Date();
  for (const campaign of parked) {
    const isFutureScheduled = !!campaign.scheduledAt && campaign.scheduledAt > now;

    if (isFutureScheduled) {
      // Hand off to the scheduled-campaign cron; it will broadcast at its time.
      await campaignRepo.updateCampaign(campaign.id, { status: "Scheduled" });
      await campaignRepo.logCampaignEvent(
        organizationId,
        campaign.id,
        `Template "${templateName}" approved — campaign scheduled for ${campaign.scheduledAt?.toISOString()}.`
      );
    } else {
      // Transition to Sending — the queue engine (cron) will process it in chunks.
      await campaignRepo.updateCampaign(campaign.id, { status: "Sending" });
      await campaignRepo.logCampaignEvent(
        organizationId,
        campaign.id,
        `Template "${templateName}" approved — campaign queued for broadcast.`
      );
    }

    // Enroll the audience into the follow-up sequence now that a session is opened.
    const triggerTag = await resolveTriggerTagForSegment(
      organizationId,
      campaign.segmentId,
      `${templateName}_trigger`
    );
    if (campaign.segmentId) {
      await enrollSegmentContacts(organizationId, campaign.segmentId, triggerTag).catch((err) =>
        console.error("[Strategist Resume Enroll Error]:", err)
      );
    }
  }

  return parked.length;
}

/**
 * A template was rejected/disabled by Meta — fail every campaign parked on it and
 * record the verdict (including Meta's reason) so it surfaces in the activity log.
 */
export async function failCampaignsAwaitingTemplate(
  organizationId: string,
  templateName: string,
  reason?: string | null
): Promise<number> {
  const parked = await campaignRepo.findCampaignsAwaitingTemplate(
    organizationId,
    templateName,
    PENDING_TEMPLATE_STATUS
  );

  for (const campaign of parked) {
    await campaignRepo.updateCampaign(campaign.id, { status: "Failed" });
    await campaignRepo.logCampaignEvent(
      organizationId,
      campaign.id,
      `Template "${templateName}" was rejected by Meta${reason ? `: ${reason}` : ""}. Campaign cancelled.`
    );
  }

  return parked.length;
}
