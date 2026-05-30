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
      select: {
        metaBusinessId: true,
        whatsappBusinessAccountId: true,
        whatsappPhoneNumberId: true,
        whatsappAccessToken: true,
        whatsappAuthMethod: true,
      }
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }



    const token = org.whatsappAccessToken;
    const portfolios: { wabaId: string; name: string; phoneNumbers: unknown[] }[] = [];

    if (token) {
      const wabaIds = new Set<string>();

      // 1. Fetch assigned WABAs directly from the customer's token
      const assignedRes = await fetch(
        `https://graph.facebook.com/v21.0/me/whatsapp_business_accounts?fields=id,name&access_token=${token}`
      );
      if (assignedRes.ok) {
        const assignedData = await assignedRes.json();
        for (const w of assignedData.data || []) {
          wabaIds.add(w.id);
        }
      }
      // 2. Always include the currently stored WABA
      if (org.whatsappBusinessAccountId) {
        wabaIds.add(org.whatsappBusinessAccountId);
      }

      // Fetch details + phone numbers for each WABA
      await Promise.all(
        Array.from(wabaIds).map(async (wabaId) => {
          const [wabaRes, phoneRes] = await Promise.all([
            fetch(`https://graph.facebook.com/v21.0/${wabaId}?fields=id,name&access_token=${token}`),
            fetch(`https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?fields=id,display_phone_number,quality_rating&access_token=${token}`)
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
        })
      );
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
        whatsappConnected: true,
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
