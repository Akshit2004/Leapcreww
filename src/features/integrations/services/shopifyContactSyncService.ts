/**
 * shopifyContactSyncService.ts — Shopify Customers → CRM Contact sync.
 *
 * Pulls customers from the org's connected Shopify store and upserts them as
 * CRM contacts with source="Shopify" and tag="shopify". Skips contacts that
 * have no phone number (WhatsApp requires phone). Deduplicates on
 * (organizationId, phone) so re-running is always safe.
 */

import { ApiError } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";
import * as integrationsRepo from "../repositories/integrationsRepo";

interface ShopifyCustomer {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  tags?: string;
  verified_email?: boolean;
}

export async function syncShopifyContacts(orgId: string): Promise<{ synced: number; skipped: number }> {
  const integration = await integrationsRepo.findById("shopify", orgId);

  if (!integration || !integration.apiKey || integration.status !== "connected") {
    throw new ApiError("Shopify is not connected for this organisation. Go to Integrations to connect.", 400);
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

  // Fetch customers — paginate up to 250 per page (Shopify max)
  const url = `https://${shopDomain}/admin/api/2024-04/customers.json?limit=250`;
  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(`Shopify API error: ${(err as any)?.errors || res.statusText}`, 502);
  }

  const data = await res.json();
  const customers: ShopifyCustomer[] = data.customers || [];

  const withPhone = customers.filter((c) => c.phone);
  const skipped = customers.length - withPhone.length;

  if (withPhone.length === 0) {
    return { synced: 0, skipped };
  }

  // Build contact rows — dedup on (organizationId, phone) via skipDuplicates
  const rows = withPhone.map((c) => ({
    name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Shopify Customer",
    phone: c.phone!,
    email: c.email || "",
    source: "Shopify",
    tags: ["shopify"],
    status: "Active",
    organizationId: orgId,
  }));

  const result = await prisma.contact.createMany({ data: rows, skipDuplicates: true });

  await integrationsRepo.writeLog(
    orgId,
    `Shopify Contact Sync: imported ${result.count} new contacts (${skipped} skipped — no phone).`
  );

  return { synced: result.count, skipped };
}
