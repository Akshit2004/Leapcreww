/**
 * integrationsService.ts — business logic for the Integrations Hub
 * (Shopify, Razorpay, Shiprocket). No `request`/`Response` — routes pass
 * plain inputs (including a resolved `origin` for webhook registration) and
 * get plain data back. Throws `ApiError` for HTTP-mapped failures.
 *
 * Credentials are encrypted at rest via `@/shared/lib/crypto` before being
 * written to `Integration.apiKey`, and decrypted (with a safe plaintext
 * fallback for rows written before encryption was introduced) when read back
 * for outbound API calls.
 */
import { ApiError } from "@/shared/lib/api";
import { encryptSecret, decryptSecretSafe } from "@/shared/lib/crypto";
import * as integrationsRepo from "@/features/integrations/repositories/integrationsRepo";
import { authenticateShiprocket } from "@/features/integrations/connectors/shiprocket";
import type {
  ConnectShopifyInput,
  ConnectRazorpayInput,
  ConnectShiprocketInput,
  ConnectResult,
  ShopifyCredentials,
  RazorpayCredentials,
  ShiprocketCredentials,
} from "@/features/integrations/types";

const SHOPIFY_API_VERSION = "2024-04";

// ─── Read helpers ────────────────────────────────────────────────────────

/**
 * List all integrations for an org. The raw (encrypted) `apiKey` blob is
 * decrypted field-by-field and stripped of secrets before being returned —
 * the UI only needs non-secret fields to render connection state (e.g.
 * shopDomain, keyId, email).
 */
export async function listIntegrations(orgId: string) {
  const integrations = await integrationsRepo.findAll(orgId);

  return integrations.map((integration) => {
    let safeApiKey: string | null = null;
    if (integration.apiKey) {
      const creds = decryptCredentials(integration.id, integration.apiKey);
      if (creds) {
        // Redact secrets — UI only prefills non-secret identifiers.
        const { accessToken, keySecret, webhookSecret, token, ...rest } =
          creds as Record<string, unknown>;
        void accessToken;
        void keySecret;
        void webhookSecret;
        void token;
        safeApiKey = JSON.stringify(rest);
      }
    }
    return { ...integration, apiKey: safeApiKey };
  });
}

/**
 * Decrypt and parse a stored `apiKey` blob for an integration. Returns null
 * on parse failure (logged, never thrown — read paths must not crash).
 */
function decryptCredentials(id: string, stored: string): Record<string, unknown> | null {
  const decrypted = decryptSecretSafe(stored);
  try {
    return JSON.parse(decrypted) as Record<string, unknown>;
  } catch {
    console.warn(`[integrations] Failed to parse credentials for "${id}".`);
    return null;
  }
}

// ─── Disconnect ──────────────────────────────────────────────────────────

export async function disconnect(orgId: string, integrationId: string): Promise<void> {
  const existing = await integrationsRepo.findById(integrationId, orgId);
  if (!existing) {
    throw new ApiError("Integration not found.", 404);
  }
  await integrationsRepo.remove(integrationId, orgId);
  await integrationsRepo.writeLog(orgId, `${integrationId} Integration successfully disconnected.`);
}

// ─── Shiprocket ──────────────────────────────────────────────────────────

export async function connectShiprocket(
  orgId: string,
  input: ConnectShiprocketInput,
  origin: string
): Promise<ConnectResult> {
  const { email, password } = input;
  if (!email || !password) {
    throw new ApiError("Shiprocket email and password are required.", 400);
  }

  // Validate credentials against the Shiprocket API — throws on failure.
  const token = await authenticateShiprocket(email, password);

  const creds: ShiprocketCredentials = { email, token };
  await integrationsRepo.upsert("shiprocket", orgId, {
    name: "Shiprocket",
    description: "Auto-notify customers on ship, OFD, delivery, NDR, and RTO via WhatsApp.",
    status: "connected",
    icon: "Truck",
    apiKey: encryptSecret(JSON.stringify(creds)),
  });

  await integrationsRepo.writeLog(orgId, `Shiprocket connected (${email}).`);

  // Webhook URL the merchant must configure in the Shiprocket dashboard
  // under Settings → API → Webhooks.
  const webhookUrl = `${origin}/api/webhooks/shiprocket?orgId=${orgId}`;

  return { success: true, webhookUrl };
}

// ─── Razorpay ────────────────────────────────────────────────────────────

export async function connectRazorpay(
  orgId: string,
  input: ConnectRazorpayInput
): Promise<ConnectResult> {
  const { keyId, keySecret, webhookSecret } = input;
  if (!keyId || !keySecret) {
    throw new ApiError("Key ID and Key Secret are required.", 400);
  }

  const creds: RazorpayCredentials = { keyId, keySecret, webhookSecret: webhookSecret || "" };
  await integrationsRepo.upsert("razorpay", orgId, {
    name: "Razorpay",
    description: "Receive payments directly to your Razorpay account.",
    status: "connected",
    icon: "CreditCard",
    apiKey: encryptSecret(JSON.stringify(creds)),
  });

  await integrationsRepo.writeLog(orgId, `Razorpay Connected via manual keys.`);

  return { success: true };
}

// ─── Shopify (manual / developer-mode credentials) ────────────────────────

export async function connectShopify(
  orgId: string,
  input: ConnectShopifyInput,
  origin: string
): Promise<ConnectResult> {
  const { shopDomain, accessToken } = input;
  if (!shopDomain || !accessToken) {
    throw new ApiError("Shop domain and access token are required.", 400);
  }

  // Sanitize shop domain.
  let cleanShop = shopDomain.replace(/^https?:\/\//, "").trim();
  if (!cleanShop.includes(".")) {
    cleanShop = `${cleanShop}.myshopify.com`;
  }

  // Validate connection credentials by querying Shopify.
  let shopName = cleanShop.split(".")[0];
  try {
    const shopResponse = await fetch(`https://${cleanShop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });
    if (!shopResponse.ok) {
      throw new ApiError(
        "Failed to connect to Shopify. Please verify your shop domain and access token are correct.",
        400
      );
    }
    const shopData = await shopResponse.json();
    shopName = shopData.shop?.name || shopName;
  } catch (e: unknown) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(`Connection timeout or DNS failure. Details: ${e instanceof Error ? e.message : String(e)}`, 500);
  }

  const creds: ShopifyCredentials = { shopDomain: cleanShop, accessToken };
  await integrationsRepo.upsert("shopify", orgId, {
    name: "Shopify",
    description: "Sync products, track orders, recover carts, and automate post-purchase flows.",
    status: "connected",
    icon: "ShoppingBag",
    apiKey: encryptSecret(JSON.stringify(creds)),
    webhookUrl: `https://${cleanShop}`,
  });

  // Programmatically register webhooks for custom-app connections (skip on localhost).
  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
  const webhookReceiverUrl = `${origin}/api/webhooks/shopify`;

  const webhooksRegistered: string[] = [];
  let webhookWarning = "";

  if (isLocal) {
    webhookWarning =
      "Localhost environment detected. Skipping automatic Shopify webhook registration. Please set up a tunnel (e.g. ngrok) to receive real-time webhook updates.";
  } else {
    const topics = ["orders/create", "orders/fulfilled", "checkouts/create", "checkouts/update"];
    for (const topic of topics) {
      try {
        const webhookRes = await fetch(`https://${cleanShop}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({ webhook: { topic, address: webhookReceiverUrl, format: "json" } }),
        });
        if (webhookRes.ok) {
          webhooksRegistered.push(topic);
        }
      } catch (e) {
        console.error(`❌ Webhook subscription failed for ${topic}:`, e);
      }
    }
  }

  await integrationsRepo.writeLog(
    orgId,
    `Shopify Connected: Store "${shopName}" (${cleanShop}) connected manually via Developer Mode token.${
      webhooksRegistered.length > 0 ? ` Registered webhook topics: ${webhooksRegistered.join(", ")}.` : ""
    }`
  );

  return {
    success: true,
    shopName,
    shopDomain: cleanShop,
    webhooksRegistered,
    webhookWarning,
  };
}
