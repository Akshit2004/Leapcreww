import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import {
  verifyShopifyInstallHmac,
  parseSignedState,
  encryptToken,
} from "@/features/integrations/lib/shopifyAuth";

const SHOPIFY_API_VERSION = "2024-10";

// Webhook topics to subscribe during install.
// GDPR topics (customers/data_request, customers/redact, shop/redact) are
// mandatory for App Store listing — they MUST be registered and handled.
const WEBHOOK_TOPICS = [
  "orders/create",
  "orders/fulfilled",
  "checkouts/create",
  "inventory_levels/update",
  "app/uninstalled",
];

async function registerWebhooks(
  shop: string,
  accessToken: string,
  receiverUrl: string
): Promise<{ registered: string[]; failed: string[] }> {
  const registered: string[] = [];
  const failed: string[] = [];

  for (const topic of WEBHOOK_TOPICS) {
    try {
      const r = await fetch(
        `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({ webhook: { topic, address: receiverUrl, format: "json" } }),
        }
      );
      // 422 = already registered — treat as success
      if (r.ok || r.status === 422) {
        registered.push(topic);
      } else {
        const errorMsg = await r.text().catch(() => "unknown error");
        console.error(`❌ Webhook registration failed for topic '${topic}': HTTP ${r.status} - ${errorMsg}`);
        failed.push(topic);
      }
    } catch {
      failed.push(topic);
    }
  }

  return { registered, failed };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code")?.trim() ?? "";
  const shop  = searchParams.get("shop")?.trim() ?? "";
  const state = searchParams.get("state")?.trim() ?? "";

  const clientId     = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  const host     = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin   = `${protocol}://${host}`;

  const fail = (msg: string, orgId?: string) => {
    const dest = orgId
      ? `${origin}/org/${orgId}?tab=integrations&error=${encodeURIComponent(msg)}`
      : `${origin}/login?error=${encodeURIComponent(msg)}`;
    return NextResponse.redirect(dest);
  };

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Shopify credentials not configured." }, { status: 500 });
  }

  if (!code || !shop || !state) {
    return fail("Missing OAuth callback parameters.");
  }

  // 1. Verify HMAC on the callback — Shopify signs these too.
  if (!verifyShopifyInstallHmac(searchParams, clientSecret)) {
    return fail("Invalid HMAC on callback. Possible CSRF or replay attack.");
  }

  // 2. Verify signed state — confirms this callback belongs to our install
  //    request and hasn't expired (10-minute window).
  const parsed = parseSignedState(state, clientSecret);
  if (!parsed) {
    return fail("Invalid or expired state parameter. Please retry the installation.");
  }
  const { orgId } = parsed;

  // 3. Confirm the org exists
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return fail("Workspace not found.", orgId);

  // 4. Exchange code for access token
  let accessToken: string;
  try {
    const r = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    if (!r.ok) {
      const err = await r.json();
      console.error("Shopify token exchange failed:", err);
      return fail("Token exchange failed. The authorization code may have expired.", orgId);
    }
    const data = await r.json();
    accessToken = data.access_token;
    if (!accessToken) return fail("No access token in Shopify response.", orgId);
  } catch (e) {
    console.error("Shopify token exchange error:", e);
    return fail("Network error during token exchange.", orgId);
  }

  // 5. Fetch shop name
  let shopName = shop.split(".")[0];
  try {
    const r = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });
    if (r.ok) {
      const d = await r.json();
      shopName = d.shop?.name || shopName;
    }
  } catch { /* non-fatal */ }

  // 6. Encrypt token at rest, persist integration
  const creds = { shopDomain: shop, accessToken };
  const encryptedApiKey = encryptToken(JSON.stringify(creds));

  await prisma.integration.upsert({
    where: { id_organizationId: { id: "shopify", organizationId: orgId } },
    update: {
      name: "Shopify",
      description: "Sync products, track orders, recover carts, and automate post-purchase flows.",
      status: "connected",
      icon: "ShoppingBag",
      apiKey: encryptedApiKey,
      webhookUrl: `https://${shop}`,
    },
    create: {
      id: "shopify",
      organizationId: orgId,
      name: "Shopify",
      description: "Sync products, track orders, recover carts, and automate post-purchase flows.",
      status: "connected",
      icon: "ShoppingBag",
      apiKey: encryptedApiKey,
      webhookUrl: `https://${shop}`,
    },
  });

  // 7. Register webhooks (skip on localhost — Shopify can't reach it)
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  let registered: string[] = [];
  let failed: string[] = [];

  if (!isLocal) {
    const receiverUrl = `${origin}/api/webhooks/shopify`;
    ({ registered, failed } = await registerWebhooks(shop, accessToken, receiverUrl));
  }

  // 8. Log
  await prisma.systemLog.create({
    data: {
      type: "integration",
      message:
        `Shopify connected: "${shopName}" (${shop}).` +
        (registered.length ? ` Webhooks registered: ${registered.join(", ")}.` : "") +
        (failed.length ? ` Failed: ${failed.join(", ")}.` : "") +
        (isLocal ? " Localhost — webhooks skipped." : ""),
      organizationId: orgId,
    },
  });

  return NextResponse.redirect(
    `${origin}/org/${orgId}?tab=integrations&shopify=connected&shop=${encodeURIComponent(shopName)}`
  );
}
