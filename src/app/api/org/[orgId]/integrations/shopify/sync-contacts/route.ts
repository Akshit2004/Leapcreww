import { route, ok, requireOrg } from "@/shared/lib/api";
import { syncShopifyContacts } from "@/features/integrations/services/shopifyContactSyncService";

// POST /api/org/[orgId]/integrations/shopify/sync-contacts
export const POST = route(async (_req, { params }) => {
  const orgId = params!.orgId;
  await requireOrg(orgId, "ADMIN");
  const result = await syncShopifyContacts(orgId);
  return ok({ success: true, ...result });
});
