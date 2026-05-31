import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templateId, isShared } = await request.json();

    if (!templateId || typeof isShared !== "boolean") {
      return NextResponse.json({ error: "Missing templateId or isShared" }, { status: 400 });
    }

    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: { id: true, name: true, organizationId: true },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await prisma.template.update({
      where: { id: templateId },
      data: { isShared },
    });

    return NextResponse.json({ success: true, isShared });
  } catch (err: unknown) {
    console.error("Toggle share endpoint error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
