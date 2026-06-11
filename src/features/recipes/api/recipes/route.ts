import { route, ok, requireOrg } from "@/shared/lib/api";
import { listRecipes } from "../../services/recipeService";

/** GET /api/org/[orgId]/recipes — catalog with per-org install state. */
export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  return ok({ recipes: await listRecipes(orgId) });
});
