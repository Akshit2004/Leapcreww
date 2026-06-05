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

/** Generate ad creative copy with Groq. Returns a structured creative. */
export async function generateCreative(req: AdCreativeRequest): Promise<AdCreative> {
  const prompt = [
    {
      role: "system",
      content:
        "You are a performance marketer. Return ONLY JSON with keys headline, primaryText, imagePrompt. " +
        "headline <=40 chars, primaryText <=125 chars, imagePrompt is a vivid image description.",
    },
    {
      role: "user",
      content: `Product: ${req.product}\nAudience: ${req.audience ?? "general"}\nOffer: ${req.offer ?? "none"}\nTone: ${req.tone ?? "energetic"}`,
    },
  ];
  const raw = await getGroqChatCompletion(prompt);
  try {
    const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    return JSON.parse(json) as AdCreative;
  } catch {
    // Fallback if the model didn't return clean JSON.
    return { headline: req.product, primaryText: raw.slice(0, 125), imagePrompt: req.product };
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
