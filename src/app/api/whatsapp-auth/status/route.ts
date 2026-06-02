import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const attemptId = searchParams.get("attemptId");

    if (!attemptId) {
      return NextResponse.json({ success: false, error: "Missing attemptId query parameter." }, { status: 400 });
    }

    const attempt = await prisma.whatsAppLoginAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return NextResponse.json({ success: false, error: "WhatsApp authentication attempt not found." }, { status: 404 });
    }

    if (attempt.status === "PENDING" && attempt.expiresAt < new Date()) {
      await prisma.whatsAppLoginAttempt.update({
        where: { id: attemptId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({
        success: true,
        status: "EXPIRED",
      });
    }

    return NextResponse.json({
      success: true,
      status: attempt.status,
      phone: attempt.phone,
    });
  } catch (err: unknown) {
    console.error("WhatsApp auth status polling error:", err);
    return NextResponse.json({ success: false, error: "Failed to poll login status." }, { status: 500 });
  }
}
