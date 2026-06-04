import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

/**
 * POST /api/whatsapp/connect
 * 
 * Called after Embedded Signup completes. The customer's short-lived token 
 * is used ONLY to fetch their WABA details, then discarded.
 * 
 * Flow:
 * 1. Customer completes Meta Embedded Signup in the browser
 * 2. Frontend receives a short-lived code/token from the SDK callback
 * 3. Frontend POSTs { orgId, code } to this endpoint
 * 4. Backend exchanges the code for a short-lived user token
 * 5. Backend uses the short-lived token to discover the customer's WABA + phone numbers
 * 6. Backend stores ONLY the WABA ID, phone number ID, and business ID
 * 7. The short-lived token is NEVER stored — it's discarded after this request
 * 
 * All subsequent API calls use the platform's System User Token.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orgId, code } = body;

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({ error: "Missing authorization code from Embedded Signup" }, { status: 400 });
    }

    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.json({ error: "Meta App configuration missing (APP_ID or APP_SECRET)" }, { status: 500 });
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
      return NextResponse.json({ 
        error: `Failed to exchange authorization code: ${tokenData.error?.message || "Unknown error"}` 
      }, { status: 400 });
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
      return NextResponse.json({ 
        error: "No WhatsApp Business Accounts found. Please ensure you completed the signup and granted permissions." 
      }, { status: 400 });
    }

    // ─── Fetch Catalogs ──────────────────────────────────────────────────────
    let metaCatalogId = null;
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
      } catch (err) {
        console.error("[Connect] Failed to fetch catalogs:", err);
      }
    }

    // ─── Step 3: Fetch phone numbers for discovered WABAs ────────────────
    const portfolios: { 
      wabaId: string; 
      name: string; 
      phoneNumbers: { id: string; display_phone_number: string; verified_name?: string; quality_rating?: string }[] 
    }[] = [];

    for (const wabaId of wabaIds) {
      try {
        const [wabaDetailRes, phoneRes] = await Promise.all([
          fetch(
            `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${wabaId}?fields=id,name&access_token=${shortLivedToken}`
          ),
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

      await prisma.organization.update({
        where: { id: orgId },
        data: {
          whatsappBusinessAccountId: selectedWaba.wabaId,
          whatsappPhoneNumberId: selectedPhone.id,
          metaBusinessId: businessId,
          metaCatalogId,
          whatsappConnected: true,
        },
      });

      // Log the connection
      const d = new Date();
      const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      await prisma.systemLog.create({
        data: {
          timestamp: timeStr,
          type: "crm",
          message: `WhatsApp connected: WABA "${selectedWaba.name}" (${selectedWaba.wabaId}), Phone: ${selectedPhone.display_phone_number}`,
          organizationId: orgId,
        },
      });

      // Short-lived token is NOT stored — discarded here
      return NextResponse.json({
        status: "connected",
        wabaId: selectedWaba.wabaId,
        wabaName: selectedWaba.name,
        phoneNumberId: selectedPhone.id,
        displayPhoneNumber: selectedPhone.display_phone_number,
        businessId,
        metaCatalogId,
      });
    }

    // Multiple WABAs or phone numbers — return the list for user to select
    // Short-lived token is NOT stored — discarded here
    return NextResponse.json({
      status: "selection_required",
      portfolios,
      businessId,
      metaCatalogId,
    });
  } catch (err: unknown) {
    console.error("[Connect] Embedded Signup connect error:", err);
    return NextResponse.json({ 
      error: (err instanceof Error ? err.message : String(err)) || "Internal server error" 
    }, { status: 500 });
  }
}
