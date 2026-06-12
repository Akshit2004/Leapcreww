import { route, ok, requireOrg } from "@/shared/lib/api";
import { installRecipe, uninstallRecipe } from "../../../services/recipeService";

/** POST /api/org/[orgId]/recipes/[recipeId] — one-click install. */
export const POST = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  const recipeId = params?.recipeId as string;
  await requireOrg(orgId, "ADMIN");
  return ok({ result: await installRecipe(orgId, recipeId) }, { status: 201 });
});

/** DELETE /api/org/[orgId]/recipes/[recipeId] — disable (removes the sequence). */
export const DELETE = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  const recipeId = params?.recipeId as string;
  await requireOrg(orgId, "ADMIN");
  await uninstallRecipe(orgId, recipeId);
  return ok({ ok: true });
});
