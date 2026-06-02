import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let shop = searchParams.get("shop")?.trim();
    const orgId = searchParams.get("orgId")?.trim();

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter is required." }, { status: 400 });
    }
    if (!orgId) {
      return NextResponse.json({ error: "orgId parameter is required." }, { status: 400 });
    }

    // Sanitize shop domain
    shop = shop.replace(/^https?:\/\//, "");
    if (!shop.includes(".")) {
      shop = `${shop}.myshopify.com`;
    }

    // Verify it ends with .myshopify.com or a valid shopify domain format
    const shopPattern = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
    if (!shopPattern.test(shop)) {
      return NextResponse.json(
        { error: "Invalid Shopify store domain. Must be in the format 'yourstore.myshopify.com'." },
        { status: 400 }
      );
    }

    const clientId = process.env.SHOPIFY_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        {
          error:
            "Shopify App Client ID is missing. Please add SHOPIFY_CLIENT_ID to your server's .env file to enable 1-Click install.",
        },
        { status: 400 }
      );
    }

    // Dynamically build redirect URI based on the request host (works on localhost, ngrok, or production)
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = `${protocol}://${host}`;
    const redirectUri = `${origin}/api/shopify/callback`;

    const scopes = "read_products,read_orders,write_orders,read_customers";

    // State encodes orgId to link the authorization callback back to the user's workspace organization
    const authorizeUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${orgId}`;

    return NextResponse.redirect(authorizeUrl);
  } catch (err: unknown) {
    console.error("❌ Shopify Auth redirect failed:", err);
    return NextResponse.json({ error: "Internal server error during authorization." }, { status: 500 });
  }
}
