/**
 * whatsappConnectionService.ts — Meta Embedded Signup, connection status,
 * portfolio selection, and catalog provisioning/sync.
 *
 * Extracted verbatim from the old connect/disconnect/status/portfolio/catalog
 * routes so the routes stay thin. All Meta Graph API calls and Prisma access
 * live here.
 */
import { ApiError } from "@/shared/lib/api";
import { syncAllProductsToMeta } from "@/shared/lib/meta-catalog";
import * as repo from "../repositories/whatsappSettingsRepo";
import type {
  CatalogSyncResult,
  ConnectResult,
  PortfolioResult,
  StatusResult,
  SwitchPortfolioInput,
  WabaPortfolio,
} from "../types";

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

/**
 * Handle the Embedded Signup callback. The customer's short-lived token is
 * used ONLY to discover their WABA + phone numbers, then discarded — it is
 * never persisted. All subsequent calls use the platform's System User Token.
 */
export async function connectWhatsapp(organizationId: string, code: string): Promise<ConnectResult> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new ApiError("Meta App configuration missing (APP_ID or APP_SECRET)", 500);
  }

  // ─── Step 1: Exchange code for short-lived user access token ──────────
  const tokenRes = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/oauth/access_token?` +
      `client_id=${appId}&client_secret=${appSecret}&code=${code}`,
    { method: "GET" }
  );
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {
    console.error("[Connect] Token exchange failed:", tokenData);
    throw new ApiError(
      `Failed to exchange authorization code: ${tokenData.error?.message || "Unknown error"}`,
      400
    );
  }

  const shortLivedToken = tokenData.access_token;

  // ─── Step 2: Discover customer's WABAs using the short-lived token ────
  const wabaRes = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/debug_token?input_token=${shortLivedToken}`,
    { headers: { Authorization: `Bearer ${appId}|${appSecret}` } }
  );
  const wabaDebug = await wabaRes.json();

  // Extract business ID from the token debug info
  const granularScopes = wabaDebug?.data?.granular_scopes || [];
  const whatsappScope = granularScopes.find(
    (s: { scope: string }) => s.scope === "whatsapp_business_management"
  );
  const wabaIds: string[] = whatsappScope?.target_ids || [];

  // Also try fetching WABA from the shared WABAs endpoint
  const sharedWabaRes = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/me/businesses?fields=id,name&access_token=${shortLivedToken}`
  );
  const businessData = sharedWabaRes.ok ? await sharedWabaRes.json() : { data: [] };
  const businessId = businessData.data?.[0]?.id || null;

  if (wabaIds.length === 0) {
    // Fallback: try fetching WABAs directly
    const directWabaRes = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/me/whatsapp_business_accounts?access_token=${shortLivedToken}`
    );
    const directWabaData = directWabaRes.ok ? await directWabaRes.json() : { data: [] };
    for (const w of directWabaData.data || []) {
      wabaIds.push(w.id);
    }
  }

  if (wabaIds.length === 0) {
    throw new ApiError(
      "No WhatsApp Business Accounts found. Please ensure you completed the signup and granted permissions.",
      400
    );
  }

  // ─── Fetch / Create Catalogs ──────────────────────────────────────────
  let metaCatalogId: string | null = null;
  if (businessId) {
    try {
      const catRes = await fetch(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${businessId}/owned_product_catalogs?access_token=${shortLivedToken}`
      );
      const catData = catRes.ok ? await catRes.json() : { data: [] };
      if (catData.data && catData.data.length > 0) {
        metaCatalogId = catData.data[0].id;
      } else {
        // Fallback check client_product_catalogs
        const clientCatRes = await fetch(
          `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${businessId}/client_product_catalogs?access_token=${shortLivedToken}`
        );
        const clientCatData = clientCatRes.ok ? await clientCatRes.json() : { data: [] };
        if (clientCatData.data && clientCatData.data.length > 0) {
          metaCatalogId = clientCatData.data[0].id;
        }
      }

      // If no catalog was found, automatically create and link one
      if (!metaCatalogId) {
        console.log(`[Connect] No catalog found. Creating new catalog programmatically under business ${businessId}...`);
        const orgRecord = await repo.findOrgForConnect(organizationId);
        const newCatName = orgRecord ? `${orgRecord.name} Store Catalog` : "LeapCreww Store Catalog";

        const createCatRes = await fetch(
          `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${businessId}/owned_product_catalogs`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              access_token: shortLivedToken,
              name: newCatName,
            }),
          }
        );
        const createCatData = await createCatRes.json();
        if (createCatRes.ok && createCatData.id) {
          metaCatalogId = createCatData.id;
          console.log(`[Connect] Programmatic catalog created: ${metaCatalogId}`);

          // Link the new catalog to all discovered WABAs
          for (const wabaId of wabaIds) {
            try {
              console.log(`[Connect] Linking catalog ${metaCatalogId} to WABA ${wabaId}...`);
              await fetch(
                `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${wabaId}/product_catalogs`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: new URLSearchParams({
                    access_token: shortLivedToken,
                    catalog_id: metaCatalogId as string,
                  }),
                }
              );
            } catch (linkErr) {
              console.error(`[Connect] Failed to link catalog to WABA ${wabaId}:`, linkErr);
            }
          }
        } else {
          console.error("[Connect] Programmatic catalog creation failed:", createCatData);
        }
      }
    } catch (err) {
      console.error("[Connect] Failed to fetch/create catalogs:", err);
    }
  }

  // ─── Step 3: Fetch phone numbers for discovered WABAs ────────────────
  const portfolios: WabaPortfolio[] = [];

  for (const wabaId of wabaIds) {
    try {
      const [wabaDetailRes, phoneRes] = await Promise.all([
        fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${wabaId}?fields=id,name&access_token=${shortLivedToken}`),
        fetch(
          `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${wabaId}/phone_numbers?fields=id,display_phone_number,quality_rating,verified_name&access_token=${shortLivedToken}`
        ),
      ]);

      const wabaDetail = wabaDetailRes.ok ? await wabaDetailRes.json() : { id: wabaId, name: `WABA ${wabaId}` };
      const phoneData = phoneRes.ok ? await phoneRes.json() : { data: [] };

      portfolios.push({
        wabaId: wabaDetail.id,
        name: wabaDetail.name || `WABA (${wabaDetail.id})`,
        phoneNumbers: phoneData.data || [],
      });
    } catch (fetchErr) {
      console.error(`[Connect] Failed to fetch WABA ${wabaId}:`, fetchErr);
    }
  }

  // If there's exactly one WABA with one phone number, auto-connect
  if (portfolios.length === 1 && portfolios[0].phoneNumbers.length === 1) {
    const selectedWaba = portfolios[0];
    const selectedPhone = selectedWaba.phoneNumbers[0];

    await repo.setConnection(organizationId, {
      whatsappBusinessAccountId: selectedWaba.wabaId,
      whatsappPhoneNumberId: selectedPhone.id,
      metaBusinessId: businessId,
      metaCatalogId,
    });

    // Trigger background sync of all active products to the new Meta catalog if connected
    if (metaCatalogId) {
      syncAllProductsToMeta(organizationId).catch((e) =>
        console.error("[Connect] Product background sync trigger failed:", e)
      );
    }

    // Log the connection
    await repo.createLog({
      type: "crm",
      message: `WhatsApp connected: WABA "${selectedWaba.name}" (${selectedWaba.wabaId}), Phone: ${selectedPhone.display_phone_number}`,
      organizationId,
    });

    // Short-lived token is NOT stored — discarded here
    return {
      status: "connected",
      wabaId: selectedWaba.wabaId,
      wabaName: selectedWaba.name,
      phoneNumberId: selectedPhone.id,
      displayPhoneNumber: selectedPhone.display_phone_number,
      businessId,
      metaCatalogId,
    };
  }

  // Multiple WABAs or phone numbers — return the list for user to select
  // Short-lived token is NOT stored — discarded here
  return {
    status: "selection_required",
    portfolios,
    businessId,
    metaCatalogId,
  };
}

/** Disconnect the org's WhatsApp Business Account. */
export async function disconnectWhatsapp(organizationId: string): Promise<void> {
  await repo.clearConnection(organizationId);

  await repo.createLog({
    type: "crm",
    message: "WhatsApp Business Account disconnected from workspace.",
    organizationId,
  });
}

/** Return the org's current connection status. */
export async function getStatus(organizationId: string): Promise<StatusResult> {
  const org = await repo.findOrgConnectionInfo(organizationId);
  if (!org) throw new ApiError("Organization not found", 404);

  return {
    connected: org.whatsappConnected,
    businessAccountId: org.whatsappBusinessAccountId,
    phoneNumberId: org.whatsappPhoneNumberId,
    businessId: org.metaBusinessId,
  };
}

/**
 * Return the org's connected WABA and its phone numbers, using the System
 * User Token. The tenant only sees their own connected WABA.
 */
export async function getPortfolio(organizationId: string): Promise<PortfolioResult> {
  const org = await repo.findOrgConnectionInfo(organizationId);
  if (!org) throw new ApiError("Organization not found", 404);

  const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  const portfolios: PortfolioResult["portfolios"] = [];

  // Only fetch portfolio data if org has a connected WABA and system token is available
  if (systemToken && org.whatsappBusinessAccountId) {
    try {
      const [wabaRes, phoneRes] = await Promise.all([
        fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${org.whatsappBusinessAccountId}?fields=id,name`, {
          headers: { Authorization: `Bearer ${systemToken}` },
        }),
        fetch(
          `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${org.whatsappBusinessAccountId}/phone_numbers?fields=id,display_phone_number,quality_rating,verified_name`,
          { headers: { Authorization: `Bearer ${systemToken}` } }
        ),
      ]);

      if (wabaRes.ok) {
        const wabaData = await wabaRes.json();
        const phoneNumbers = phoneRes.ok ? (await phoneRes.json()).data ?? [] : [];
        portfolios.push({
          wabaId: wabaData.id,
          name: wabaData.name || `WABA (${wabaData.id})`,
          phoneNumbers,
        });
      }
    } catch (fetchErr) {
      console.error("[Portfolio] Failed to fetch WABA data:", fetchErr);
    }
  }

  return {
    activeWabaId: org.whatsappBusinessAccountId,
    activePhoneNumberId: org.whatsappPhoneNumberId,
    portfolios,
  };
}

/**
 * Switch the active WABA and phone number for this org. Used during
 * onboarding when the tenant selects their WABA/phone from Embedded Signup.
 */
export async function switchPortfolio(organizationId: string, input: SwitchPortfolioInput): Promise<void> {
  const { wabaId, phoneNumberId, metaCatalogId } = input;

  await repo.updateConnection(organizationId, {
    whatsappBusinessAccountId: wabaId,
    whatsappPhoneNumberId: phoneNumberId,
    whatsappConnected: true,
    ...(metaCatalogId ? { metaCatalogId } : {}),
  });

  // Trigger background sync of all active products to the new Meta catalog if connected
  if (metaCatalogId) {
    syncAllProductsToMeta(organizationId).catch((e) =>
      console.error("[Portfolio] Product background sync trigger failed:", e)
    );
  }
}

/**
 * Manually trigger a Catalog check, repair, and product synchronization.
 * If the organization is connected to WhatsApp but has no metaCatalogId, it
 * programmatically creates one, links it to their WABA, and syncs products.
 */
export async function syncCatalog(organizationId: string): Promise<CatalogSyncResult> {
  const org = await repo.findOrgConnectionInfo(organizationId);
  if (!org) throw new ApiError("Organization not found", 404);

  if (!org.whatsappConnected || !org.whatsappBusinessAccountId || !org.metaBusinessId) {
    throw new ApiError("WhatsApp Business Account is not connected. Complete WhatsApp Setup first.", 400);
  }

  const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  if (!systemToken) {
    throw new ApiError("System token configuration missing on backend", 500);
  }

  let catalogId = org.metaCatalogId;

  // 1. Repair flow: If metaCatalogId is missing, create it programmatically
  if (!catalogId) {
    console.log(`[Catalog Sync] Creating catalog programmatically for org ${org.name} (${org.id})...`);
    const newCatName = `${org.name} Store Catalog`;

    const createCatRes = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${org.metaBusinessId}/owned_product_catalogs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          access_token: systemToken,
          name: newCatName,
        }),
      }
    );

    const createCatData = await createCatRes.json();

    if (!createCatRes.ok || !createCatData.id) {
      console.error("[Catalog Sync] Failed to create catalog:", createCatData);
      throw new ApiError(`Failed to create catalog on Meta: ${createCatData.error?.message || "Unknown error"}`, 400);
    }

    catalogId = createCatData.id as string;
    console.log(`[Catalog Sync] Catalog created successfully: ${catalogId}`);

    // Link catalog to WABA
    console.log(`[Catalog Sync] Linking catalog ${catalogId} to WABA ${org.whatsappBusinessAccountId}...`);
    const linkRes = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${org.whatsappBusinessAccountId}/product_catalogs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          access_token: systemToken,
          catalog_id: catalogId,
        }),
      }
    );

    const linkData = await linkRes.json();
    if (!linkRes.ok) {
      console.error("[Catalog Sync] Failed to link catalog to WABA:", linkData);
      throw new ApiError(`Failed to link catalog to WABA: ${linkData.error?.message || "Unknown error"}`, 400);
    }

    // Save the catalog ID to the database
    await repo.setCatalogId(organizationId, catalogId);
    console.log(`[Catalog Sync] Set metaCatalogId = '${catalogId}' in database.`);
  }

  // 2. Synchronize all active products to the catalog
  console.log(`[Catalog Sync] Triggering product sync for org ${organizationId} to catalog ${catalogId}...`);
  await syncAllProductsToMeta(organizationId);

  return {
    success: true,
    catalogId,
    message: "Catalog initialized and products successfully queued for sync.",
  };
}
