import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(
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

    // Perform database wipe inside transaction block to guarantee atomic cleanups
    await prisma.$transaction([
      // 1. Delete all simulated messages
      prisma.message.deleteMany({
        where: { organizationId: orgId }
      }),
      // 2. Delete all mock templates
      prisma.template.deleteMany({
        where: { organizationId: orgId }
      }),
      // 3. Delete all broadcast campaigns
      prisma.campaign.deleteMany({
        where: { organizationId: orgId }
      }),
      // 4. Delete all system log logs
      prisma.systemLog.deleteMany({
        where: { organizationId: orgId }
      }),
      // 5. Reset all contact chat states back to raw onboarding baseline
      prisma.contact.updateMany({
        where: { organizationId: orgId },
        data: {
          lastMessage: null,
          lastMessageTime: null,
          unreadCount: 0,
          assignedAgent: "None",
          currentNodeId: null
        }
      })
    ]);

    // Create a new baseline system log logging this reset
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "crm",
        message: "Sandbox sandbox environment successfully flushed and re-initialized.",
        organizationId: orgId
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Sandbox successfully reset! Your local inbox, campaigns, and templates are clean."
    });
  } catch (err: unknown) {
    console.error("[Sandbox Reset API Error]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
