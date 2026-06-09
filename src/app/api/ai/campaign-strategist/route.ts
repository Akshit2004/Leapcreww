import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";
import { getGroqChatCompletion } from "@/shared/lib/groq";
import { createTemplate } from "@/features/templates/services/metaTemplateService";
import { createSegment } from "@/features/segments/services/segmentService";
import { launchCampaign } from "@/features/campaigns/services/broadcastService";
import { createSequence, enrollOnTrigger } from "@/features/sequences/services/sequenceService";

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

      const systemPrompt = `You are WappFlow AI Campaign Strategist. Your job is to draft a comprehensive WhatsApp campaign strategy based on the user's objective (e.g. "It's Diwali, I sell sarees").
Your response MUST be a single, valid JSON object containing a template, a target segment, a campaign schedule, and a 3-step sequence.

Current Date/Time (UTC): ${new Date().toISOString()}

Organization profile:
- Brand Name: ${brandName}
- Industry: ${industry}
- Tone of Voice: ${tone}

Available CRM taxonomy tags/fields:
${JSON.stringify(contacts.slice(0, 10), null, 2)}

You MUST generate:
1. "template": A WhatsApp template to register.
   - "name": lowercase, alphanumeric, underscore only (e.g., "diwali_saree_promo_1").
   - "category": "Marketing"
   - "mediaType": "none" or "image".
   - "body": Text message under 1024 characters. Use bold *text* to highlight offers. Suggest values like "[Lead Name]" for name variables.
   - "buttons": Array of up to 3 string button text labels (e.g., ["Shop Collection", "Talk to Us"]).
2. "segment": A target segment to select matching contacts.
   - "name": Concise name (e.g., "Saree Buyers & Leads").
   - "rules": Rules to resolve contacts. Must match WappFlow's SegmentRules schema:
     {
       "all": [
         { "field": "tags" | "status" | "source", "op": "in" | "eq", "value": "diwali_promo" | "Active" }
       ]
     }
     Prefer targeting active tags or using a tag matching the campaign category. You can also generate a new tag (e.g. "saree_interest") that matching contacts will be tagged with.
3. "schedule":
   - "reasoning": A brief explanation of the timing choice.
   - "delay": spacing delay between messages in seconds (1 to 3).
   - "scheduledAt": Suggested ISO timestamp for launch (recommend a logical upcoming date/time).
4. "sequence": A 3-step drip sequence to enroll leads into for follow-ups.
   - "name": Sequence name (e.g., "Diwali Saree Drip D-3").
   - "trigger": "tag_added"
   - "triggerConfig": { "tag": "diwali_promo_drip" }
   - "steps": 3 steps:
     - Step 1 (Immediate follow-up): delayMinutes = 5. actionType = "send_message" or "send_template". If send_message, include "message" field. If send_template, include "templateName".
     - Step 2 (Day 1 follow-up): delayMinutes = 1440. actionType = "send_message" with a copy text message reminding them.
     - Step 3 (Day 2 follow-up): delayMinutes = 2880. actionType = "send_message" with a final promo/urgency message.

Return ONLY a valid JSON object matching the schema below. Do not wrap in markdown or backticks.
Schema:
{
  "template": {
    "name": "...",
    "category": "Marketing",
    "mediaType": "none",
    "body": "...",
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

      // 1. Create Template
      const savedTemplate = await createTemplate({
        name: template.name,
        category: template.category || "Marketing",
        body: template.body,
        buttons: template.buttons || [],
        mediaType: template.mediaType || "none",
        mediaUrl: template.mediaUrl || null,
        organizationId: orgId,
      });

      // 2. Create Segment
      const savedSegment = await createSegment({
        name: segment.name,
        rules: segment.rules,
        organizationId: orgId,
      });

      // 3. Create Campaign
      const targetTagVal = segment.rules?.all?.[0]?.value || "all";
      const campaign = await launchCampaign({
        name: `${template.name}_Campaign`,
        targetTag: "",
        segmentId: savedSegment.id,
        templateName: savedTemplate.name,
        organizationId: orgId,
        delay: schedule.delay || 1,
        scheduledAt: schedule.scheduledAt || undefined,
        mediaType: savedTemplate.mediaType,
        mediaUrl: savedTemplate.mediaUrl || undefined,
        variables: [],
      });

      // 4. Create Sequence
      // We will set the trigger tag to sequence.triggerConfig.tag
      const triggerTag = sequence.triggerConfig?.tag || `${template.name}_trigger`;
      const savedSequence = await createSequence({
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

      // 5. Enroll Contacts: Find contacts matching the segment rules
      // Tag them with the trigger tag which triggers sequence enrollment
      const { resolveSegmentContacts } = await import("@/features/segments/services/segmentService");
      const matchedContacts = await resolveSegmentContacts(savedSegment.id);

      for (const contact of matchedContacts) {
        if (!contact.tags.includes(triggerTag)) {
          const newTags = [...contact.tags, triggerTag];
          await prisma.contact.update({
            where: { id: contact.id },
            data: { tags: newTags },
          });
          // Enroll
          await enrollOnTrigger(orgId, "tag_added", contact.id);
        }
      }

      return NextResponse.json({
        success: true,
        template: savedTemplate,
        segment: savedSegment,
        campaign,
        sequence: savedSequence,
        enrolledCount: matchedContacts.length,
      });
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
