/** lead-qualifier/route.ts — AI-generated LeadQualifierConfig from a campaign template body. */
import { route, ok, body, requireOrg, requireFields, ApiError } from "@/shared/lib/api";
import { getGroqChatCompletion } from "@/shared/lib/groq";
import type { LeadQualifierConfig } from "@/features/campaigns/lib/leadQualifier";

interface LeadQualifierInput {
  templateBody: string;
  templateName: string;
  orgId: string;
}

const SYSTEM_PROMPT = `You are a lead qualification expert for WhatsApp marketing. Given a campaign message, generate a concise lead qualifier configuration.

The config must be valid JSON matching this exact schema:
{
  "enabled": true,
  "triggerKeyword": "interested",
  "questions": [
    {
      "id": "q1",
      "text": "What is your monthly budget for this?",
      "options": ["Under ₹50,000", "₹50,000 – ₹2 Lakh", "Above ₹2 Lakh"],
      "attributeKey": "lead_budget",
      "disqualifyOn": ["Under ₹50,000"]
    },
    {
      "id": "q2",
      "text": "When are you looking to get started?",
      "options": ["This month", "1–3 months", "Just exploring"],
      "attributeKey": "lead_timeline",
      "disqualifyOn": ["Just exploring"]
    },
    {
      "id": "q3",
      "text": "What is your primary goal?",
      "options": ["Grow sales", "Reduce support cost", "Brand awareness"],
      "attributeKey": "lead_goal"
    }
  ],
  "qualifiedTag": "qualified-lead",
  "disqualifiedTag": "not-interested"
}

Rules:
- 2–4 questions, no more
- Each question has exactly 3 options — keep options SHORT (max 5 words each, no emojis)
- attributeKey must be snake_case lowercase
- disqualifyOn only on budget/timeline questions where a low-intent answer exists
- qualifiedTag and disqualifiedTag must be lowercase-hyphenated
- Return ONLY the JSON object, no markdown, no explanation`;

export const POST = route(async (req) => {
  const input = await body<LeadQualifierInput>(req);
  requireFields(input, ["templateBody", "templateName", "orgId"]);

  await requireOrg(input.orgId, "ADMIN");

  const userPrompt = `Campaign template name: "${input.templateName}"\n\nTemplate body:\n${input.templateBody}`;

  let config: LeadQualifierConfig;
  try {
    const raw = await getGroqChatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      undefined,
      { temperature: 0.4, maxTokens: 1024 }
    );
    config = JSON.parse(raw.trim()) as LeadQualifierConfig;
  } catch {
    // Degrade gracefully: return a sensible default so the caller isn't blocked
    // when GROQ_API_KEY is absent or the model returns malformed JSON.
    throw new ApiError("AI generation failed — please try again or build the qualifier manually.", 503);
  }

  return ok({ config });
});
