import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { attemptId, otp } = await req.json();

    if (!attemptId || !otp) {
      return NextResponse.json({ success: false, error: "Missing required attemptId or otp parameter." }, { status: 400 });
    }

    const attempt = await prisma.whatsAppLoginAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return NextResponse.json({ success: false, error: "WhatsApp authentication attempt not found." }, { status: 404 });
    }

    if (attempt.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "This authentication session is no longer active." }, { status: 400 });
    }

    if (attempt.expiresAt < new Date()) {
      await prisma.whatsAppLoginAttempt.update({
        where: { id: attemptId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ success: false, error: "Your authentication session has expired. Please request a new code." }, { status: 400 });
    }

    if (attempt.otp !== otp.trim()) {
      return NextResponse.json({ success: false, error: "Incorrect OTP code. Please try again." }, { status: 400 });
    }

    if (!attempt.phone) {
      return NextResponse.json({ success: false, error: "Missing phone number association for verification." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { phone: attempt.phone },
    });

    if (user) {
      await prisma.whatsAppLoginAttempt.update({
        where: { id: attemptId },
        data: {
          status: "VERIFIED",
          userId: user.id,
        },
      });

      return NextResponse.json({
        success: true,
        status: "VERIFIED",
        attemptId: attempt.id,
      });
    } else {
      await prisma.whatsAppLoginAttempt.update({
        where: { id: attemptId },
        data: {
          status: "VERIFIED_NEW_USER",
        },
      });

      return NextResponse.json({
        success: true,
        status: "VERIFIED_NEW_USER",
        phone: attempt.phone,
      });
    }
  } catch (err: unknown) {
    console.error("WhatsApp OTP verification error:", err);
    return NextResponse.json({ success: false, error: "Failed to verify OTP." }, { status: 500 });
  }
}
