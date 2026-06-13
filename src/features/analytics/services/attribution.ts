/**
 * attribution.ts — Last-touch conversion attribution (D-04).
 *
 * recordTouch() drops one AttributionTouch per outbound marketing send
 * (campaign broadcast or sequence step). resolveAttribution() reads the most
 * recent touch inside a window to stamp an Order with the campaign/sequence
 * that drove it, plus a snapshot of the contact's assignedAgent.
 *
 * Both helpers are best-effort: a failure here must never break a send or an
 * order, so callers can ignore rejections.
 */
import * as attributionRepo from "../repositories/attributionRepo";

export interface TouchInput {
  organizationId: string;
  contactId: string;
  channel: "campaign" | "sequence";
  campaignId?: string | null;
  sequenceId?: string | null;
}

/** Record a single marketing touch. Swallows errors (attribution is non-critical). */
export async function recordTouch(input: TouchInput): Promise<void> {
  try {
    await attributionRepo.createAttributionTouch({
      organizationId: input.organizationId,
      contactId: input.contactId,
      channel: input.channel,
      campaignId: input.campaignId ?? null,
      sequenceId: input.sequenceId ?? null,
    });
  } catch (err) {
    console.error("[attribution] recordTouch failed:", err);
  }
}

export interface ResolvedAttribution {
  attributedCampaignId: string | null;
  attributedSequenceId: string | null;
  attributedAgent: string | null;
}

/**
 * Resolve the attribution to stamp onto a new Order for `contact`.
 * - attributedAgent: always the contact's current assignedAgent (snapshot).
 * - campaign/sequence: from the latest AttributionTouch within `windowHours`.
 */
export async function resolveAttribution(
  organizationId: string,
  contact: { id: string; assignedAgent?: string | null },
  windowHours = 72
): Promise<ResolvedAttribution> {
  const result: ResolvedAttribution = {
    attributedCampaignId: null,
    attributedSequenceId: null,
    attributedAgent: contact.assignedAgent ?? null,
  };

  try {
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const latestTouch = await attributionRepo.findLatestTouch(organizationId, contact.id, cutoff);

    if (latestTouch) {
      if (latestTouch.channel === "campaign") {
        result.attributedCampaignId = latestTouch.campaignId ?? null;
      } else if (latestTouch.channel === "sequence") {
        result.attributedSequenceId = latestTouch.sequenceId ?? null;
      }
    }
  } catch (err) {
    console.error("[attribution] resolveAttribution failed:", err);
  }

  return result;
}
