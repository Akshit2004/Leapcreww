import { route, ok, requireOrg, requireFields, body } from "@/shared/lib/api";
import { generateCreative } from "@/features/ads/services/adService";
import type { AdCreativeRequest } from "@/features/ads/types";

export const POST = route(async (req) => {
  const input = await body<AdCreativeRequest>(req);
  requireFields(input, ["topic", "orgId"]);

  // Guard the route by checking membership
  await requireOrg(input.orgId);

  const creative = await generateCreative(input);
  return ok(creative);
});
