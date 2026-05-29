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

    const { orgId } = await request.json();
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    const bmId = process.env.META_BUSINESS_MANAGER_ID;
    if (!bmId) {
      return NextResponse.json({ error: "META_BUSINESS_MANAGER_ID not configured" }, { status: 500 });
    }

    const inviteUrl = `https://business.facebook.com/latest/partner_directory_request/?partner_id=${bmId}`;

    return NextResponse.json({
      url: inviteUrl,
      bmId,
      message: "Share this link with the customer or open it to grant your System User access to their WABA.",
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { whatsappBusinessAccountId: true, metaBusinessId: true },
    });

    if (!org || !org.whatsappBusinessAccountId) {
      return NextResponse.json({ hasAccess: false, wabaId: null });
    }

    const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    if (!systemToken) {
      return NextResponse.json({ hasAccess: false, wabaId: org.whatsappBusinessAccountId, bmId: org.metaBusinessId || null });
    }

    const res = await fetch(
      `https://graph.facebook.com/v25.0/${org.whatsappBusinessAccountId}?fields=id,name&access_token=${systemToken}`
    );

    return NextResponse.json({
      hasAccess: res.ok,
      wabaId: org.whatsappBusinessAccountId,
      bmId: org.metaBusinessId || null,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
