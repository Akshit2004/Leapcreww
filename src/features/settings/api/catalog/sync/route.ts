import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";
import { syncAllProductsToMeta } from "@/shared/lib/meta-catalog";

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

/**
 * POST /api/whatsapp/catalog/sync
 * 
 * Manually trigger a Catalog check, repair, and product synchronization.
 * If the organization is connected to WhatsApp but has no metaCatalogId, 
 * it programmatically creates one, links it to their WABA, and syncs products.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orgId } = body;

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (!org.whatsappConnected || !org.whatsappBusinessAccountId || !org.metaBusinessId) {
      return NextResponse.json({ 
        error: "WhatsApp Business Account is not connected. Complete WhatsApp Setup first." 
      }, { status: 400 });
    }

    const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    if (!systemToken) {
      return NextResponse.json({ 
        error: "System token configuration missing on backend" 
      }, { status: 500 });
    }

    let catalogId = org.metaCatalogId;

    // 1. Repair flow: If metaCatalogId is missing, create it programmatically
    if (!catalogId) {
      console.log(`[Catalog Sync API] Creating catalog programmatically for org ${org.name} (${org.id})...`);
      const newCatName = `${org.name} Store Catalog`;

      const createCatRes = await fetch(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${org.metaBusinessId}/owned_product_catalogs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            access_token: systemToken,
            name: newCatName
          })
        }
      );

      const createCatData = await createCatRes.json();
      
      if (!createCatRes.ok || !createCatData.id) {
        console.error("[Catalog Sync API] Failed to create catalog:", createCatData);
        return NextResponse.json({ 
          error: `Failed to create catalog on Meta: ${createCatData.error?.message || "Unknown error"}` 
        }, { status: 400 });
      }

      catalogId = createCatData.id;
      console.log(`[Catalog Sync API] Catalog created successfully: ${catalogId}`);

      // Link catalog to WABA
      console.log(`[Catalog Sync API] Linking catalog ${catalogId} to WABA ${org.whatsappBusinessAccountId}...`);
      const linkRes = await fetch(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${org.whatsappBusinessAccountId}/product_catalogs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            access_token: systemToken,
            catalog_id: catalogId as string
          })
        }
      );

      const linkData = await linkRes.json();
      if (!linkRes.ok) {
        console.error("[Catalog Sync API] Failed to link catalog to WABA:", linkData);
        return NextResponse.json({ 
          error: `Failed to link catalog to WABA: ${linkData.error?.message || "Unknown error"}` 
        }, { status: 400 });
      }

      // Save the catalog ID to the database
      await prisma.organization.update({
        where: { id: orgId },
        data: { metaCatalogId: catalogId }
      });
      console.log(`[Catalog Sync API] Set metaCatalogId = '${catalogId}' in database.`);
    }

    // 2. Synchronize all active products to the catalog
    console.log(`[Catalog Sync API] Triggering product sync for org ${orgId} to catalog ${catalogId}...`);
    await syncAllProductsToMeta(orgId);

    return NextResponse.json({ 
      success: true, 
      catalogId,
      message: "Catalog initialized and products successfully queued for sync."
    });

  } catch (err: unknown) {
    console.error("[Catalog Sync API] Error:", err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : "Internal server error" 
    }, { status: 500 });
  }
}
