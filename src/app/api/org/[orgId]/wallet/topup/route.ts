import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { prisma } from "../../../../../../lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { orgId } = await params;
    interface CustomSessionUser { id: string }
    const userId = (session.user as unknown as CustomSessionUser).id;

    // 1. Verify User has active tenancy/membership in requested organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access forbidden. You do not belong to this workspace." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { amount } = body;

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount specified." }, { status: 400 });
    }

    // 2. Update wallet balance in PostgreSQL
    const updatedOrg = await prisma.organization.update({
      where: { id: orgId },
      data: {
        walletBalance: {
          increment: amount,
        },
      },
      select: {
        walletBalance: true,
      },
    });

    // 3. Write record into system logs for audit trail
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "crm",
        message: `💰 Wallet topped up successfully with ₹${amount.toLocaleString("en-IN")}. New Balance: ₹${updatedOrg.walletBalance.toLocaleString("en-IN")}.`,
        organizationId: orgId,
      },
    });

    return NextResponse.json({
      success: true,
      newBalance: updatedOrg.walletBalance,
    });
  } catch (err: unknown) {
    console.error("❌ Wallet Topup API failed:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during the wallet top-up transaction." },
      { status: 500 }
    );
  }
}
