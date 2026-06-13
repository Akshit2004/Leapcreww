/**
 * campaignStrategistService.ts — AI Campaign Strategist orchestration.
 *
 * "generate" drafts a full campaign strategy (template, segment, schedule,
 * 3-step sequence) from a free-text objective. "apply" persists that strategy
 * by creating/reusing a Template, Segment, Sequence and Campaign, with
 * compensating cleanup if any step after the segment fails.
 */
import { ApiError } from "@/shared/lib/api";
import { getGroqChatCompletion } from "@/shared/lib/groq";
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

  // Query contacts to check for existing tags or active list
  const contacts = await repo.findContactsForStrategist(organizationId, 20);

  // Query already approved templates for this organization (local or shared)
  const approvedTemplates = await repo.findApprovedTemplates(organizationId);

  const systemPrompt = `You are LeapCreww AI Campaign Strategist. Your job is to draft a comprehensive WhatsApp campaign strategy based on the user's objective (e.g. "It's Diwali, I sell sarees").
Your response MUST be a single, valid JSON object containing a template selection/draft, a target segment, a campaign schedule, and a 3-step sequence.

Current Date/Time (UTC): ${new Date().toISOString()}

Organization profile:
- Brand Name: ${brandName}
- Industry: ${industry}
- Tone of Voice: ${tone}

Available CRM taxonomy tags/fields:
${JSON.stringify(contacts.slice(0, 10), null, 2)}

List of ALREADY APPROVED WhatsApp message templates for this organization:
${JSON.stringify(approvedTemplates, null, 2)}

You MUST decide and generate:
1. "templateExists": Set to true IF AND ONLY IF one of the ALREADY APPROVED templates listed above is a perfect fit or a very good match for the user's campaign objective. If no approved template is a good fit, set this to false.
2. "template": The WhatsApp template.
   - If "templateExists" is true: You MUST select the best-matching template from the ALREADY APPROVED list above. The "name", "category", "body", "buttons", "mediaType", and "mediaUrl" MUST match the selected approved template EXACTLY.
   - If "templateExists" is false: You MUST draft a new template that would be ideal for this campaign:
     - "name": lowercase, alphanumeric, underscore only (e.g., "diwali_saree_promo_1").
     - "category": "Marketing"
     - "mediaType": MUST be "none". (Media-header templates need a sample asset the strategist cannot supply, so always use "none".)
     - "body": Text message under 1024 characters. Use bold *text* to highlight offers. To personalize with the recipient's name, put a single Meta placeholder "{{1}}" exactly where the name goes (e.g., "Hi {{1}}, ..."). Do NOT use square-bracket placeholders like [Lead Name].
     - "variables": An ordered array describing each {{n}} placeholder used in the body. For the contact's name use {"type":"contact_field","value":"name"}. If the body uses no placeholders, return an empty array [].
     - "buttons": Array of up to 3 string button text labels (e.g., ["Shop Collection", "Talk to Us"]).
3. "segment": A target segment to select matching contacts.
   - "name": Concise name (e.g., "Saree Buyers & Leads").
   - "rules": Rules to resolve contacts. Must match LeapCreww's SegmentRules schema:
     {
       "all": [
         { "field": "tags" | "status" | "source", "op": "in" | "eq", "value": "diwali_promo" | "Active" }
       ]
     }
     Prefer targeting active tags or using a tag matching the campaign category. You can also generate a new tag (e.g. "saree_interest") that matching contacts will be tagged with.
4. "schedule":
   - "reasoning": A brief explanation of the timing choice.
   - "delay": spacing delay between messages in seconds (1 to 3).
   - "scheduledAt": Suggested ISO timestamp for launch (recommend a logical upcoming date/time).
5. "sequence": A 3-step drip sequence to enroll leads into for follow-ups.
   - "name": Sequence name (e.g., "Diwali Saree Drip D-3").
   - "trigger": "tag_added"
   - "triggerConfig": { "tag": "diwali_promo_drip" }
   - "steps": 3 steps:
     - For "send_message" steps, personalize the copy with "{{contact.name}}" (this exact token is resolved at send time). Do NOT use [Lead Name] or {{1}}.
     - Step 1 (Immediate follow-up): delayMinutes = 5. actionType = "send_message" or "send_template". If send_message, include "message" field. If send_template, include "templateName".
     - Step 2 (Day 1 follow-up): delayMinutes = 1440. actionType = "send_message" with a copy text message reminding them.
     - Step 3 (Day 2 follow-up): delayMinutes = 2880. actionType = "send_message" with a final promo/urgency message.

Return ONLY a valid JSON object matching the schema below. Do not wrap in markdown or backticks.
Schema:
{
  "templateExists": true,
  "template": {
    "name": "...",
    "category": "Marketing",
    "mediaType": "none",
    "body": "...",
    "variables": [ { "type": "contact_field", "value": "name" } ],
    "buttons": ["..."]
  },
  "segment": {
    "name": "...",
    "rules": { "all": [ { "field": "...", "op": "...", "value": "..." } ] }
  },
  "schedule": {
    "reasoning": "...",
    "delay": 1,
    "scheduledAt": "..."
  },
  "sequence": {
    "name": "...",
    "trigger": "tag_added",
    "triggerConfig": { "tag": "..." },
    "steps": [
      { "order": 0, "delayMinutes": 5, "actionType": "send_message", "message": "..." },
      { "order": 1, "delayMinutes": 1440, "actionType": "send_message", "message": "..." },
      { "order": 2, "delayMinutes": 2880, "actionType": "send_message", "message": "..." }
    ]
  }
}`;

  let aiResponse: string;
  try {
    aiResponse = await getGroqChatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Prompt: ${prompt}` },
    ]);
  } catch (err) {
    console.error("[ai] Campaign strategist Groq call failed:", err);
    throw new ApiError("AI strategist is currently unavailable. Please try again later.", 502);
  }

  const cleanJson = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();

  let strategy: CampaignStrategy;
  try {
    strategy = JSON.parse(cleanJson);
  } catch {
    console.error("Failed to parse strategist strategy:", cleanJson);
    throw new ApiError("AI returned an invalid JSON schema. Please try again.", 502);
  }

  sanitizeStrategyPlaceholders(strategy);

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
    }
  }

  return strategy;
}

export interface ApplyStrategyInput {
  template: StrategyTemplate;
  segment: StrategySegment;
  schedule: StrategySchedule;
  sequence: StrategySequence;
}

export type ApplyStrategyResult =
  | {
      success: true;
      templateApproved: true;
      template: unknown;
      segment: { id: string };
      campaign: unknown;
      sequence: { id: string };
      enrolledCount: number;
    }
  | {
      success: true;
      templateApproved: false;
      template: unknown;
      segment: { id: string };
      campaign: unknown;
      sequence: { id: string };
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
  const { template, segment, schedule, sequence } = input;

  if (!template || !segment || !schedule || !sequence) {
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

    // 3. Create the follow-up Sequence (definition only; enrollment happens
    //    when the campaign actually broadcasts and opens a 24h session).
    const triggerTag = sequence.triggerConfig?.tag || `${template.name}_trigger`;
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
      });

      const enrolledCount = await enrollSegmentContacts(organizationId, savedSegment.id, triggerTag);

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
