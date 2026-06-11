import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/api/[...nextauth]/route";
import { getGroqChatCompletion } from "@/shared/lib/groq";

// Helper: Extract valid JSON from LLM string output
function extractJsonFromString(str: string): unknown {
  try {
    const cleanStr = str.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanStr);
  } catch {
    const match = str.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (nestedErr) {
        console.error("Nested array JSON parsing fallback failed:", nestedErr);
      }
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { userPrompt } = await request.json();

    if (!userPrompt) {
      return NextResponse.json({ error: "Missing conversational prompt" }, { status: 400 });
    }

    const systemInstruction = `You are a visual AI Form Builder Architect for WappFlow, generating WhatsApp Flow JSON for Meta's API.
Your task is to analyze the user's conversational description of a form or data collection flow and compile it into a valid JSON array of WappFlow Form Screens.

CRITICAL ID RULES (Meta will reject the flow if violated):
- ALL 'id' and 'name' fields MUST ONLY contain lowercase letters and underscores. NO numbers, NO hyphens, NO spaces, NO special characters.
- Good examples: "lead_capture_screen", "full_name", "budget_range", "preferred_location"
- Bad examples: "screen_1", "field-name", "option 1", "name2"

Specifications:
1. Field Types Available:
   - "TextInput" (Standard text response)
   - "Dropdown" (List of selectable options)
   - "CheckboxGroup" (Multiple select)
   - "RadioButtons" (Single select from options)
   - "DatePicker" (Date selection)

2. Structural Rules:
   - You must output an array of Screen objects.
   - Most forms can fit on a single screen. Only use multiple screens if the form is very long or logically separated into distinct steps.
   - Each Screen must have an 'id' (a short unique lowercase_underscore string like 'lead_capture_screen'), a 'title' (a short descriptive title), and a 'fields' array.
   - Each Field must have an 'id' (unique lowercase_underscore string like 'full_name_field'), 'type' (one of the available Field Types), 'label' (descriptive label/question — this CAN contain spaces and special characters), 'name' (a short lowercase_underscore key for data collection like 'full_name'), and 'required' (boolean).
   - If the field type is "Dropdown", "CheckboxGroup", or "RadioButtons", it MUST include an 'options' array of strings. Option values CAN contain spaces and special characters as they are display labels.

You MUST return ONLY a raw JSON array matching this typescript interface:
Array<{
  id: string;
  title: string;
  fields: Array<{
    id: string;
    type: "TextInput" | "Dropdown" | "CheckboxGroup" | "RadioButtons" | "DatePicker";
    label: string;
    name: string;
    required: boolean;
    options?: string[];
  }>;
}>
Return ONLY the raw JSON string array. Do not include any explanations, markdown code blocks, or conversational warnings.`;

    const resultString = await getGroqChatCompletion([
      { role: "system", content: systemInstruction },
      { role: "user", content: `Conversational Prompt:\n"${userPrompt}"` }
    ]);

    const parsedScreens = extractJsonFromString(resultString);

    if (!parsedScreens || !Array.isArray(parsedScreens)) {
      return NextResponse.json({ 
        error: "AI failed to generate a valid schema. Please try a different prompt." 
      }, { status: 422 });
    }

    // Server-side guardrail: sanitize all id/name fields to only contain alphabets and underscores
    function sanitize(val: string): string {
      const s = val.replace(/[^a-zA-Z_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
      return s || "field_default";
    }

    const sanitizedScreens = (parsedScreens as any[]).map((screen: any) => ({
      ...screen,
      id: sanitize(screen.id || "screen_default"),
      fields: (screen.fields || []).map((field: any) => ({
        ...field,
        id: sanitize(field.id || "field_default"),
        name: sanitize(field.name || "field_default"),
      }))
    }));

    // Ensure unique screen IDs
    const seenScreenIds = new Set<string>();
    for (const screen of sanitizedScreens) {
      const base = screen.id;
      let suffix = "";
      const letters = "abcdefghijklmnopqrstuvwxyz";
      let counter = 0;
      while (seenScreenIds.has(base + suffix)) {
        suffix = "_" + letters[counter % 26];
        counter++;
      }
      screen.id = base + suffix;
      seenScreenIds.add(screen.id);
    }

    return NextResponse.json({ screens: sanitizedScreens });
  } catch (err: unknown) {
    console.error("AI WA Flow Generator error:", err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || "Internal server error" }, { status: 500 });
  }
}
