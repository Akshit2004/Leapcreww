import { NextRequest, NextResponse } from "next/server";
import {
  verifyShopifyInstallHmac,
  buildSignedState,
} from "@/features/integrations/lib/shopifyAuth";

// Shopify App Store install entry point.
// Shopify GET /api/shopify/auth?shop=xxx&hmac=yyy&timestamp=zzz[&orgId=aaa]
//
// orgId can be passed as a query param when installing from inside the WappFlow
// dashboard (the Connect button appends it). When installing cold from the App
// Store, orgId arrives via the `state` Shopify round-trips back to our callback.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  let shop = searchParams.get("shop")?.trim() ?? "";
  const orgId = searchParams.get("orgId")?.trim() ?? "";

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Shopify app credentials not configured on the server (SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET)." },
      { status: 500 }
    );
  }

  // Validate shop domain
  shop = shop.replace(/^https?:\/\//, "");
  if (!shop.includes(".")) shop = `${shop}.myshopify.com`;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) {
    return NextResponse.json(
      { error: "Invalid Shopify store domain. Expected format: yourstore.myshopify.com" },
      { status: 400 }
    );
  }

  // Verify Shopify's HMAC signature on the install request.
  // Shopify signs the query string (excluding hmac itself) with our client secret.
  // If hmac is absent it's a direct dashboard-initiated install — skip verification.
  const hasHmac = searchParams.has("hmac");
  if (hasHmac && !verifyShopifyInstallHmac(searchParams, clientSecret)) {
    return NextResponse.json({ error: "Invalid HMAC signature on install request." }, { status: 403 });
  }

  // Check timestamp freshness (±5 min) to prevent replay attacks.
  const ts = searchParams.get("timestamp");
  if (ts) {
    const age = Math.abs(Date.now() / 1000 - parseInt(ts, 10));
    if (age > 300) {
      return NextResponse.json({ error: "Install request expired. Please try again." }, { status: 400 });
    }
  }

  if (!orgId) {
    return NextResponse.json(
      { error: "orgId is required. Append ?orgId=<your-workspace-id> to the install URL." },
      { status: 400 }
    );
  }

  // Build a tamper-evident state token that encodes orgId + a timestamp
  // so the callback can verify it without a database lookup.
  const state = buildSignedState(orgId, clientSecret);

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const redirectUri = `${protocol}://${host}/api/shopify/callback`;

  const scopes = [
    "read_products",
    "write_products",
    "read_orders",
    "write_orders",
    "read_customers",
    "write_customers",
    "read_inventory",
    "read_fulfillments",
    "read_checkouts",
  ].join(",");

  const authorizeUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${clientId}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  return NextResponse.redirect(authorizeUrl);
}
