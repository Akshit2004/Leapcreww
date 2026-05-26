import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getGroqChatCompletion } from "@/lib/groq";

function extractJsonFromString(str: string): any {
  try {
    const cleanStr = str.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanStr);
  } catch {
    const match = str.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, context } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const systemPrompt = `You are WappFlow AI Copilot, an intelligent assistant for a WhatsApp Marketing & CRM platform.
Your tone is warm, proactive, and concise — like a senior teammate who's always one step ahead.

Current workspace context:
${JSON.stringify(context, null, 2)}

AVAILABLE ACTIONS — you can execute these directly when the user asks:

1. "go_to_tab" — Navigate to a dashboard tab
   Data: { "tab": "overview" | "inbox" | "campaigns" | "templates" | "chatbot" | "marketplace" }

2. "create_campaign" — Create and launch a broadcast campaign
   Data: {
     "name": "Campaign name",
     "targetTag": "all" | any tag name from contacts,
     "templateName": "Name of an approved template from the context above",
     "delay": 1.5 (optional, seconds between messages, default 1),
     "scheduledAt": "ISO date string" (optional, omit for immediate)
   }

3. "send_message" — Send a WhatsApp message to a contact
   Data: {
     "contactName": "Exact name of the contact from the context",
     "text": "Message content"
   }

4. "add_tag" — Add tags to a contact
   Data: {
     "contactName": "Exact name of the contact from the context",
     "tags": ["tag1", "tag2"]
   }

RULES:
- When the user asks you to DO something (create, send, add), ALWAYS include an "action" field in your response with the matching type and data.
- Use exact names from the context for contacts and templates.
- If a user says "broadcast to all contacts", "all inbounds", or "everyone", use targetTag "all".
- "all" means every contact in the workspace.
- Before creating a campaign, check that contacts exist and the template exists. If contactsCount is 0, tell the user to add contacts first.
- Keep replies to 1-2 sentences confirming what was done.
- If you can't determine an exact value needed for an action, ask the user.

RESPONSE FORMAT (always return valid JSON — no markdown, no code fences):
{
  "reply": "Your short response confirming what happened or answering the question",
  "action": { "type": "create_campaign", "data": { ... } },
  "suggestions": []
}

If just chatting (no action needed), omit "action" or set to null.
"suggestions" can be an empty array unless you have navigation suggestions.`;

    const resultString = await getGroqChatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ]);

    const parsed = extractJsonFromString(resultString);

    if (parsed && parsed.reply) {
      return NextResponse.json({
        reply: parsed.reply,
        suggestions: parsed.suggestions || [],
        action: parsed.action || null
      });
    }

    return NextResponse.json({
      reply: resultString,
      suggestions: [],
      action: null
    });

  } catch (err: any) {
    console.error("AI Copilot error:", err);
    return NextResponse.json({
      reply: "I ran into an issue. Let's try again.",
      suggestions: [],
      action: null
    });
  }
}
