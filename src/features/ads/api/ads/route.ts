import { route, ok, requireOrg, requireFields, body } from "@/shared/lib/api";
import { listAds, createAd } from "../../services/adService";
import type { CreateAdInput } from "../../types";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  return ok({ ads: await listAds(orgId) });
});

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const input = await body<CreateAdInput>(req);
  input.organizationId = orgId;
  requireFields(input, ["headline", "primaryText"]);
  return ok({ ad: await createAd(input) }, { status: 201 });
});
