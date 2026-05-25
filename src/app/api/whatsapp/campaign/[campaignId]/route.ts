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

    await prisma.campaign.delete({
      where: { id: campaignId },
    });

    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    console.error("Delete campaign error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
