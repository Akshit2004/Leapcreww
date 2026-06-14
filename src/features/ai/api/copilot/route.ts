import { route, body, requireOrg, requireFields, ok, ApiError } from "@/shared/lib/api";
import { getGroqChatCompletion } from "@/shared/lib/groq";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

interface CopilotBody {
  orgId: string;
  messages: CopilotMessage[];
}

interface CopilotQuestion {
  type: "question";
  text: string;
  suggestions: string[];
}

interface CopilotAction {
  type: "action";
  action: "campaign" | "automation" | "chatbot" | "template";
  params: { prompt?: string };
  summary: string;
}

type CopilotResponse = CopilotQuestion | CopilotAction;

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are LeapCreww AI Copilot — a WhatsApp marketing assistant. Understand what the user wants and either ask one short clarifying question OR decide on an action. Never ask more than 2 questions total before deciding.

Available actions:
- campaign: One-time message blast to contacts (needs: what to send + who gets it)
- automation: Trigger-based auto-messages (fires on events: new contact, cart abandoned, tag added)
- chatbot: Build a conversational flow that replies to incoming WhatsApp messages
- template: Create a Meta-approved WhatsApp message template

Decision guide:
- "send", "blast", "message everyone", "offer", "discount", "promo", "announce", "sale", "launch" → campaign
- "auto", "trigger", "when someone", "abandoned cart", "new customer", "follow-up automatically", "sequence" → automation
- "chatbot", "reply", "respond to", "bot", "handle messages", "incoming" → chatbot
- "template", "draft a message", "create format" (without clear send intent) → template

Rules:
1. If intent is clear from the first message → decide immediately, don't ask questions
2. Ask at most 1-2 short follow-up questions before acting
3. Keep questions casual and conversational (1 sentence max)
4. Always provide 2-3 suggestion chips for questions
5. For action=campaign, set params.prompt to a complete brief: who the audience is, what the offer/message is, any timing preferences mentioned

ALWAYS respond with valid JSON only — no markdown, no backticks, no extra text.
Question format: {"type":"question","text":"your question","suggestions":["Option A","Option B","Option C"]}
Action format: {"type":"action","action":"campaign","params":{"prompt":"full brief here"},"summary":"one sentence describing what you will build"}`;

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/** POST /api/ai/copilot — conversational intent routing for the AI Copilot. */
export const POST = route(async (req) => {
  const payload = await body<CopilotBody>(req);
  requireFields(payload, ["orgId", "messages"]);

  const { orgId, messages } = payload;

  // Auth: any logged-in org member may use the copilot.
  await requireOrg(orgId, "AGENT");

  // Validate that messages is a non-empty array of the right shape.
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ApiError("messages must be a non-empty array", 400);
  }
  for (const msg of messages) {
    if (
      typeof msg !== "object" ||
      msg === null ||
      (msg.role !== "user" && msg.role !== "assistant") ||
      typeof msg.content !== "string"
    ) {
      throw new ApiError(
        'Each message must have role "user" | "assistant" and a string content',
        400
      );
    }
  }

  // Build the message list: system prompt prepended to conversation history.
  const groqMessages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Call Groq. Degrade gracefully — never crash the request path.
  let raw = "";
  try {
    raw = await getGroqChatCompletion(groqMessages, "llama-3.1-8b-instant", {
      temperature: 0.3,
      maxTokens: 300,
    });
  } catch (err) {
    console.error("[copilot] Groq call failed:", err);
    // Graceful degradation: surface a canned question so the UI stays alive.
    const fallback: CopilotQuestion = {
      type: "question",
      text: "What would you like to do today — send a campaign, set up an automation, or build a chatbot?",
      suggestions: ["Send a campaign", "Set up automation", "Build a chatbot"],
    };
    return ok(fallback);
  }

  // Attempt to parse the model's JSON response.
  let parsed: CopilotResponse | null = null;
  try {
    parsed = JSON.parse(raw.trim()) as CopilotResponse;
  } catch {
    // Model added markdown fences or extra prose — strip and retry.
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]) as CopilotResponse;
      } catch {
        // Still unparseable; fall through to text fallback below.
      }
    }
  }

  if (parsed !== null) {
    return ok(parsed);
  }

  // Last-resort fallback: return raw text truncated to 300 chars as a question.
  const textFallback: CopilotQuestion = {
    type: "question",
    text: raw.slice(0, 300),
    suggestions: [],
  };
  return ok(textFallback);
});
