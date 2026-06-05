import { route, ok, requireSession, requireFields, body } from "@/shared/lib/api";
import { generateCreative } from "@/features/ads/services/adService";
import type { AdCreativeRequest } from "@/features/ads/types";

export const POST = route(async (req) => {
  await requireSession();
  const input = await body<AdCreativeRequest>(req);
  requireFields(input, ["product"]);
  return ok({ creative: await generateCreative(input) });
});
