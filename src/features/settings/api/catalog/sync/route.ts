import { ok, route, requireOrg, body, requireFields } from "@/shared/lib/api";
import { syncCatalog } from "../../../services/whatsappConnectionService";

/**
 * POST /api/whatsapp/catalog/sync
 *
 * Manually trigger a Catalog check, repair, and product synchronization.
 * If the organization is connected to WhatsApp but has no metaCatalogId, it
 * programmatically creates one, links it to their WABA, and syncs products.
 */
export const POST = route(async (req) => {
  const input = await body<{ orgId: string }>(req);
  requireFields(input, ["orgId"]);
  await requireOrg(input.orgId, "ADMIN");

  const result = await syncCatalog(input.orgId);
  return ok(result);
});
