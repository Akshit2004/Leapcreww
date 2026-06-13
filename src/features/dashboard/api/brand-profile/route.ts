import { route, ok, requireOrg, body } from "@/shared/lib/api";
import { updateBrandProfile, type BrandProfileInput } from "../../services/dashboardService";

/** POST /api/org/[orgId]/brand-profile — update the org's brand profile. */
export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");

  const input = await body<BrandProfileInput>(req);
  const result = await updateBrandProfile(orgId, input);
  return ok(result);
});
