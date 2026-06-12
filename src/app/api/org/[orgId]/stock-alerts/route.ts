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
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerStockAlert } from "@/features/stock-alerts/services/stockAlertService";

const Schema = z.object({
  phone: z.string().min(5).max(20),
  product_title: z.string().min(1).max(255),
  shopify_inventory_item_id: z.string().max(64).optional(),
  sku: z.string().max(128).optional(),
  product_url: z.string().url().max(2048).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { phone, product_title, shopify_inventory_item_id, sku, product_url } = parsed.data;

    if (!shopify_inventory_item_id && !sku) {
      return NextResponse.json(
        { error: "Provide shopify_inventory_item_id or sku" },
        { status: 400 }
      );
    }

    const alert = await registerStockAlert({
      orgId,
      phone,
      productTitle: product_title,
      shopifyInventoryItemId: shopify_inventory_item_id,
      sku,
      productUrl: product_url,
    });

    return NextResponse.json({ success: true, id: alert.id }, { status: 201 });
  } catch (err) {
    console.error("[StockAlert] Registration error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
