/**
 * shopifyAdmin.ts — Shopify Admin REST API client.
 *
 * Credentials are loaded once via getShopifyCredentials(orgId) and passed
 * directly to the action functions to avoid redundant DB lookups in loops.
 */
import { prisma } from "@/shared/lib/prisma";
import { decryptSecretSafe } from "@/shared/lib/crypto";

const SHOPIFY_API_VERSION = "2024-04";

export interface ShopifyCredentials {
  shopDomain: string;   // e.g. "mystore.myshopify.com"
  accessToken: string;
}

function shopifyHeaders(accessToken: string) {
  return {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  };
}

function adminUrl(shopDomain: string, path: string) {
  return `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/${path}`;
}

/** Load and decrypt Shopify credentials for an org. Returns null if not connected. */
export async function getShopifyCredentials(orgId: string): Promise<ShopifyCredentials | null> {
  const integration = await prisma.integration.findFirst({
    where: { id: "shopify", organizationId: orgId, status: "connected" },
    select: { apiKey: true },
  });
  if (!integration?.apiKey) return null;

  try {
    const decrypted = decryptSecretSafe(integration.apiKey);
    const creds = JSON.parse(decrypted) as Record<string, unknown>;
    const shopDomain = creds.shopDomain as string;
    const accessToken = creds.accessToken as string;
    if (!shopDomain || !accessToken) return null;
    return { shopDomain, accessToken };
  } catch {
    console.warn("[shopifyAdmin] Failed to decrypt credentials for org", orgId);
    return null;
  }
}

/**
 * Add tags to a Shopify order. Fetches existing tags first so we never
 * overwrite them — Shopify replaces the whole tag list on PUT.
 */
export async function tagShopifyOrder(
  creds: ShopifyCredentials,
  shopifyNumericId: string,
  tags: string[],
): Promise<void> {
  const fetchRes = await fetch(adminUrl(creds.shopDomain, `orders/${shopifyNumericId}.json`), {
    headers: shopifyHeaders(creds.accessToken),
  });
  if (!fetchRes.ok) {
    console.warn(`[shopifyAdmin] tagShopifyOrder fetch failed: ${fetchRes.status}`);
    return;
  }
  const existing = (await fetchRes.json()) as { order?: { tags?: string } };
  const existingTags = existing.order?.tags
    ? existing.order.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  const merged = Array.from(new Set([...existingTags, ...tags])).join(", ");

  const putRes = await fetch(adminUrl(creds.shopDomain, `orders/${shopifyNumericId}.json`), {
    method: "PUT",
    headers: shopifyHeaders(creds.accessToken),
    body: JSON.stringify({ order: { id: shopifyNumericId, tags: merged } }),
  });
  if (!putRes.ok) {
    console.warn(`[shopifyAdmin] tagShopifyOrder PUT failed: ${putRes.status}`);
  }
}

/**
 * Place a fulfillment hold on the first open fulfillment order for a Shopify order.
 * Returns the fulfillment order ID (needed to release later), or null on failure.
 *
 * Reason is fixed to "high_risk_of_fraud" — the only semantically correct value
 * for COD risk holds. reason_notes carries the human-readable scorer output.
 */
export async function placeFulfillmentHold(
  creds: ShopifyCredentials,
  shopifyNumericId: string,
  reasonNotes: string,
): Promise<string | null> {
  // 1. Get fulfillment orders
  const foRes = await fetch(
    adminUrl(creds.shopDomain, `orders/${shopifyNumericId}/fulfillment_orders.json`),
    { headers: shopifyHeaders(creds.accessToken) },
  );
  if (!foRes.ok) {
    console.warn(`[shopifyAdmin] placeFulfillmentHold: fulfillment_orders fetch ${foRes.status}`);
    return null;
  }
  const foData = (await foRes.json()) as {
    fulfillment_orders?: Array<{ id: string | number; status: string }>;
  };
  const openFo = foData.fulfillment_orders?.find((fo) => fo.status === "open");
  if (!openFo) {
    console.warn(`[shopifyAdmin] placeFulfillmentHold: no open fulfillment order for ${shopifyNumericId}`);
    return null;
  }

  // 2. Place hold
  const holdRes = await fetch(
    adminUrl(creds.shopDomain, `fulfillment_orders/${openFo.id}/holds.json`),
    {
      method: "POST",
      headers: shopifyHeaders(creds.accessToken),
      body: JSON.stringify({
        fulfillment_hold: {
          reason: "high_risk_of_fraud",
          reason_notes: reasonNotes.slice(0, 255),
          notify_merchant: true,
        },
      }),
    },
  );
  if (!holdRes.ok) {
    console.warn(`[shopifyAdmin] placeFulfillmentHold: hold POST ${holdRes.status}`);
    return null;
  }
  return String(openFo.id);
}

/**
 * Release a fulfillment hold.
 * POST /fulfillment_orders/{id}/release_hold.json
 */
export async function releaseFulfillmentHold(
  creds: ShopifyCredentials,
  fulfillmentOrderId: string,
): Promise<void> {
  const res = await fetch(
    adminUrl(creds.shopDomain, `fulfillment_orders/${fulfillmentOrderId}/release_hold.json`),
    { method: "POST", headers: shopifyHeaders(creds.accessToken), body: "{}" },
  );
  if (!res.ok) {
    throw new Error(`[shopifyAdmin] releaseFulfillmentHold: ${res.status} for fo ${fulfillmentOrderId}`);
  }
}

/**
 * Update the shipping address on a Shopify order.
 * address is the free-text string the customer replied with — stored as address1.
 */
export async function updateOrderShippingAddress(
  creds: ShopifyCredentials,
  shopifyNumericId: string,
  address: string,
): Promise<void> {
  const res = await fetch(adminUrl(creds.shopDomain, `orders/${shopifyNumericId}.json`), {
    method: "PUT",
    headers: shopifyHeaders(creds.accessToken),
    body: JSON.stringify({
      order: {
        id: shopifyNumericId,
        shipping_address: {
          address1: address.slice(0, 255),
          city: "",
          zip: "",
          country: "India",
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`[shopifyAdmin] updateOrderShippingAddress: ${res.status} for order ${shopifyNumericId}`);
  }
}
