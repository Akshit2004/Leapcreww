/**
 * templateGenerationService.ts — Drafts a WhatsApp promotional message body
 * from a free-text topic, grounded in the org's brand profile.
 */
import { ApiError } from "@/shared/lib/api";
import { getGroqChatCompletionWithFallback } from "@/shared/lib/groq";
import * as repo from "../repositories/aiRepo";

interface BrandProfile {
  name?: string;
  industry?: string;
  toneOfVoice?: string;
}

/** Generate a single WhatsApp message body for the given topic/offer. */
export async function generateTemplateBody(organizationId: string, topic: string, url?: string): Promise<string> {
  // Pull the brand profile straight from the DB — never trust a brand profile
  // passed from the client.
  const org = await repo.findBrandProfile(organizationId);
  const brand = (org?.brandProfile as BrandProfile | null) || {};
  const brandName = brand.name?.trim() || "the business";
  const industry = brand.industry?.trim() || "general";
  const tone = brand.toneOfVoice?.trim() || "professional and friendly";

  const linkClause = url
    ? `You must naturally include this exact link in the message: ${url}.`
    : "Do not invent or include any links.";

  const systemPrompt = `You are a WhatsApp copywriter for ${brandName} (${industry}). Tone: ${tone}.

This is a PERSONAL 1-to-1 WhatsApp message sent to ONE individual — NOT a mass announcement, NOT a newsletter.

Task: Write the body of a WhatsApp message template for the given offer.

STRICT FORMAT RULES — violating any rule means the message is rejected:
1. MUST start with exactly: Hi {{1}}, — ({{1}} becomes the recipient's first name)
2. NEVER start with "We", "I'm", "We're", "Our", "This is" — these are announcement openers, not personal messages
3. First sentence = the REWARD or BENEFIT directly stated — e.g. "earn ₹100 extra" not "if you sell X you'll get Y"
4. Under 160 characters total (including "Hi {{1}}, ")
5. NO "reply", "type", "click", "tap here" — Meta rejects these
6. ${linkClause}

GOOD example (offer: "sell commercial vehicle, get ₹100 extra"):
Hi {{1}}, earn ₹100 extra on every commercial vehicle sale! Tag it as 'Commercial' to claim your bonus.

BAD examples (never write these):
✗ We're excited to announce a new offer for agents...
✗ Hi {{1}}, if you sell a commercial vehicle, you will get ₹100.
✗ Dear Agent, we are launching a campaign...

Return ONLY the message text. Nothing else.`;

  let resultString: string;
  try {
    resultString = await getGroqChatCompletionWithFallback(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Topic / offer: ${topic}` },
      ],
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant"
    );
  } catch {
    throw new ApiError("AI features not configured", 503);
  }

  let generatedText = (resultString || "")
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```$/i, "")
    // Strip leading quotation marks the model sometimes adds
    .replace(/^["'`]|["'`]$/g, "")
    .trim();

  if (!generatedText) {
    throw new ApiError("AI returned an empty response. Please try again.", 502);
  }

  // Safety: force Hi {{1}}, prefix if model ignored the rule
  if (!generatedText.startsWith("Hi {{1}},")) {
    // Strip any "Hi [Name]," or "Dear Agent," opener the model may have used
    generatedText = generatedText.replace(/^(hi\s+\S+,?\s*|dear\s+\S+,?\s*)/i, "").trim();
    generatedText = `Hi {{1}}, ${generatedText}`;
  }

  // Trim to 160 chars at a word boundary
  if (generatedText.length > 160) {
    generatedText = generatedText.slice(0, 157).replace(/\s+\S*$/, "") + "…";
  }

  return generatedText;
}

/** Generate 3 follow-up sequence messages for a campaign. Runs in parallel. */
export async function generateSequenceStepMessages(
  organizationId: string,
  topic: string
): Promise<[string, string, string]> {
  const org = await repo.findBrandProfile(organizationId);
  const brand = (org?.brandProfile as BrandProfile | null) || {};
  const brandName = brand.name?.trim() || "the business";
  const tone = brand.toneOfVoice?.trim() || "professional and friendly";

  const STEP_PROMPTS = [
    `Write a SHORT WhatsApp follow-up message (sent 5 minutes after the main campaign). It must:
- Start with "{{contact.name}}," (no "Hi")
- Name the EXACT reward/offer from the topic in the first 5 words
- Tell them the ONE action to take right now
- Max 100 characters
- NO: "Thanks for your interest", "checking in", "did you see", "just following up", conditional "if you" phrases
Topic: ${topic}
Example: "{{contact.name}}, your ₹100 commercial vehicle bonus is unclaimed — tag it as 'Commercial' now!"
Return ONLY the message text.`,

    `Write a SHORT WhatsApp follow-up message (sent 24 hours after the main campaign, Day 1 reminder). It must:
- Start with "{{contact.name}}," (no "Hi")
- Mention the specific reward/offer with a NEW angle — focus on HOW EASY or QUICK it is to claim
- Max 100 characters
- NO generic openers, NO "if you" conditionals
Topic: ${topic}
Example: "{{contact.name}}, 30 seconds is all it takes — tag a commercial vehicle and earn ₹100 extra!"
Return ONLY the message text.`,

    `Write a SHORT WhatsApp follow-up message (sent 48 hours after main campaign, final urgency). It must:
- Start with "{{contact.name}}," (no "Hi")
- Create URGENCY — "last chance", "closing soon", "today only" — specific to the reward
- Max 100 characters
- NO generic "don't miss out" without context, NO "if you" conditionals
Topic: ${topic}
Example: "{{contact.name}}, last call — the ₹100 commercial vehicle bonus closes tonight. Tag it now!"
Return ONLY the message text.`,
  ];

  const results = await Promise.all(
    STEP_PROMPTS.map((stepPrompt) =>
      getGroqChatCompletionWithFallback(
        [
          { role: "system", content: `You are a WhatsApp copywriter for ${brandName}. Tone: ${tone}. Write ONLY the requested message — no preamble, no quotes, no markdown.` },
          { role: "user", content: stepPrompt },
        ],
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        { maxTokens: 150, temperature: 0.3 }
      ).then((r) => r.replace(/^["']|["']$/g, "").trim())
    )
  );

  return results as [string, string, string];
}
