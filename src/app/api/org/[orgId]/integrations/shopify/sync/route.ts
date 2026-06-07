import { route, ok, requireOrg } from "@/shared/lib/api";
import { syncShopifyCatalog } from "@/features/integrations/services/shopifySyncService";

// POST /api/org/[orgId]/integrations/shopify/sync
// Org-scoped, ADMIN-guarded Shopify catalog sync. orgId is derived from the
// authorized path — never from an unauthenticated query param.
export const POST = route(async (_req, { params }) => {
  const orgId = params!.orgId;
  await requireOrg(orgId, "ADMIN");
  const result = await syncShopifyCatalog(orgId);
  return ok({ success: true, ...result });
});
