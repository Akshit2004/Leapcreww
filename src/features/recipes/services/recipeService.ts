/**
 * recipeService.ts — One-click installable automation bundles.
 *
 * installRecipe() turns a catalog definition into real, working pieces: it
 * submits the recipe's templates to Meta (falling back to local drafts when
 * WhatsApp isn't connected yet) and creates the sequence wired to its trigger.
 * The sequence carries a `recipeId` marker in triggerConfig so install state
 * is derived from data, not tracked separately.
 */
import { ApiError } from "@/shared/lib/api";
import { getGroqChatCompletion } from "@/shared/lib/groq";
import { createSequence } from "@/features/sequences/services/sequenceService";
import { createTemplate } from "@/features/templates/services/metaTemplateService";
import * as repo from "../repositories/recipeRepo";
import { RECIPE_CATALOG, RECIPE_IDS, isRecipeId } from "../config/catalog";
import type { InstallResult, RecipeWithStatus } from "../types";

const AI_RECIPE_SYSTEM_PROMPT = `You are a WhatsApp marketing automation expert. Given a user's business description, generate a sequence automation recipe as JSON.

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

export async function listRecipes(organizationId: string): Promise<RecipeWithStatus[]> {
  const installed = await repo.findRecipeSequences(organizationId);
  return RECIPE_IDS.map((id) => {
    const def = RECIPE_CATALOG[id];
    return {
      id,
      title: def.title,
      tagline: def.tagline,
      emoji: def.emoji,
      firesWhen: def.firesWhen,
      category: def.category,
      templateCount: def.templates.length,
      stepCount: def.sequence.steps.length,
      installed: installed.has(id),
      sequenceId: installed.get(id) ?? null,
    };
  });
}

export async function installRecipe(organizationId: string, recipeId: string): Promise<InstallResult> {
  if (!isRecipeId(recipeId)) throw new ApiError("Unknown recipe", 404);
  const def = RECIPE_CATALOG[recipeId];

  const installed = await repo.findRecipeSequences(organizationId);
  if (installed.has(recipeId)) throw new ApiError("Recipe is already enabled", 409);

  // 1. Templates: reuse existing ones by name; otherwise submit to Meta, and
  //    degrade to a local draft when WhatsApp isn't connected yet so the
  //    one-click install never dead-ends during onboarding.
  const templates: InstallResult["templates"] = [];
  for (const tpl of def.templates) {
    const existing = await repo.findTemplateByName(organizationId, tpl.name);
    if (existing) {
      templates.push({ name: tpl.name, existed: true, submittedToMeta: Boolean(existing.metaId) });
      continue;
    }
    try {
      await createTemplate({ ...tpl, organizationId });
      templates.push({ name: tpl.name, existed: false, submittedToMeta: true });
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      await repo.createLocalTemplate(organizationId, tpl);
      templates.push({ name: tpl.name, existed: false, submittedToMeta: false });
    }
  }

  // 2. The sequence, stamped with the recipe marker.
  // Merge catalog's extra triggerConfig (e.g. tag filter for win_back) with the recipeId marker.
  const triggerConfig: Record<string, unknown> = { recipeId, ...def.sequence.triggerConfig };
  const sequence = await createSequence({
    name: def.sequence.name,
    trigger: def.sequence.trigger,
    triggerConfig,
    organizationId,
    steps: def.sequence.steps,
  });

  await repo.logRecipeEvent(
    organizationId,
    `✨ Recipe enabled: ${def.title} (${def.sequence.steps.length} steps${def.templates.length ? `, ${def.templates.length} template(s)` : ""}).`
  );

  return { sequenceId: sequence.id, templates };
}

/** Disable a recipe by removing its sequence. Templates are kept. */
export async function uninstallRecipe(organizationId: string, recipeId: string) {
  if (!isRecipeId(recipeId)) throw new ApiError("Unknown recipe", 404);
  const installed = await repo.findRecipeSequences(organizationId);
  const sequenceId = installed.get(recipeId);
  if (!sequenceId) throw new ApiError("Recipe is not enabled", 404);

  await repo.deleteSequence(organizationId, sequenceId);
  await repo.logRecipeEvent(organizationId, `Recipe disabled: ${RECIPE_CATALOG[recipeId].title}.`);
}

/** Generate a sequence recipe from a free-text prompt via Groq, then persist it. */
export async function generateAiRecipe(organizationId: string, prompt: string) {
  if (!prompt.trim()) throw new ApiError("prompt is required", 400);
  if (!process.env.GROQ_API_KEY) throw new ApiError("AI features not configured", 503);

  let recipe: { name: string; description: string; steps: Array<{ order: number; delayMinutes: number; message: string }> };

  try {
    const raw = await getGroqChatCompletion([
      { role: "system", content: AI_RECIPE_SYSTEM_PROMPT },
      { role: "user", content: prompt.slice(0, 500) },
    ], "llama-3.1-8b-instant");
    recipe = JSON.parse(raw);
  } catch {
    throw new ApiError("Failed to generate recipe. Please try again or rephrase your description.", 422);
  }

  if (!recipe.name || !Array.isArray(recipe.steps) || recipe.steps.length === 0) {
    throw new ApiError("Generated recipe is invalid. Please try again.", 422);
  }

  const sequence = await repo.createAiGeneratedSequence(organizationId, {
    name: recipe.name,
    prompt,
    steps: recipe.steps,
  });

  return { sequenceId: sequence.id, sequenceName: recipe.name, stepCount: recipe.steps.length };
}
