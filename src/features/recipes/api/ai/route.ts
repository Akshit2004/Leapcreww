import { requireOrg, ok, route, ApiError, body } from "@/shared/lib/api";
import { generateAiRecipe } from "../../services/recipeService";

export const POST = route(async (req, ctx) => {
  const orgId = ctx.params!.orgId;
  await requireOrg(orgId, "AGENT");
  const { prompt } = await body<{ prompt?: string }>(req);
  if (!prompt?.trim()) throw new ApiError("prompt is required", 400);

  const result = await generateAiRecipe(orgId, prompt);
  return ok(result);
});
