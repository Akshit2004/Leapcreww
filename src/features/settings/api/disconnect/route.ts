import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await request.json();
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        whatsappBusinessAccountId: null,
        whatsappPhoneNumberId: null,
        metaBusinessId: null,
        whatsappConnected: false,
      },
    });

    // Log the disconnection
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "crm",
        message: "WhatsApp Business Account disconnected from workspace.",
        organizationId: orgId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
