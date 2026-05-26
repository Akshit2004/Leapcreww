import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { whatsappAccessToken: true, whatsappBusinessAccountId: true, whatsappPhoneNumberId: true }
    });

    if (!org || !org.whatsappAccessToken) {
      return NextResponse.json({ error: "WhatsApp not connected" }, { status: 404 });
    }

    const fbToken = org.whatsappAccessToken;
    const portfolios = [];

    // 1. Try fetching WABAs directly associated with the user
    interface MeWaba {
      id: string;
      name?: string;
    }
    const wabas: MeWaba[] = [];
    const directRes = await fetch(`https://graph.facebook.com/v25.0/me/whatsapp_business_accounts?access_token=${fbToken}`);
    if (directRes.ok) {
      const data = await directRes.json();
      if (data.data) wabas.push(...data.data);
    }

    // 2. If no WABAs found directly, try fetching via businesses
    if (wabas.length === 0) {
      const meRes = await fetch(`https://graph.facebook.com/v25.0/me?fields=businesses&access_token=${fbToken}`);
      if (meRes.ok) {
        const meData = await meRes.json();
        const businesses = meData.businesses?.data || [];
        for (const b of businesses) {
          const bWabaRes = await fetch(`https://graph.facebook.com/v25.0/${b.id}/owned_whatsapp_business_accounts?access_token=${fbToken}`);
          if (bWabaRes.ok) {
            const bWabaData = await bWabaRes.json();
            if (bWabaData.data) wabas.push(...bWabaData.data);
          }
        }
      }
    }

    // 3. If still no WABAs, try debug_token to find the business
    if (wabas.length === 0) {
      const appId = process.env.META_APP_ID;
      const appSecret = process.env.META_APP_SECRET;
      if (appId && appSecret) {
        const debugRes = await fetch(`https://graph.facebook.com/v25.0/debug_token?input_token=${fbToken}&access_token=${appId}|${appSecret}`);
        if (debugRes.ok) {
          const debugData = await debugRes.json();
          const businessId = debugData.data?.business?.id;
          if (businessId) {
            const bWabaRes = await fetch(`https://graph.facebook.com/v25.0/${businessId}/owned_whatsapp_business_accounts?access_token=${fbToken}`);
            if (bWabaRes.ok) {
              const bWabaData = await bWabaRes.json();
              if (bWabaData.data) wabas.push(...bWabaData.data);
            }
          }
        }
      }
    }

    // Deduplicate WABAs just in case
    const uniqueWabas = Array.from(new Map(wabas.map(w => [w.id, w])).values());

    // 4. For each WABA, fetch phone numbers
    for (const waba of uniqueWabas) {
      const phoneRes = await fetch(`https://graph.facebook.com/v25.0/${waba.id}/phone_numbers?access_token=${fbToken}`);
      const phoneNumbers = phoneRes.ok ? (await phoneRes.json()).data : [];
      portfolios.push({
        wabaId: waba.id,
        name: waba.name || `WABA (${waba.id})`,
        phoneNumbers: phoneNumbers || []
      });
    }

    return NextResponse.json({
      activeWabaId: org.whatsappBusinessAccountId,
      activePhoneNumberId: org.whatsappPhoneNumberId,
      portfolios
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { orgId, wabaId, phoneNumberId } = body;

    if (!orgId || !wabaId || !phoneNumberId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        whatsappBusinessAccountId: wabaId,
        whatsappPhoneNumberId: phoneNumberId,
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
