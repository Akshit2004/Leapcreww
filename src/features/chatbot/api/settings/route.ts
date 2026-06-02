import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    interface CustomSessionUser { id: string }
    const userId = (session.user as unknown as CustomSessionUser).id;

    const body = await req.json();
    const { orgId, enabled } = body;

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required." }, { status: 400 });
    }

    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Enabled parameter must be a boolean." }, { status: 400 });
    }

    // Verify User has active tenancy/membership in requested organization
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

    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: {
        chatbotBuilderEnabled: enabled,
      },
      select: {
        id: true,
        chatbotBuilderEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      organization,
    });
  } catch (err: unknown) {
    console.error("❌ Failed to update chatbot builder settings:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while updating settings." },
      { status: 500 }
    );
  }
}
