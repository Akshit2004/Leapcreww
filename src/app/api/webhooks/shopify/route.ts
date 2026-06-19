// Catalog synchronization lives at POST /api/org/[orgId]/integrations/shopify/sync.
// This route receives Shopify push webhooks (HMAC-verified) including GDPR
// mandatory topics required for App Store listing.
import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhookHmac } from "@/features/integrations/lib/shopifyAuth";
import { handleShopifyEvent } from "@/features/webhooks/services/shopifyWebhookService";
import type { ShopifyWebhookPayload } from "@/features/webhooks/services/shopifyWebhookService";
import { findShopifyIntegration } from "@/features/webhooks/repositories/shopifyWebhookRepo";

// ─── RECEIVE WEBHOOK NOTIFICATIONS (POST) ─────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Read the raw body once and verify the Shopify HMAC before trusting any
    // header or parsing the payload. Reject forged/unsigned requests with 401.
    const rawBody = await request.text();
    const secret = process.env.SHOPIFY_CLIENT_SECRET ?? "";
    if (!verifyShopifyWebhookHmac(rawBody, request.headers.get("x-shopify-hmac-sha256"), secret)) {
      console.warn("⚠️ Shopify webhook: missing or invalid HMAC signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const topic = request.headers.get("x-shopify-topic") || "";
    const shop = request.headers.get("x-shopify-shop-domain") || "";

    if (!topic || !shop) {
      return NextResponse.json({ error: "Invalid webhook request headers." }, { status: 400 });
    }

    const payload: ShopifyWebhookPayload = JSON.parse(rawBody);

    // Find the organization this shop is connected to
    const integration = await findShopifyIntegration(shop);
    if (!integration) {
      console.warn(`⚠️ Shopify webhook received for unconnected shop: ${shop}`);
      return NextResponse.json({ error: "Store not integrated in LeapCreww." }, { status: 404 });
    }

    const result = await handleShopifyEvent(topic, payload, integration.organizationId, shop);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("❌ POST Shopify webhook endpoint failed:", err);
    return NextResponse.json({ error: "Internal server error processing webhook." }, { status: 500 });
  }
}
