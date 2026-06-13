/**
 * templateGenerationService.ts — Drafts a WhatsApp promotional message body
 * from a free-text topic, grounded in the org's brand profile.
 */
import { ApiError } from "@/shared/lib/api";
import { getGroqChatCompletion } from "@/shared/lib/groq";
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

  const systemPrompt = `You are an expert WhatsApp marketing copywriter for ${brandName}, a business in the ${industry} industry.
Your brand's tone of voice is: ${tone}.

Write a single WhatsApp promotional message body based on the user's topic. Rules:
1. Sound like ${brandName} — reflect the brand tone, not generic AI copy.
2. ${linkClause}
3. Keep the message under 1024 characters.
4. You may use WhatsApp formatting: *bold*, _italics_, ~strikethrough~.
5. Do NOT use template variables like {{1}} unless the topic clearly needs personalization.
6. No abusive, spammy, or excessively pushy claims. Keep urgency professional.

Return ONLY the raw message body text. Do not include explanations, headers, quotation marks, or markdown code fences.`;

  let resultString: string;
  try {
    resultString = await getGroqChatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Topic / offer: ${topic}` },
    ]);
  } catch {
    throw new ApiError("AI features not configured", 503);
  }

  const generatedText = (resultString || "")
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```$/i, "")
    .trim();

  if (!generatedText) {
    throw new ApiError("AI returned an empty response. Please try again.", 502);
  }

  return generatedText;
}
