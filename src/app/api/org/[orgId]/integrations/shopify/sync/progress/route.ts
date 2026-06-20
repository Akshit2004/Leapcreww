import { route, ok, requireOrg } from "@/shared/lib/api";
import { getMetaCatalogSyncProgress } from "@/shared/lib/meta-catalog";

// GET /api/org/[orgId]/integrations/shopify/sync/progress
// Polled by the frontend to show live progress while products sync to
// Meta's WhatsApp Commerce Catalog after a Shopify catalog sync.
export const GET = route(async (_req, { params }) => {
  const orgId = params!.orgId;
  await requireOrg(orgId, "ADMIN");
  const progress = getMetaCatalogSyncProgress(orgId);
  return ok(progress ?? { current: 0, total: 0, done: true });
});
