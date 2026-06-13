/**
 * shopifySyncService.ts — Shopify catalog → LeapCreww Product sync.
 *
 * Pulls products from the org's connected Shopify store and upserts them into
 * the tenant's Product catalog. All access is org-scoped: the caller (an
 * org-scoped, ADMIN-guarded route) supplies a verified `orgId`. Throws
 * ApiError so the route can translate failures into clean HTTP responses.
 */
import { ApiError } from "@/shared/lib/api";
import * as integrationsRepo from "../repositories/integrationsRepo";
import * as shopifyProductRepo from "../repositories/shopifyProductRepo";

// Minimal shape of the Shopify Admin API product payload we consume.
interface ShopifyVariant {
  price?: string;
  inventory_quantity?: number;
}
interface ShopifyProduct {
  title?: string;
  body_html?: string;
  product_type?: string;
  variants?: ShopifyVariant[];
  images?: { src: string }[];
  image?: { src: string };
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=300&auto=format&fit=crop";

/**
 * Sync the connected Shopify store's catalog into the org's products.
 * Returns the number of products imported/updated.
 */
export async function syncShopifyCatalog(orgId: string): Promise<{ synced: number }> {
  // A. Fetch Shopify credentials for this org.
  const integration = await integrationsRepo.findById("shopify", orgId);

  if (!integration || !integration.apiKey || integration.status !== "connected") {
    throw new ApiError("Shopify is not connected for this organization. Please connect it first.", 400);
  }

  let shopDomain: string;
  let accessToken: string;
  try {
    ({ shopDomain, accessToken } = JSON.parse(integration.apiKey));
  } catch {
    throw new ApiError("Invalid Shopify credentials in database.", 400);
  }
  if (!shopDomain || !accessToken) {
    throw new ApiError("Invalid Shopify credentials in database.", 400);
  }

  // B. Fetch products from the Shopify Admin API.
  const shopifyProductsUrl = `https://${shopDomain}/admin/api/2024-04/products.json?limit=50`;
  const response = await fetch(shopifyProductsUrl, {
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error("❌ Shopify product fetch failed:", err);
    throw new ApiError("Failed to fetch products from Shopify API.", 502);
  }

  const data = await response.json();
  const shopifyProducts: ShopifyProduct[] = data.products || [];

  // C. Map & upsert products into the org's catalog.
  let syncedCount = 0;

  for (const sp of shopifyProducts) {
    const firstVariant = sp.variants?.[0];
    const rawPrice = parseFloat(firstVariant?.price || "0");
    const priceInPaise = Math.round(rawPrice * 100); // prices stored in paise (₹1 = 100)

    const totalStock =
      sp.variants?.reduce((sum, variant) => sum + (variant.inventory_quantity || 0), 0) || 10;

    const images = sp.images?.map((img) => img.src) || [];
    if (images.length === 0 && sp.image?.src) {
      images.push(sp.image.src);
    }
    if (images.length === 0) {
      images.push(FALLBACK_IMAGE);
    }

    const productPayload = {
      name: sp.title || "Shopify Product",
      description: sp.body_html?.replace(/<[^>]*>/g, "") || "Imported Shopify product",
      price: priceInPaise,
      images,
      category: sp.product_type || "Shopify",
      stock: totalStock,
      isActive: true,
    };

    const existingProduct = await shopifyProductRepo.findByName(sp.title, orgId);

    if (existingProduct) {
      await shopifyProductRepo.update(existingProduct.id, productPayload);
    } else {
      await shopifyProductRepo.create(orgId, productPayload);
    }

    syncedCount++;
  }

  // D. Record the sync in the activity stream.
  await integrationsRepo.writeLog(
    orgId,
    `Catalog Sync Success: Imported and updated ${syncedCount} products from Shopify.`
  );

  return { synced: syncedCount };
}
