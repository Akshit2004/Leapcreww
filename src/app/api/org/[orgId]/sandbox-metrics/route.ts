import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true }
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Run parallel database queries using Prisma to gather mock simulation stats
    const [messagesCount, templatesCount, campaignsCount] = await Promise.all([
      prisma.message.count({ where: { organizationId: orgId } }),
      prisma.template.count({ where: { organizationId: orgId } }),
      prisma.campaign.count({ where: { organizationId: orgId } })
    ]);

    return NextResponse.json({
      orgName: org.name,
      totalMessages: messagesCount,
      totalTemplates: templatesCount,
      totalCampaigns: campaignsCount
    });
  } catch (err: unknown) {
    console.error("[Sandbox Metrics API Error]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
