import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; campaignId: string }> }
) {
  try {
    const { orgId, campaignId } = await params;
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

    // Delete the campaign (Prisma will cascade delete the linked Ads due to onDelete: Cascade)
    await prisma.adCampaign.delete({
      where: {
        id: campaignId,
        organizationId: orgId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Ads API DELETE] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
