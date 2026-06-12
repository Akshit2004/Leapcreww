import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";

const MAX_TEXT_LENGTH = 8000;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    interface CustomSessionUser { id: string }
    const userId = (session.user as unknown as CustomSessionUser).id;

    const body = await req.json();
    const { orgId, aiKnowledgeBase, aiPersona, aiTemperature } = body;

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required." }, { status: 400 });
    }

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

    if (aiKnowledgeBase !== undefined && aiKnowledgeBase !== null && typeof aiKnowledgeBase !== "string") {
      return NextResponse.json({ error: "Knowledge base must be a string." }, { status: 400 });
    }
    if (aiPersona !== undefined && aiPersona !== null && typeof aiPersona !== "string") {
      return NextResponse.json({ error: "Persona must be a string." }, { status: 400 });
    }
    if (typeof aiKnowledgeBase === "string" && aiKnowledgeBase.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Knowledge base must be under ${MAX_TEXT_LENGTH} characters.` }, { status: 400 });
    }
    if (typeof aiPersona === "string" && aiPersona.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Persona must be under ${MAX_TEXT_LENGTH} characters.` }, { status: 400 });
    }

    let temperature: number | undefined;
    if (aiTemperature !== undefined && aiTemperature !== null) {
      temperature = Number(aiTemperature);
      if (Number.isNaN(temperature) || temperature < 0 || temperature > 1.5) {
        return NextResponse.json({ error: "Temperature must be a number between 0 and 1.5." }, { status: 400 });
      }
    }

    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(aiKnowledgeBase !== undefined ? { aiKnowledgeBase: aiKnowledgeBase?.trim() || null } : {}),
        ...(aiPersona !== undefined ? { aiPersona: aiPersona?.trim() || null } : {}),
        ...(temperature !== undefined ? { aiTemperature: temperature } : {}),
      },
      select: {
        id: true,
        aiKnowledgeBase: true,
        aiPersona: true,
        aiTemperature: true,
      },
    });

    return NextResponse.json({ success: true, organization });
  } catch (err: unknown) {
    console.error("❌ Failed to update AI agent settings:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while updating AI agent settings." },
      { status: 500 }
    );
  }
}
