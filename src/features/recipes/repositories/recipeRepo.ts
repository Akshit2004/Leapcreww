/** recipeRepo.ts — Prisma access for recipe install state. */
import { prisma } from "@/shared/lib/prisma";

/**
 * Installed recipes are regular sequences stamped with a `recipeId` marker in
 * their triggerConfig JSON — no dedicated table needed.
 */
export async function findRecipeSequences(organizationId: string) {
  const sequences = await prisma.sequence.findMany({
    where: { organizationId },
    select: { id: true, triggerConfig: true },
  });
  const byRecipe = new Map<string, string>(); // recipeId → sequenceId
  for (const seq of sequences) {
    const recipeId = (seq.triggerConfig as { recipeId?: string } | null)?.recipeId;
    if (recipeId && !byRecipe.has(recipeId)) byRecipe.set(recipeId, seq.id);
  }
  return byRecipe;
}

export function findTemplateByName(organizationId: string, name: string) {
  return prisma.template.findFirst({ where: { organizationId, name } });
}

/** Local-only template row, used when Meta submission isn't possible yet. */
export function createLocalTemplate(
  organizationId: string,
  data: { name: string; category: string; body: string; buttons: string[] }
) {
  return prisma.template.create({
    data: { ...data, mediaType: "none", metaStatus: "pending", organizationId },
  });
}

export function deleteSequence(organizationId: string, sequenceId: string) {
  return prisma.sequence.deleteMany({ where: { id: sequenceId, organizationId } });
}

export function logRecipeEvent(organizationId: string, message: string) {
  return prisma.systemLog.create({
    data: { type: "campaign", message, organizationId },
  });
}

/** Persist an AI-generated sequence recipe (manual trigger, send_message steps). */
export function createAiGeneratedSequence(
  organizationId: string,
  recipe: {
    name: string;
    prompt: string;
    steps: Array<{ order: number; delayMinutes: number; message: string }>;
  }
) {
  return prisma.sequence.create({
    data: {
      name: recipe.name,
      trigger: "manual",
      triggerConfig: { aiGenerated: true, prompt: recipe.prompt.slice(0, 200) },
      organizationId,
      steps: {
        create: recipe.steps.map((s) => ({
          order: s.order,
          delayMinutes: Math.max(0, Math.min(s.delayMinutes ?? 1, 10080)),
          actionType: "send_message",
          message: s.message ?? "",
          organizationId,
        })),
      },
    },
  });
}
