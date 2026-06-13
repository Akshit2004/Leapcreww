/**
 * POST /api/org/[orgId]/stock-alerts
 *
 * Public endpoint — called directly from a Shopify storefront liquid snippet
 * or any third-party platform when a customer clicks "Notify me on WhatsApp".
 * No session auth required; orgId in the URL provides tenant scoping.
 *
 * Body:
 *   phone                    string   E.164 or local format
 *   product_title            string
 *   shopify_inventory_item_id? string  Shopify's inventory_item_id
 *   sku?                     string   Generic SKU for non-Shopify platforms
 *   product_url?             string
 */
import { z } from "zod";
import { route, ok, body, ApiError } from "@/shared/lib/api";
import { registerStockAlert } from "../services/stockAlertService";

const Schema = z.object({
  phone: z.string().min(5).max(20),
  product_title: z.string().min(1).max(255),
  shopify_inventory_item_id: z.string().max(64).optional(),
  sku: z.string().max(128).optional(),
  product_url: z.string().url().max(2048).optional(),
});

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  if (!orgId) throw new ApiError("Missing orgId", 400);

  const payload = await body(req);
  const parsed = Schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError("Invalid payload", 400);
  }

  const { phone, product_title, shopify_inventory_item_id, sku, product_url } = parsed.data;

  if (!shopify_inventory_item_id && !sku) {
    throw new ApiError("Provide shopify_inventory_item_id or sku", 400);
  }

  const alert = await registerStockAlert({
    orgId,
    phone,
    productTitle: product_title,
    shopifyInventoryItemId: shopify_inventory_item_id,
    sku,
    productUrl: product_url,
  });

  return ok({ success: true, id: alert.id }, { status: 201 });
});
