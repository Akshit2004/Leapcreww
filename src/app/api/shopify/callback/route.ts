import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";

export async function GET(request: NextRequest) {
  let shop: string | null = null;
  let orgId: string | null = null;

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim() || null;
    shop = searchParams.get("shop")?.trim() || null;
    orgId = searchParams.get("state")?.trim() || null; // We passed orgId as the state

    if (!code || !shop || !orgId) {
      return NextResponse.json({ error: "Missing required callback parameters (code, shop, or state)." }, { status: 400 });
    }

    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Shopify OAuth Client credentials are missing on the server. Please check your .env file." },
        { status: 500 }
      );
    }

    // 1. Exchange the temporary code for a permanent Access Token
    const exchangeUrl = `https://${shop}/admin/oauth/access_token`;
    const exchangeResponse = await fetch(exchangeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!exchangeResponse.ok) {
      const errorData = await exchangeResponse.json();
      console.error("❌ Shopify Access Token exchange failed:", errorData);
      return NextResponse.json(
        { error: "Failed to exchange authorization code for access token.", details: errorData },
        { status: 400 }
      );
    }

    const tokenData = await exchangeResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json({ error: "Access token not found in Shopify response." }, { status: 400 });
    }

    // 2. Fetch Shop Details to get the official Shop Name
    let shopName = shop.split(".")[0];
    try {
      const shopRes = await fetch(`https://${shop}/admin/api/2024-04/shop.json`, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      });
      if (shopRes.ok) {
        const shopDetails = await shopRes.json();
        shopName = shopDetails.shop.name || shopName;
      }
    } catch (e) {
      console.error("⚠️ Failed to fetch shop details:", e);
    }

    // 3. Serialize Credentials and Upsert in Database
    const serializedApiKey = JSON.stringify({
      shopDomain: shop,
      accessToken: accessToken,
    });

    const integrationData = {
      name: "Shopify",
      description: "Sync products, track orders, recover carts, and automate post-purchase flows.",
      status: "connected",
      icon: "ShoppingBag",
      apiKey: serializedApiKey,
      webhookUrl: `https://${shop}`, // Using this to save store root domain
    };

    await prisma.integration.upsert({
      where: {
        id_organizationId: {
          id: "shopify",
          organizationId: orgId,
        },
      },
      update: integrationData,
      create: {
        id: "shopify",
        organizationId: orgId,
        ...integrationData,
      },
    });

    // 4. Programmatic Webhooks Setup
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = `${protocol}://${host}`;
    const webhookReceiverUrl = `${origin}/api/webhooks/shopify`;

    const webhooksRegistered: string[] = [];
    let webhookWarning = "";

    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");

    if (isLocal) {
      webhookWarning = "Localhost environment detected. Skipping automatic Shopify webhook registration. Please set up a tunnel (e.g. ngrok) to receive real-time webhook updates.";
    } else {
      // Register webhooks programmatically for non-localhost hosts
      const topics = ["orders/create", "orders/fulfilled", "checkouts/create"];
      for (const topic of topics) {
        try {
          const webhookRes = await fetch(`https://${shop}/admin/api/2024-04/webhooks.json`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": accessToken,
            },
            body: JSON.stringify({
              webhook: {
                topic,
                address: webhookReceiverUrl,
                format: "json",
              },
            }),
          });
          if (webhookRes.ok) {
            webhooksRegistered.push(topic);
          } else {
            const errData = await webhookRes.json();
            console.warn(`⚠️ Failed to register webhook topic ${topic}:`, errData);
          }
        } catch (e) {
          console.error(`❌ Webhook subscription failed for ${topic}:`, e);
        }
      }
    }

    // 5. Create System Log
    await prisma.systemLog.create({
      data: {
        type: "integration",
        message: `Shopify Connected: Store "${shopName}" (${shop}) successfully authenticated via 1-Click OAuth.${
          webhooksRegistered.length > 0
            ? ` Subscribed to topics: ${webhooksRegistered.join(", ")}.`
            : ""
        }`,
        organizationId: orgId,
      },
    });

    // 6. Redirect user back to the Integrations tab dashboard
    const successRedirectUrl = `${origin}/org/${orgId}?success=true&registered=${webhooksRegistered.length}&warning=${encodeURIComponent(
      webhookWarning
    )}`;

    return NextResponse.redirect(successRedirectUrl);
  } catch (err: unknown) {
    console.error("❌ Shopify OAuth callback failed:", err);
    
    // Redirect to error page if we have origin and orgId, otherwise return error payload
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const protocol = host.includes("localhost") ? "http" : "https";
    if (orgId && host) {
      return NextResponse.redirect(
        `${protocol}://${host}/org/${orgId}?error=${encodeURIComponent(
          err instanceof Error ? err.message : String(err)
        )}`
      );
    }

    return NextResponse.json({ error: "Internal callback handler failure.", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
