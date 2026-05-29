import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fbToken, orgId } = await request.json();
    if (!fbToken || !orgId) {
      return NextResponse.json({ error: "Missing fbToken or orgId" }, { status: 400 });
    }

    // 1. Look for WhatsApp Business Accounts directly shared with this token (Embedded Signup flow)
    let wabaId = "";
    let phoneNumberId = "";
    let foundBusinessId = "";

    const directWabaRes = await fetch(
      `https://graph.facebook.com/v21.0/me/whatsapp_business_accounts?access_token=${fbToken}`,
      { method: "GET" }
    );
    const directWabaData = await directWabaRes.json();

    if (directWabaRes.ok && directWabaData.data?.length > 0) {
      wabaId = directWabaData.data[0].id;
      
      // Get phone numbers for this WABA
      const phoneRes = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${fbToken}`,
        { method: "GET" }
      );
      const phoneData = await phoneRes.json();
      if (phoneRes.ok && phoneData.data?.length > 0) {
        phoneNumberId = phoneData.data[0].id;
      }
    }

    // 2. Fallback: Traverse Business Manager accounts if no WABA was found directly
    if (!wabaId) {
      const meRes = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name,businesses&access_token=${fbToken}`,
        { method: "GET" }
      );
      const meData = await meRes.json();
      
      if (meRes.ok) {
        const businesses = meData.businesses?.data || [];
        for (const business of businesses) {
          const wabaRes = await fetch(
            `https://graph.facebook.com/v21.0/${business.id}/owned_whatsapp_business_accounts?access_token=${fbToken}`,
            { method: "GET" }
          );
          const wabaData = await wabaRes.json();

          if (wabaRes.ok && wabaData.data?.length > 0) {
            wabaId = wabaData.data[0].id;
            foundBusinessId = business.id;

            // Get phone numbers for this WABA
            const phoneRes = await fetch(
              `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${fbToken}`,
              { method: "GET" }
            );
            const phoneData = await phoneRes.json();
            if (phoneRes.ok && phoneData.data?.length > 0) {
              phoneNumberId = phoneData.data[0].id;
            }
            break;
          }
        }
      }
    }

    // 3. Store credentials in the organization (token is NOT persisted — system user token used for API calls)
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        whatsappBusinessAccountId: wabaId || null,
        whatsappPhoneNumberId: phoneNumberId || null,
        metaBusinessId: foundBusinessId || null,
        whatsappConnected: true,
      },
    });

    return NextResponse.json({
      ok: true,
      businessAccountId: wabaId || null,
      phoneNumberId: phoneNumberId || null,
      businessId: foundBusinessId || null,
      message: wabaId ? "Connected automatically." : "Token saved. Please select a number in Settings.",
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
