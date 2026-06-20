import { route, ok, requireOrg } from "@/shared/lib/api";
import { getShopifyWebhookTopics } from "@/features/integrations/services/integrationsService";

// GET /api/org/[orgId]/integrations/shopify/webhooks
// Live-queries Shopify for the webhook topics actually registered with this
// org's store, so the UI can show real subscription state instead of a
// hardcoded "we requested these" list.
export const GET = route(async (_req, { params }) => {
  const orgId = params!.orgId;
  await requireOrg(orgId, "AGENT");
  const topics = await getShopifyWebhookTopics(orgId);
  return ok({ topics });
});
