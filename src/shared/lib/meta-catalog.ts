import { prisma } from "./prisma";

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

/**
 * Syncs a WappFlow Product to Meta Commerce Catalog via Graph API
 */
export async function syncProductToMetaCatalog(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { organization: true },
  });

  if (!product || !product.organization.metaCatalogId) return;

  const catalogId = product.organization.metaCatalogId;
  const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  if (!systemToken) return;

  const retailerId = product.sku || product.id;
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${catalogId}/products`;

  // WhatsApp/Meta Commerce products usually require: retailer_id, name, description, price, currency, url, image_url, brand
  const formData = new URLSearchParams();
  formData.append("retailer_id", retailerId);
  formData.append("name", product.name);
  formData.append("description", product.description || product.name);
  formData.append("price", Math.floor(product.price).toString()); // Price is typically in cents/paise for API
  formData.append("currency", "INR"); // Hardcoded to INR for now as in marketplace.ts
  formData.append("url", "https://wappflow.com"); // Dummy URL if not provided
  formData.append("image_url", product.images?.[0] || "https://wappflow.com/placeholder.png");
  formData.append("brand", "WappFlow");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${systemToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[Meta Catalog Sync] Error:", data);
    } else {
      console.log(`[Meta Catalog Sync] Successfully synced product ${retailerId} to catalog ${catalogId}`);
    }
  } catch (err) {
    console.error("[Meta Catalog Sync] Exception:", err);
  }
}

export async function deleteProductFromMetaCatalog(productId: string, organizationId: string, sku?: string | null) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { metaCatalogId: true },
  });

  if (!org || !org.metaCatalogId) return;

  const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  if (!systemToken) return;

  const retailerId = sku || productId;
  
  // To delete a product, we need the Meta Product ID, but we can also delete by retailer_id using a catalog batch request
  // A simpler way if we don't store the Meta Product ID is to use the batch API
  const batchUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${org.metaCatalogId}/items_batch`;
  
  const payload = {
    requests: [
      {
        method: "DELETE",
        retailer_id: retailerId
      }
    ]
  };

  try {
    const res = await fetch(batchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${systemToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json();
      console.error("[Meta Catalog Sync] Delete Error:", data);
    }
  } catch (err) {
    console.error("[Meta Catalog Sync] Delete Exception:", err);
  }
}
