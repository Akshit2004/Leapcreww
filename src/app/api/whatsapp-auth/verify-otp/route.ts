import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import crypto from "crypto";

const MAX_OTP_ATTEMPTS = 5;

/** Constant-time OTP comparison with an equal-length guard. */
function otpMatches(stored: string | null, provided: string): boolean {
  if (!stored) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

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

    if (attempt.attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.whatsAppLoginAttempt.update({
        where: { id: attemptId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ success: false, error: "Too many incorrect attempts. Please request a new code." }, { status: 400 });
    }

    if (!otpMatches(attempt.otp, otp.trim())) {
      const updated = await prisma.whatsAppLoginAttempt.update({
        where: { id: attemptId },
        data: { attempts: { increment: 1 } },
      });
      // Lock the attempt out the moment the cap is reached so no further guesses land.
      if (updated.attempts >= MAX_OTP_ATTEMPTS) {
        await prisma.whatsAppLoginAttempt.update({
          where: { id: attemptId },
          data: { status: "EXPIRED" },
        });
      }
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
