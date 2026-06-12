import { requireOrg, ok, route, ApiError } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";
import { getGroqChatCompletion } from "@/shared/lib/groq";

const SYSTEM_PROMPT = `You are a WhatsApp marketing automation expert. Given a user's business description, generate a sequence automation recipe as JSON.

Respond ONLY with a valid JSON object matching this structure:
{
  "name": "Sequence name (5 words max)",
  "description": "One-line description of what this automation does",
  "steps": [
    {
      "order": 0,
      "delayMinutes": 1,
      "message": "The WhatsApp message text. Use {{contact.name}} for personalization."
    }
  ]
}

Rules:
- 1 to 4 steps maximum
- delayMinutes between steps: 1 to 10080 (7 days)
- Messages should be conversational, warm, and concise (under 160 chars ideal)
- Do not include any markdown or text outside the JSON`;

export const POST = route(async (req, ctx) => {
  const orgId = ctx.params!.orgId;
  await requireOrg(orgId, "AGENT");
  const { prompt } = await req.json() as { prompt?: string };
  if (!prompt?.trim()) throw new ApiError("prompt is required", 400);
  if (!process.env.GROQ_API_KEY) throw new ApiError("AI features not configured", 503);

  let recipe: { name: string; description: string; steps: Array<{ order: number; delayMinutes: number; message: string }> };

  try {
    const raw = await getGroqChatCompletion([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt.slice(0, 500) },
    ], "llama-3.1-8b-instant");
    recipe = JSON.parse(raw);
  } catch {
    throw new ApiError("Failed to generate recipe. Please try again or rephrase your description.", 422);
  }

  if (!recipe.name || !Array.isArray(recipe.steps) || recipe.steps.length === 0) {
    throw new ApiError("Generated recipe is invalid. Please try again.", 422);
  }

  const sequence = await prisma.sequence.create({
    data: {
      name: recipe.name,
      trigger: "manual",
      triggerConfig: { aiGenerated: true, prompt: prompt.slice(0, 200) },
      organizationId: orgId,
      steps: {
        create: recipe.steps.map((s) => ({
          order: s.order,
          delayMinutes: Math.max(0, Math.min(s.delayMinutes ?? 1, 10080)),
          actionType: "send_message",
          message: s.message ?? "",
          organizationId: orgId,
        })),
      },
    },
  });

  return ok({ sequenceId: sequence.id, sequenceName: recipe.name, stepCount: recipe.steps.length });
});
