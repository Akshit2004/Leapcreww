import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/recipes/repositories/recipeRepo", () => ({
  findRecipeSequences: vi.fn(),
  findTemplateByName: vi.fn(),
  createLocalTemplate: vi.fn(),
  deleteSequence: vi.fn(),
  logRecipeEvent: vi.fn(),
}));

vi.mock("@/features/sequences/services/sequenceService", () => ({
  createSequence: vi.fn(),
  enrollOnTrigger: vi.fn(),
  listSequences: vi.fn(),
}));

vi.mock("@/features/templates/services/metaTemplateService", () => ({
  createTemplate: vi.fn(),
}));

import * as recipeRepo from "@/features/recipes/repositories/recipeRepo";
import * as seqService from "@/features/sequences/services/sequenceService";
import { installRecipe, uninstallRecipe } from "@/features/recipes/services/recipeService";
import { ApiError } from "@/shared/lib/api";

const ORG = "org-1";

beforeEach(() => vi.clearAllMocks());

describe("installRecipe", () => {
  it("throws 404 for an unknown recipeId", async () => {
    await expect(installRecipe(ORG, "does_not_exist")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws 409 when recipe is already installed", async () => {
    vi.mocked(recipeRepo.findRecipeSequences).mockResolvedValue(
      new Map([["abandoned_cart", "seq-abc"]])
    );
    await expect(installRecipe(ORG, "abandoned_cart")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("creates sequence with recipeId stamped in triggerConfig", async () => {
    vi.mocked(recipeRepo.findRecipeSequences).mockResolvedValue(new Map());
    vi.mocked(recipeRepo.findTemplateByName).mockResolvedValue(null);
    vi.mocked(recipeRepo.createLocalTemplate).mockResolvedValue({} as any);
    vi.mocked(recipeRepo.logRecipeEvent).mockResolvedValue({} as any);
    vi.mocked(seqService.createSequence).mockResolvedValue({
      id: "seq-new",
      steps: [],
    } as any);

    const result = await installRecipe(ORG, "abandoned_cart");

    expect(seqService.createSequence).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(seqService.createSequence).mock.calls[0][0];
    expect(callArgs.triggerConfig).toMatchObject({ recipeId: "abandoned_cart" });
    expect(result.sequenceId).toBe("seq-new");
  });

  it("is idempotent — second install throws 409 without touching createSequence", async () => {
    vi.mocked(recipeRepo.findRecipeSequences).mockResolvedValue(
      new Map([["welcome_flow", "seq-existing"]])
    );

    await expect(installRecipe(ORG, "welcome_flow")).rejects.toMatchObject({
      status: 409,
    });
    expect(seqService.createSequence).not.toHaveBeenCalled();
  });
});

describe("uninstallRecipe", () => {
  it("throws 404 for an unknown recipeId", async () => {
    await expect(uninstallRecipe(ORG, "not_a_recipe")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws 404 when recipe is not installed", async () => {
    vi.mocked(recipeRepo.findRecipeSequences).mockResolvedValue(new Map());
    await expect(uninstallRecipe(ORG, "abandoned_cart")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("deletes the sequence and logs the event", async () => {
    vi.mocked(recipeRepo.findRecipeSequences).mockResolvedValue(
      new Map([["abandoned_cart", "seq-abc"]])
    );
    vi.mocked(recipeRepo.deleteSequence).mockResolvedValue({} as any);
    vi.mocked(recipeRepo.logRecipeEvent).mockResolvedValue({} as any);

    await uninstallRecipe(ORG, "abandoned_cart");

    expect(recipeRepo.deleteSequence).toHaveBeenCalledWith(ORG, "seq-abc");
    expect(recipeRepo.logRecipeEvent).toHaveBeenCalledOnce();
  });
});
