/**
 * adService.ts — Click-to-WhatsApp Ads (T-01).
 *
 * Shipping order (see docs/PRODUCT_COMPARISON_AISENSY.md):
 *   1. AI creative generator (live now — reuses Groq).
 *   2. Ad CRUD + lead attribution from inbound CTWA referrals (live now).
 *   3. Live ad publishing via Meta Marketing API (TODO — needs ads_management
 *      permission + App Review). See publishAd() below.
 */
import { getGroqChatCompletion } from "@/shared/lib/groq";
import { ApiError } from "@/shared/lib/api";
import * as repo from "../repositories/adRepo";
import type { AdCreative, AdCreativeRequest, CreateAdInput } from "../types";

export function listAds(organizationId: string) {
  return repo.listAds(organizationId);
}

export function createAd(input: CreateAdInput) {
  return repo.createAd({
    headline: input.headline,
    primaryText: input.primaryText,
    imageUrl: input.imageUrl,
    welcomeTemplate: input.welcomeTemplate,
    adCampaignId: input.adCampaignId,
    organizationId: input.organizationId,
  });
}

interface BrandProfile {
  name?: string;
  industry?: string;
  toneOfVoice?: string;
}

/** Generate ad creative copy with Groq. Returns a structured creative. */
export async function generateCreative(req: AdCreativeRequest): Promise<AdCreative> {
  const org = await repo.getOrganizationBrandProfile(req.orgId);
  const brand = (org?.brandProfile as BrandProfile | null) || {};
  const brandName = brand.name?.trim() || "the business";
  const industry = brand.industry?.trim() || "general";
  const tone = brand.toneOfVoice?.trim() || "professional and friendly";

  const prompt = [
    {
      role: "system",
      content: `You are an expert Facebook and Instagram Ad copywriter for ${brandName}, a business in the ${industry} industry.
Your brand's tone of voice is: ${tone}.

Based on the user's topic or offer, write high-converting ad copy and suggest an image prompt for a Click-to-WhatsApp ad.
Rules:
1. Sound like ${brandName} — reflect the brand tone.
2. The ad is meant to drive users to click a "Send WhatsApp Message" button.
3. Keep the primary text engaging and under 300 characters if possible.
4. Keep the headline punchy and under 40 characters.
5. Create a descriptive prompt for an AI image generator (like Midjourney or DALL-E) that would make a great visual for this ad.

You MUST respond with ONLY a valid JSON object matching this exact schema:
{
  "headline": "...",
  "primaryText": "...",
  "imagePrompt": "..."
}
Do not include any other text, markdown formatting, or code fences around the JSON.`,
    },
    {
      role: "user",
      content: `Topic / offer: ${req.topic}`,
    },
  ];

  const resultString = await getGroqChatCompletion(prompt);
  const generatedText = (resultString || "")
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```$/i, "")
    .trim();

  if (!generatedText) {
    throw new ApiError("AI returned an empty response. Please try again.", 502);
  }

  try {
    const parsedJson = JSON.parse(generatedText);
    return parsedJson as AdCreative;
  } catch (parseError) {
    console.error("Failed to parse JSON from AI output:", generatedText);
    throw new ApiError("AI returned an invalid format. Please try again.", 502);
  }
}

/** Attribute an inbound CTWA lead to its ad (called from the WhatsApp webhook). */
export async function attributeLead(organizationId: string, ctwaClid: string) {
  const ad = await repo.findByCtwaClid(organizationId, ctwaClid);
  if (ad) await repo.incrementLeads(ad.id);
  return ad;
}

/** TODO(T-01): publish to Meta Marketing API (act_<id>/ads + adcreatives). */
export async function publishAd(): Promise<never> {
  throw new Error("publishAd not implemented: wire Meta Marketing API in shared/lib/meta-ads.ts");
}
