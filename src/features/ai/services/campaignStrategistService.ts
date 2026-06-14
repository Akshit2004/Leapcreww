/**
 * campaignStrategistService.ts — AI Campaign Strategist orchestration.
 *
 * "generate" drafts a full campaign strategy (template, segment, schedule,
 * 3-step sequence) from a free-text objective. "apply" persists that strategy
 * by creating/reusing a Template, Segment, Sequence and Campaign, with
 * compensating cleanup if any step after the segment fails.
 */
import { ApiError } from "@/shared/lib/api";
import { getGroqChatCompletion, getGroqChatCompletionWithFallback } from "@/shared/lib/groq";
import { generateTemplateBody, generateSequenceStepMessages } from "./templateGenerationService";
import * as repo from "../repositories/aiRepo";
import { createTemplate } from "@/features/templates/services/metaTemplateService";
import { createSegment } from "@/features/segments/services/segmentService";
import { launchCampaign } from "@/features/campaigns/services/broadcastService";
import { createSequence } from "@/features/sequences/services/sequenceService";
import { createCampaign, findTargetContacts } from "@/features/campaigns/repositories/campaignRepo";
import {
  enrollSegmentContacts,
  PENDING_TEMPLATE_STATUS,
} from "@/features/campaigns/services/strategistActivation";
import type { SegmentRules } from "@/features/segments/types";
import type { CampaignVariable } from "@/features/campaigns/types";
import type { StepAction } from "@/features/sequences/types";
import type { LeadQualifierConfig } from "@/features/campaigns/lib/leadQualifier";

interface BrandProfile {
  name?: string;
  industry?: string;
  toneOfVoice?: string;
}

interface StrategyTemplate {
  name: string;
  category?: string;
  mediaType?: string;
  mediaUrl?: string | null;
  body: string;
  variables?: CampaignVariable[];
  buttons?: string[];
}

interface StrategySegment {
  name: string;
  rules: SegmentRules;
}

interface StrategySchedule {
  reasoning?: string;
  delay?: number;
  scheduledAt?: string;
}

interface StrategySequenceStep {
  order?: number;
  delayMinutes?: number;
  actionType?: string;
  templateName?: string;
  message?: string;
  conditions?: Record<string, unknown>;
}

interface StrategySequence {
  name: string;
  trigger?: string;
  triggerConfig?: { tag?: string };
  steps: StrategySequenceStep[];
}

export interface CampaignStrategy {
  templateExists: boolean;
  template: StrategyTemplate;
  segment: StrategySegment;
  schedule: StrategySchedule;
  sequence: StrategySequence;
}

/**
 * Replace bracket-style lead-name placeholders (e.g. "[Lead Name]") with the
 * correct token for each context: "{{1}}" for Meta template bodies (plus a
 * matching contact_field variable), and "{{contact.name}}" for sequence step
 * messages (resolved at send time).
 */
function sanitizeStrategyPlaceholders(strategy: Partial<CampaignStrategy> | null | undefined): void {
  if (!strategy) return;

  // 1. Sanitize template body
  if (strategy.template && typeof strategy.template.body === "string") {
    let templateBody = strategy.template.body;
    const leadNameRegex = /\[Lead\s*Name\]|\[Contact\s*Name\]|\[Name\]|\[Lead's\s*Name\]|\{\{contact\.name\}\}/gi;
    if (leadNameRegex.test(templateBody)) {
      templateBody = templateBody.replace(leadNameRegex, "{{1}}");
      strategy.template.body = templateBody;

      if (!Array.isArray(strategy.template.variables)) {
        strategy.template.variables = [];
      }
      const hasNameVar = strategy.template.variables.some(
        (v) => v.type === "contact_field" && v.value === "name"
      );
      if (!hasNameVar) {
        strategy.template.variables.unshift({
          key: "1",
          type: "contact_field",
          value: "name",
        });
      }
    }
  }

  // 2. Sanitize sequence step messages
  if (strategy.sequence && Array.isArray(strategy.sequence.steps)) {
    strategy.sequence.steps.forEach((step) => {
      if (step.actionType === "send_message" && typeof step.message === "string") {
        const leadNameRegex = /\[Lead\s*Name\]|\[Contact\s*Name\]|\[Name\]|\[Lead's\s*Name\]|\{\{1\}\}/gi;
        step.message = step.message.replace(leadNameRegex, "{{contact.name}}");
      }
    });
  }
}

/**
 * Generate a full campaign strategy from a free-text prompt. Throws ApiError(502)
 * if the model returns invalid JSON, or if GROQ_API_KEY is not configured.
 */
export async function generateCampaignStrategy(organizationId: string, prompt: string): Promise<CampaignStrategy> {
  // Fetch organization and brand profile
  const org = await repo.findBrandProfile(organizationId);
  const brand = (org?.brandProfile as BrandProfile | null) || {};
  const brandName = brand.name || "the business";
  const industry = brand.industry || "general";
  const tone = brand.toneOfVoice || "professional";

  // Query contacts — extract unique tags only (compact)
  const contacts = await repo.findContactsForStrategist(organizationId, 50);
  const uniqueTags = [...new Set(contacts.flatMap((c) => c.tags))].slice(0, 30);

  // Query approved templates — truncate body to keep prompt small
  const approvedTemplates = (await repo.findApprovedTemplates(organizationId))
    .slice(0, 5)
    .map((t) => ({
      name: t.name,
      category: t.category,
      body: t.body.slice(0, 120) + (t.body.length > 120 ? "…" : ""),
      buttons: t.buttons,
      mediaType: t.mediaType,
    }));

  const systemPrompt = `You are a WhatsApp campaign strategist. Output ONLY a raw JSON object — no markdown, no backticks, no explanation.
Brand: ${brandName} | Industry: ${industry} | Tone: ${tone}
CRM tags in use: ${uniqueTags.join(", ") || "none"}
Approved templates: ${JSON.stringify(approvedTemplates)}

RULES:
1. templateExists: true ONLY if an approved template above fits perfectly; false = draft new.
2. Template name: snake_case, 3-4 words max. Leave body as "PLACEHOLDER" — it will be replaced.
3. variables: [{"key":"1","type":"contact_field","value":"name"}] always.
4. buttons: always exactly ["Interested", "Not Interested"].
5. segment.rules: {"all":[{"field":"tags","op":"in","value":"TAG_NAME"}]} — pick the most relevant tag from CRM tags.
6. sequence steps: 3 DISTINCT follow-up messages that each reference the SPECIFIC offer (reward amount, product name, action required). Use {{contact.name}}. NEVER write generic openers like "Thanks for your interest", "Just checking in", "Don't miss out", "Hope you're doing well". Each step angle:
   - order 0 (+5min): quick nudge — name the exact reward and what action to take
   - order 1 (+1440min): new angle — how easy/quick it is to claim, or a secondary benefit
   - order 2 (+2880min): urgency — deadline or "last chance" framing referencing the exact offer

EXAMPLE — prompt: "sell commercial vehicle, get ₹100 extra"
{"templateExists":false,"template":{"name":"commercial_bonus","category":"Marketing","mediaType":"none","body":"PLACEHOLDER","variables":[{"key":"1","type":"contact_field","value":"name"}],"buttons":["Interested","Not Interested"]},"segment":{"name":"all_agents","rules":{"all":[{"field":"tags","op":"in","value":"agents"}]}},"schedule":{"reasoning":"immediate","delay":1,"scheduledAt":""},"sequence":{"name":"commercial_bonus_seq","trigger":"tag_added","triggerConfig":{"tag":"commercial_bonus_trigger"},"steps":[{"order":0,"delayMinutes":5,"actionType":"send_message","message":"{{contact.name}}, your ₹100 commercial vehicle bonus is unclaimed — tag the vehicle as 'Commercial' now to grab it!"},{"order":1,"delayMinutes":1440,"actionType":"send_message","message":"{{contact.name}}, it only takes 30 seconds to tag a commercial vehicle and pocket ₹100 extra. Go do it now!"},{"order":2,"delayMinutes":2880,"actionType":"send_message","message":"Last call {{contact.name}} — the ₹100 commercial vehicle bonus window is closing. Tag it as 'Commercial' before it's gone!"}]}}

OUTPUT JSON:`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Prompt: ${prompt}` },
  ];

  let aiResponse: string;
  try {
    // 70b preferred for quality; falls back to 8b if daily quota is exhausted
    aiResponse = await getGroqChatCompletionWithFallback(messages, "llama-3.3-70b-versatile", "llama-3.1-8b-instant", { maxTokens: 1024, temperature: 0.2, jsonMode: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ai] Campaign strategist Groq call failed:", msg);
    throw new ApiError(`AI strategist unavailable: ${msg}`, 502);
  }

  let strategy: CampaignStrategy;
  try {
    strategy = JSON.parse(aiResponse);
  } catch (parseErr) {
    console.error("[ai] Failed to parse strategist JSON:", parseErr, "\nRaw:", aiResponse.slice(0, 800));
    throw new ApiError("AI returned an invalid JSON schema. Please try again.", 502);
  }

  sanitizeStrategyPlaceholders(strategy);

  // ── Replace template body AND sequence step messages using focused services ──
  // Same "Generate with AI" approach as the Templates tab — dedicated prompts
  // per piece of copy instead of one big JSON blob. Run in parallel for speed.
  const [generatedBody, generatedStepMessages] = await Promise.allSettled([
    generateTemplateBody(organizationId, prompt),
    generateSequenceStepMessages(organizationId, prompt),
  ]);

  if (generatedBody.status === "fulfilled") {
    strategy.template.body = generatedBody.value;
  }

  // Ensure variables always has the {{1}} name entry
  if (!Array.isArray(strategy.template.variables)) strategy.template.variables = [];
  const hasNameVar = strategy.template.variables.some((v) => v.type === "contact_field" && v.value === "name");
  if (!hasNameVar) strategy.template.variables.unshift({ key: "1", type: "contact_field", value: "name" });

  // Replace sequence step messages with focused AI-generated ones
  if (generatedStepMessages.status === "fulfilled") {
    const [msg0, msg1, msg2] = generatedStepMessages.value;
    if (!strategy.sequence) {
      strategy.sequence = { name: `${strategy.template.name}_seq`, trigger: "tag_added", triggerConfig: { tag: `${strategy.template.name}_trigger` }, steps: [] };
    }
    strategy.sequence.steps = [
      { order: 0, delayMinutes: 5,    actionType: "send_message", message: msg0 },
      { order: 1, delayMinutes: 1440, actionType: "send_message", message: msg1 },
      { order: 2, delayMinutes: 2880, actionType: "send_message", message: msg2 },
    ];
  }

  // ── Server-side guards on the AI's template decision ──────────────
  // The model can hallucinate a reuse (templateExists:true with a name
  // not in the approved list). Trust the DB, not the model: a reuse is
  // only valid when the selected name is actually an approved template.
  const approvedNames = new Set(approvedTemplates.map((t) => t.name));
  if (strategy?.template) {
    const claimedReuse = strategy.templateExists === true;
    const nameIsApproved = approvedNames.has(strategy.template.name);
    strategy.templateExists = claimedReuse && nameIsApproved;

    if (!strategy.templateExists) {
      // Treat as a brand-new draft: media headers can't carry a sample
      // asset here, and variables must be a well-formed array.
      strategy.template.mediaType = "none";
      strategy.template.mediaUrl = null;
      if (!Array.isArray(strategy.template.variables)) {
        strategy.template.variables = [];
      }
      // Always ensure Interested/Not Interested buttons exist on new templates
      if (!Array.isArray(strategy.template.buttons) || strategy.template.buttons.length === 0) {
        strategy.template.buttons = ["Interested", "Not Interested"];
      }
    }
  }

  return strategy;
}

export interface ApplyStrategyInput {
  template: StrategyTemplate;
  segment: StrategySegment;
  schedule: StrategySchedule;
  sequence: StrategySequence | null;
  leadQualifier?: LeadQualifierConfig | null;
}

export type ApplyStrategyResult =
  | {
      success: true;
      templateApproved: true;
      template: unknown;
      segment: { id: string };
      campaign: unknown;
      sequence: { id: string } | null;
      enrolledCount: number;
    }
  | {
      success: true;
      templateApproved: false;
      template: unknown;
      segment: { id: string };
      campaign: unknown;
      sequence: { id: string } | null;
      pendingCount: number;
    };

/**
 * Persist a (possibly client-echoed) strategy: resolve/create its Template,
 * create its Segment and follow-up Sequence, then either launch the campaign
 * immediately (template already approved) or park it pending Meta approval.
 * On failure after the segment is created, compensating deletes roll back the
 * partial work so retries don't accumulate orphan records.
 */
export async function applyCampaignStrategy(
  organizationId: string,
  input: ApplyStrategyInput
): Promise<ApplyStrategyResult> {
  sanitizeStrategyPlaceholders(input as Partial<CampaignStrategy>);
  const { template, segment, schedule, sequence, leadQualifier } = input;

  if (!template || !segment || !schedule) {
    throw new ApiError("Missing strategy parts", 400);
  }

  // 1. Resolve Template. Reuse any existing template with this name (approved
  //    OR still pending) to avoid Meta "Duplicate template name" errors; only
  //    call Meta when there is no usable template yet.
  let savedTemplate = await repo.findReusableTemplate(organizationId, template.name);

  if (!savedTemplate) {
    savedTemplate = await createTemplate({
      name: template.name,
      category: template.category || "Marketing",
      body: template.body,
      buttons: template.buttons || [],
      mediaType: template.mediaType || "none",
      mediaUrl: template.mediaUrl || null,
      organizationId,
    });
  }

  // If the resolved template (e.g. one adopted from Meta) is already rejected,
  // parking a campaign on it would wait forever — surface it instead.
  if (savedTemplate.metaStatus === "rejected") {
    throw new ApiError(
      `A template named "${savedTemplate.name}" was rejected by Meta. Please revise the copy or use a different name and try again.`,
      400
    );
  }

  const templateApproved = savedTemplate.metaStatus === "approved";
  const variables = Array.isArray(template.variables) ? template.variables : [];

  // There is no single DB transaction here (createTemplate already hit Meta and
  // the broadcast runs in the background). Track the records we create so we can
  // roll them back if a later step throws, keeping retries idempotent.
  let savedSegment: { id: string } | null = null;
  let savedSequence: { id: string } | null = null;
  let campaign: { id: string } | null = null;

  try {
    // 2. Create Segment
    savedSegment = await createSegment({
      name: segment.name,
      rules: segment.rules,
      organizationId,
    });

    // 3. Create the follow-up Sequence (optional — skipped when user disabled it).
    const triggerTag = sequence?.triggerConfig?.tag || `${template.name}_trigger`;
    if (sequence) {
      savedSequence = await createSequence({
        name: sequence.name,
        trigger: "tag_added",
        triggerConfig: { tag: triggerTag },
        organizationId,
        segmentId: savedSegment.id,
        steps: sequence.steps.map((s, idx) => ({
          order: idx,
          delayMinutes: s.delayMinutes || 0,
          actionType: (s.actionType as StepAction) || "send_message",
          templateName: s.templateName,
          message: s.message,
          conditions: s.conditions,
        })),
      });
    }

    if (templateApproved) {
      // 4a. Template is ready — launch (or schedule) and enroll immediately.
      campaign = await launchCampaign({
        name: `${template.name}_Campaign`,
        targetTag: "",
        segmentId: savedSegment.id,
        templateName: savedTemplate.name,
        organizationId,
        delay: schedule.delay || 1,
        scheduledAt: schedule.scheduledAt || undefined,
        mediaType: savedTemplate.mediaType,
        mediaUrl: savedTemplate.mediaUrl || undefined,
        variables,
        leadQualifier: leadQualifier ?? null,
      });

      const enrolledCount = sequence
        ? await enrollSegmentContacts(organizationId, savedSegment.id, triggerTag)
        : 0;

      return {
        success: true,
        templateApproved: true,
        template: savedTemplate,
        segment: savedSegment,
        campaign,
        sequence: savedSequence,
        enrolledCount,
      };
    }

    // 4b. Template still awaiting Meta approval — park the campaign. The
    //     WhatsApp webhook (or the status poll) resumes it once approved, at
    //     which point the audience is enrolled into the follow-up sequence.
    const audience = await findTargetContacts(organizationId, "", undefined, savedSegment.id);
    campaign = await createCampaign({
      name: `${template.name}_Campaign`,
      targetTag: "",
      templateName: savedTemplate.name,
      mediaType: savedTemplate.mediaType,
      mediaUrl: savedTemplate.mediaUrl,
      variables: variables as unknown as object,
      delay: schedule.delay || 1,
      segmentId: savedSegment.id,
      sent: 0,
      delivered: 0,
      read: 0,
      clicked: 0,
      status: PENDING_TEMPLATE_STATUS,
      date: new Date().toISOString().split("T")[0],
      scheduledAt: schedule.scheduledAt ? new Date(schedule.scheduledAt) : null,
      organizationId,
      leadQualifier: (leadQualifier as unknown as object) ?? null,
    });

    return {
      success: true,
      templateApproved: false,
      template: savedTemplate,
      segment: savedSegment,
      campaign,
      sequence: savedSequence,
      pendingCount: audience.length,
    };
  } catch (applyErr) {
    // Compensating cleanup so a retry doesn't accumulate orphan records.
    if (campaign?.id) await repo.deleteCampaign(campaign.id).catch(() => {});
    if (savedSequence?.id) await repo.deleteSequence(savedSequence.id).catch(() => {});
    if (savedSegment?.id) await repo.deleteSegment(savedSegment.id).catch(() => {});
    throw applyErr;
  }
}
