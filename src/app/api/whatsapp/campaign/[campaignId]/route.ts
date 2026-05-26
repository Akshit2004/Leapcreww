import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { campaignId } = await params;

    // Fetch campaign to verify it belongs to the user's organization
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { organizationId: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get the user's organization membership for authorization
    const userId = session.user?.email;
    if (userId) {
      const membership = await prisma.membership.findFirst({
        where: {
          user: { email: userId },
          organizationId: campaign.organizationId,
        },
      });

      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await prisma.campaign.delete({
      where: { id: campaignId },
    });

    return NextResponse.json({ status: "ok" });
  } catch (err: unknown) {
    console.error("Delete campaign error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
