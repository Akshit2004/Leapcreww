import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";
import { publishMetaAdCampaign } from "@/shared/lib/meta-ads";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    interface CustomSessionUser { id: string }
    const userId = (session.user as unknown as CustomSessionUser).id;

    // Verify workspace membership
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: orgId },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access forbidden" }, { status: 403 });
    }

    // Fetch campaigns with ads
    const campaigns = await prisma.adCampaign.findMany({
      where: { organizationId: orgId },
      include: { ads: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(campaigns);
  } catch (err: any) {
    console.error("[Ads API GET] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    interface CustomSessionUser { id: string }
    const userId = (session.user as unknown as CustomSessionUser).id;

    // Verify workspace membership
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: orgId },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, budget, objective, pageId, adAccountId, creative, linkedTemplate } = body;

    if (!name || !budget || !objective || !creative?.headline || !creative?.primaryText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Publish to Meta or simulate
    const publishRes = await publishMetaAdCampaign(orgId, {
      name,
      budget: parseFloat(budget),
      objective,
      pageId: pageId || "mock_page_id",
      adAccountId: adAccountId || "mock_ad_account_id",
      creative,
      linkedTemplate,
    });

    // 2. Save Campaign and Ad to Database
    const newCampaign = await prisma.adCampaign.create({
      data: {
        id: publishRes.campaignId,
        name,
        objective,
        budget: parseFloat(budget),
        status: "ACTIVE", // Or paused depending on status
        organizationId: orgId,
        ads: {
          create: {
            id: publishRes.adId,
            name: `${name} - Ad`,
            status: "ACTIVE",
            creative: {
              headline: creative.headline,
              primaryText: creative.primaryText,
              imagePrompt: creative.imagePrompt,
              imageUrl: creative.imageUrl || "",
            },
            linkedTemplate: linkedTemplate || null,
            ctwaClid: publishRes.simulated ? "simulated_click_id" : null,
            organizationId: orgId,
          },
        },
      },
      include: { ads: true },
    });

    return NextResponse.json({
      campaign: newCampaign,
      metaError: (publishRes as any).error || null,
      simulated: publishRes.simulated,
    });
  } catch (err: any) {
    console.error("[Ads API POST] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
