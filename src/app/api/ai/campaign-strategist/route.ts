import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";
import { getGroqChatCompletion } from "@/shared/lib/groq";
import { createTemplate } from "@/features/templates/services/metaTemplateService";
import { createSegment } from "@/features/segments/services/segmentService";
import { launchCampaign } from "@/features/campaigns/services/broadcastService";
import { createSequence } from "@/features/sequences/services/sequenceService";
import { createCampaign, findTargetContacts } from "@/features/campaigns/repositories/campaignRepo";
import {
  enrollSegmentContacts,
  PENDING_TEMPLATE_STATUS,
} from "@/features/campaigns/services/strategistActivation";

interface CustomSessionUser {
  id: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, orgId } = body;

    if (!orgId) {
      return NextResponse.json({ error: "Missing organization ID (orgId)" }, { status: 400 });
    }

    const userId = (session.user as unknown as CustomSessionUser).id;
    const membership = await prisma.membership.findFirst({
      where: { userId, organizationId: orgId },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access forbidden. You do not belong to this workspace." },
        { status: 403 }
      );
    }

    // ─── ACTION: GENERATE ───
    if (action === "generate") {
      const { prompt } = body;
      if (!prompt) {
        return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
      }

      // Fetch organization and brand profile
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { brandProfile: true },
      });
      const brand = (org?.brandProfile as any) || {};
      const brandName = brand.name || "the business";
      const industry = brand.industry || "general";
      const tone = brand.toneOfVoice || "professional";

      // Query contacts to check for existing tags or active list
      const contacts = await prisma.contact.findMany({
        where: { organizationId: orgId },
        select: { tags: true, source: true },
        take: 20,
      });

      // Query already approved templates for this organization (local or shared)
      const approvedTemplates = await prisma.template.findMany({
        where: {
          OR: [
            { organizationId: orgId },
            { isShared: true }
          ],
          metaStatus: "approved"
        },
        select: {
          name: true,
          category: true,
          body: true,
          buttons: true,
          mediaType: true,
          mediaUrl: true
        }
      });

      const systemPrompt = `You are WappFlow AI Campaign Strategist. Your job is to draft a comprehensive WhatsApp campaign strategy based on the user's objective (e.g. "It's Diwali, I sell sarees").
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
   - "rules": Rules to resolve contacts. Must match WappFlow's SegmentRules schema:
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

      const aiResponse = await getGroqChatCompletion([
        { role: "system", content: systemPrompt },
        { role: "user", content: `Prompt: ${prompt}` },
      ]);

      const cleanJson = aiResponse
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      try {
        const strategy = JSON.parse(cleanJson);

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

        return NextResponse.json({ strategy });
      } catch (parseErr) {
        console.error("Failed to parse strategist strategy:", cleanJson);
        return NextResponse.json(
          { error: "AI returned an invalid JSON schema. Please try again." },
          { status: 502 }
        );
      }
    }

    // ─── ACTION: APPLY ───
    if (action === "apply") {
      const { template, segment, schedule, sequence } = body;

      if (!template || !segment || !schedule || !sequence) {
        return NextResponse.json({ error: "Missing strategy parts" }, { status: 400 });
      }

      // 1. Resolve Template. Reuse any existing template with this name (approved
      //    OR still pending) to avoid Meta "Duplicate template name" errors; only
      //    call Meta when there is no usable template yet.
      let savedTemplate;
      const existing = await prisma.template.findFirst({
        where: {
          OR: [{ organizationId: orgId }, { isShared: true }],
          name: template.name,
          metaStatus: { in: ["approved", "pending"] },
        },
      });

      if (existing) {
        savedTemplate = existing;
      } else {
        savedTemplate = await createTemplate({
          name: template.name,
          category: template.category || "Marketing",
          body: template.body,
          buttons: template.buttons || [],
          mediaType: template.mediaType || "none",
          mediaUrl: template.mediaUrl || null,
          organizationId: orgId,
        });
      }

      // If the resolved template (e.g. one adopted from Meta) is already rejected,
      // parking a campaign on it would wait forever — surface it instead.
      if (savedTemplate.metaStatus === "rejected") {
        return NextResponse.json(
          {
            error: `A template named "${savedTemplate.name}" was rejected by Meta. Please revise the copy or use a different name and try again.`,
          },
          { status: 400 }
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
          organizationId: orgId,
        });

        // 3. Create the follow-up Sequence (definition only; enrollment happens
        //    when the campaign actually broadcasts and opens a 24h session).
        const triggerTag = sequence.triggerConfig?.tag || `${template.name}_trigger`;
        savedSequence = await createSequence({
          name: sequence.name,
          trigger: "tag_added",
          triggerConfig: { tag: triggerTag },
          organizationId: orgId,
          segmentId: savedSegment.id,
          steps: sequence.steps.map((s: any, idx: number) => ({
            order: idx,
            delayMinutes: s.delayMinutes || 0,
            actionType: s.actionType || "send_message",
            templateName: s.templateName || null,
            message: s.message || null,
            conditions: s.conditions || null,
          })),
        });

        if (templateApproved) {
          // 4a. Template is ready — launch (or schedule) and enroll immediately.
          campaign = await launchCampaign({
            name: `${template.name}_Campaign`,
            targetTag: "",
            segmentId: savedSegment.id,
            templateName: savedTemplate.name,
            organizationId: orgId,
            delay: schedule.delay || 1,
            scheduledAt: schedule.scheduledAt || undefined,
            mediaType: savedTemplate.mediaType,
            mediaUrl: savedTemplate.mediaUrl || undefined,
            variables,
          });

          const enrolledCount = await enrollSegmentContacts(orgId, savedSegment.id, triggerTag);

          return NextResponse.json({
            success: true,
            templateApproved: true,
            template: savedTemplate,
            segment: savedSegment,
            campaign,
            sequence: savedSequence,
            enrolledCount,
          });
        }

        // 4b. Template still awaiting Meta approval — park the campaign. The
        //     WhatsApp webhook (or the status poll) resumes it once approved, at
        //     which point the audience is enrolled into the follow-up sequence.
        const audience = await findTargetContacts(orgId, "", undefined, savedSegment.id);
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
          organizationId: orgId,
        });

        return NextResponse.json({
          success: true,
          templateApproved: false,
          template: savedTemplate,
          segment: savedSegment,
          campaign,
          sequence: savedSequence,
          pendingCount: audience.length,
        });
      } catch (applyErr) {
        // Compensating cleanup so a retry doesn't accumulate orphan records.
        if (campaign?.id) await prisma.campaign.delete({ where: { id: campaign.id } }).catch(() => {});
        if (savedSequence?.id) await prisma.sequence.delete({ where: { id: savedSequence.id } }).catch(() => {});
        if (savedSegment?.id) await prisma.segment.delete({ where: { id: savedSegment.id } }).catch(() => {});
        throw applyErr;
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("AI Campaign Strategist API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
