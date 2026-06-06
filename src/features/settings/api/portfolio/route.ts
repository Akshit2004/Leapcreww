import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";
import { Prisma } from "@prisma/client";

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

/**
 * GET /api/whatsapp/portfolio?orgId=xxx
 * 
 * Returns the org's connected WABA and its phone numbers.
 * Uses the System User Token to query Graph API.
 * The tenant only sees their own connected WABA — not all WABAs in the platform.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        metaBusinessId: true,
        whatsappBusinessAccountId: true,
        whatsappPhoneNumberId: true,
        whatsappConnected: true,
      }
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    const portfolios: { wabaId: string; name: string; phoneNumbers: unknown[] }[] = [];

    // Only fetch portfolio data if org has a connected WABA and system token is available
    if (systemToken && org.whatsappBusinessAccountId) {
      try {
        const [wabaRes, phoneRes] = await Promise.all([
          fetch(
            `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${org.whatsappBusinessAccountId}?fields=id,name`,
            { headers: { Authorization: `Bearer ${systemToken}` } }
          ),
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

    return NextResponse.json({
      activeWabaId: org.whatsappBusinessAccountId,
      activePhoneNumberId: org.whatsappPhoneNumberId,
      portfolios,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/portfolio
 * 
 * Switch active WABA and phone number for this org.
 * Used during onboarding when tenant selects their WABA/phone from Embedded Signup.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { orgId, wabaId, phoneNumberId, metaCatalogId } = body;

    if (!orgId || !wabaId || !phoneNumberId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const dataToUpdate: Prisma.OrganizationUpdateInput = {
      whatsappBusinessAccountId: wabaId,
      whatsappPhoneNumberId: phoneNumberId,
      whatsappConnected: true,
    };
    if (metaCatalogId) {
      dataToUpdate.metaCatalogId = metaCatalogId;
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: dataToUpdate
    });

    // Trigger background sync of all active products to the new Meta catalog if connected
    if (metaCatalogId) {
      import("@/shared/lib/meta-catalog")
        .then((m) => m.syncAllProductsToMeta(orgId))
        .catch((e) => console.error("[Portfolio] Product background sync trigger failed:", e));
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
