/**
 * ndrAnalystService.ts — Groq-powered intent classifier for NDR replies.
 *
 * Replaces the rigid keyword token set in ndrService.ts with a small LLM call
 * that understands natural language ("I wasn't home", "wrong pin code", "kal
 * aana", "rakh lo wapas"). Falls back to "unknown" on parse failure.
 *
 * Categories (maps directly to the reply-handler actions in ndrService.ts):
 *   confirm   — customer is available, wants delivery now
 *   reschedule — wants to pick a new date or time
 *   address   — wants to update/correct the delivery address
 *   cancel    — wants to cancel / return the order
 *   unknown   — could not determine intent (falls through to autoresponder)
 */

import { getGroqChatCompletionWithFallback } from "@/shared/lib/groq";

export type NdrIntent = "confirm" | "reschedule" | "address" | "cancel" | "unknown";

export interface NdrAnalysis {
  intent: NdrIntent;
  /** Raw first sentence to echo back in the reply for confirmation. */
  summary: string;
}

const SYSTEM_PROMPT = `You are an intent classifier for customer WhatsApp replies to a failed delivery alert.
Classify the customer's message into exactly one of these intents:
  "confirm"    — they are available / want delivery to proceed now
  "reschedule" — they want delivery on a different date or time
  "address"    — they want to change or correct the delivery address
  "cancel"     — they want to cancel the order / return it
  "unknown"    — intent is unclear

Return ONLY valid JSON: {"intent": "<one of the five>", "summary": "<3-8 word summary>"}
No explanation, no markdown.`;

export async function analyseNdrReply(text: string): Promise<NdrAnalysis> {
  const raw = await getGroqChatCompletionWithFallback(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    "llama-3.1-8b-instant",
    "llama-3.1-8b-instant",
    { temperature: 0.1, maxTokens: 60, jsonMode: true },
  );

  try {
    const parsed = JSON.parse(raw) as { intent?: string; summary?: string };
    const validIntents: NdrIntent[] = ["confirm", "reschedule", "address", "cancel", "unknown"];
    const intent: NdrIntent = validIntents.includes(parsed.intent as NdrIntent)
      ? (parsed.intent as NdrIntent)
      : "unknown";
    return { intent, summary: parsed.summary || text.slice(0, 40) };
  } catch {
    return { intent: "unknown", summary: text.slice(0, 40) };
  }
}
