import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    interface CustomSessionUser { id: string }
    const userId = (session.user as unknown as CustomSessionUser).id;
    const { orgId } = await params;

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

    await prisma.systemLog.deleteMany({
      where: { organizationId: orgId },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Failed to delete system logs:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while deleting system logs." },
      { status: 500 }
    );
  }
}
