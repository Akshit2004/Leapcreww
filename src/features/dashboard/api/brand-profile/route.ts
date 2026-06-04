import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";

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

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const industry = typeof body?.industry === "string" ? body.industry.trim() : "";
    const toneOfVoice = typeof body?.toneOfVoice === "string" ? body.toneOfVoice.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Brand name is required." }, { status: 400 });
    }

    const brandProfile = { name, industry, toneOfVoice };

    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: { brandProfile },
      select: { id: true, brandProfile: true },
    });

    return NextResponse.json({ organization });
  } catch (err: unknown) {
    console.error("❌ Brand Profile update API failed:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
