/**
 * leadQualifierService.ts — Intercept handler for campaign-driven lead qualification.
 *
 * When a contact replies to a template campaign's Quick Reply button (e.g. "Interested"),
 * this handler starts a 2–4 question WhatsApp button flow. Each answer is saved to
 * contact.attributes. At the end the contact is tagged "qualified-lead" or the
 * configured disqualified tag.
 *
 * Designed to run BEFORE the chatbot / autoresponder in the inbound webhook pipeline.
 * Returns true when it consumed the message (caller should stop further processing).
 */
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import type { LeadQualifierConfig, LeadQualifierQuestion } from "../lib/leadQualifier";
import {
  findCampaignsWithLeadQualifier,
  findCampaignLeadQualifier,
  updateContactAttributes,
  updateContactTags,
} from "../repositories/campaignRepo";

// Shape of the contact as provided by the webhook pipeline
interface QContact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  attributes: Record<string, unknown>;
  organizationId: string;
}

// ─── Public intercept entry point ──────────────────────────────────────────

/**
 * Main intercept: called once per inbound message before any other routing.
 *
 * Returns true  → message was consumed; caller must not route further.
 * Returns false → message not for this handler; fall through to next handler.
 */
export async function handleLeadQualifier(
  incomingText: string,
  contact: QContact,
  orgId: string
): Promise<boolean> {
  const attrs = contact.attributes;

  // ── Case A: contact is mid-session ────────────────────────────────────────
  const activeCampaignId = typeof attrs.qualifier_campaign_id === "string"
    ? attrs.qualifier_campaign_id
    : null;

  if (activeCampaignId) {
    return handleActiveSession(incomingText, contact, orgId, activeCampaignId, attrs);
  }

  // ── Case B: check if the text triggers a new qualifier session ────────────
  return handleTriggerCheck(incomingText, contact, orgId);
}

// ─── Case A: process an answer for the current question ───────────────────

async function handleActiveSession(
  incomingText: string,
  contact: QContact,
  orgId: string,
  campaignId: string,
  attrs: Record<string, unknown>
): Promise<boolean> {
  const row = await findCampaignLeadQualifier(campaignId, orgId);
  if (!row?.leadQualifier) {
    // Campaign no longer has a qualifier — clear orphaned session state and fall through
    await clearQualifierState(contact, attrs);
    return false;
  }

  const config = row.leadQualifier as unknown as LeadQualifierConfig;
  if (!config.enabled || !config.questions?.length) {
    await clearQualifierState(contact, attrs);
    return false;
  }

  const qualifierStep = typeof attrs.qualifier_step === "number" ? attrs.qualifier_step : 0;
  const question = config.questions[qualifierStep];

  if (!question) {
    // Index out of range — session corrupted; clear and fall through
    await clearQualifierState(contact, attrs);
    return false;
  }

  // Check if the reply text matches one of the allowed options
  const lowerText = incomingText.toLowerCase();
  const matchedOption = question.options.find((opt) =>
    lowerText.includes(opt.toLowerCase())
  );

  if (!matchedOption) {
    // Unrecognised reply — prompt again with the same question
    await sendQuestion(contact.phone, question, orgId, "Please choose one of the options:");
    return true;
  }

  // Save the chosen answer to contact attributes
  const updatedAttrs: Record<string, unknown> = {
    ...attrs,
    [question.attributeKey]: matchedOption,
  };

  // Check for disqualifying answer
  const isDisqualifying = question.disqualifyOn?.some((d) =>
    lowerText.includes(d.toLowerCase())
  ) ?? false;

  if (isDisqualifying) {
    await applyOutcome(contact, orgId, updatedAttrs, config.disqualifiedTag, false);
    await sendWhatsAppMessage(
      { to: formatPhoneNumber(contact.phone), text: "Thanks for your time! We'll keep you in mind for future opportunities." },
      orgId
    );
    return true;
  }

  const isLastQuestion = qualifierStep >= config.questions.length - 1;

  if (isLastQuestion) {
    await applyOutcome(contact, orgId, updatedAttrs, config.qualifiedTag, true);
    await sendWhatsAppMessage(
      { to: formatPhoneNumber(contact.phone), text: "You're all set! Our team will reach out shortly." },
      orgId
    );
    return true;
  }

  // Advance to the next question
  const nextStep = qualifierStep + 1;
  const nextAttrs: Record<string, unknown> = {
    ...updatedAttrs,
    qualifier_step: nextStep,
  };
  await updateContactAttributes(contact.id, nextAttrs);
  await sendQuestion(contact.phone, config.questions[nextStep], orgId);
  return true;
}

// ─── Case B: check if text starts a new qualifier session ─────────────────

async function handleTriggerCheck(
  incomingText: string,
  contact: QContact,
  orgId: string
): Promise<boolean> {
  const campaigns = await findCampaignsWithLeadQualifier(orgId);
  if (!campaigns.length) return false;

  const lowerText = incomingText.toLowerCase();

  for (const campaign of campaigns) {
    const config = campaign.leadQualifier as unknown as LeadQualifierConfig;
    if (!config?.enabled || !config.triggerKeyword || !config.questions?.length) continue;

    if (!lowerText.includes(config.triggerKeyword.toLowerCase())) continue;

    // Trigger matched — start the session
    const initAttrs: Record<string, unknown> = {
      ...(contact.attributes || {}),
      qualifier_campaign_id: campaign.id,
      qualifier_step: 0,
    };
    await updateContactAttributes(contact.id, initAttrs);
    await sendQuestion(contact.phone, config.questions[0], orgId);
    return true;
  }

  return false;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Send a question as a WhatsApp interactive button message. */
async function sendQuestion(
  phone: string,
  question: LeadQualifierQuestion,
  orgId: string,
  prefixText?: string
): Promise<void> {
  const text = prefixText ? `${prefixText}\n\n${question.text}` : question.text;
  // WhatsApp interactive buttons: max 3 buttons, title max 20 chars each
  await sendWhatsAppMessage(
    {
      to: formatPhoneNumber(phone),
      text,
      buttons: question.options.slice(0, 3).map((opt, i) => ({
        type: "reply" as const,
        reply: { id: `opt_${i}`, title: opt.slice(0, 20) },
      })),
    },
    orgId
  );
}

/**
 * Apply end-of-flow outcome: save final attributes, add tag, clear session keys.
 * `_qualified` is unused for logic but kept for future telemetry / logging callers.
 */
async function applyOutcome(
  contact: QContact,
  orgId: string,
  currentAttrs: Record<string, unknown>,
  tag: string,
  _qualified: boolean
): Promise<void> {
  // Clear qualifier session keys from attributes
  const { qualifier_campaign_id: _cid, qualifier_step: _step, ...rest } = currentAttrs;
  await updateContactAttributes(contact.id, rest);

  // Merge tag deduped
  const updatedTags = Array.from(new Set([...contact.tags, tag]));
  await updateContactTags(contact.id, updatedTags);
}

/** Clear orphaned qualifier session state (corrupted / campaign deleted). */
async function clearQualifierState(
  contact: QContact,
  attrs: Record<string, unknown>
): Promise<void> {
  const { qualifier_campaign_id: _cid, qualifier_step: _step, ...rest } = attrs;
  await updateContactAttributes(contact.id, rest);
}
