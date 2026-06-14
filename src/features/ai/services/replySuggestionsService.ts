/**
 * replySuggestionsService.ts — Drafts 3 suggested inbox replies grounded in
 * recent chat history, the org's product catalog and brand profile.
 */
import { getGroqChatCompletion } from "@/shared/lib/groq";
import * as repo from "../repositories/aiRepo";

interface BrandProfile {
  name?: string;
  industry?: string;
  toneOfVoice?: string;
}

/** Returns exactly 3 suggested replies. Never throws — degrades to a static fallback. */
export async function generateReplySuggestions(organizationId: string, contactId: string): Promise<string[]> {
  // 1. Recent chat history (chronological order)
  const chatHistory = await repo.findRecentMessages(contactId, 8);

  // 2. Product catalog
  const products = await repo.findActiveProducts(organizationId, 12);

  // 3. Brand profile
  const org = await repo.findBrandProfile(organizationId);
  const brand = (org?.brandProfile as BrandProfile | null) || {};
  const brandName = brand.name || "the business";
  const industry = brand.industry || "general";
  const tone = brand.toneOfVoice || "professional and friendly";

  const fallback = [
    `Hi! Thank you for reaching out to ${brandName}. How can I assist you today?`,
    `Would you like to hear about our latest catalog offers?`,
    `Let me check that detail for you right away.`,
  ];

  const productCatalogText = products.length > 0
    ? products.map((p) => `- ${p.name} (Price: ₹${(p.price / 100).toFixed(2)}, SKU: ${p.sku || "N/A"}): ${p.description}`).join("\n")
    : "No products currently listed in the catalog.";

  const systemPrompt = `You are an inbox assistant for LeapCreww CRM. Your goal is to draft exactly 3 brief, helpful suggested replies that a customer support agent can send to the user.
Ground your suggestions strictly in:
1. Recent chat messages.
2. The product catalog provided below (if empty, do not suggest products).
3. The brand guidelines of the organization.

Organization info:
- Brand: ${brandName}
- Industry: ${industry}
- Tone: ${tone}

Product catalog:
${productCatalogText}

Rules for response:
- Output exactly 3 alternative suggestions.
- Keep each suggestion very short (1-2 sentences), natural and friendly, suitable for WhatsApp.
- Output ONLY a valid JSON array of strings, for example:
["suggestion 1", "suggestion 2", "suggestion 3"]
- Do not output markdown, code blocks, or any surrounding text.`;

  const chatHistoryText = chatHistory.length > 0
    ? chatHistory.map((m) => `${m.sender === "user" ? "Customer" : "Agent"}: ${m.text}`).join("\n")
    : "No messages yet. The conversation has just started.";

  try {
    const response = await getGroqChatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Recent chat logs:\n${chatHistoryText}` },
    ], "llama-3.1-8b-instant");

    const cleanJson = response.replace(/```json/g, "").replace(/```/g, "").trim();
    const suggestions = JSON.parse(cleanJson);
    if (Array.isArray(suggestions) && suggestions.length > 0) {
      return suggestions;
    }
    return fallback;
  } catch (err) {
    // Missing GROQ_API_KEY, transient Groq failure, or an invalid JSON response.
    console.error("[ai] Reply suggestions Groq call failed:", err);
    return fallback;
  }
}
