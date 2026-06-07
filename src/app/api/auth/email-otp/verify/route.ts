import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";

export async function POST(req: Request) {
  try {
    const { attemptId, otp } = await req.json().catch(() => ({ attemptId: "", otp: "" }));

    if (!attemptId || !otp) {
      return NextResponse.json({ success: false, error: "Missing attempt ID or OTP." }, { status: 400 });
    }

    const attempt = await prisma.emailOtpAttempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt) {
      return NextResponse.json({ success: false, error: "OTP session not found." }, { status: 400 });
    }

    if (attempt.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "OTP session already verified or expired." }, { status: 400 });
    }

    if (attempt.expiresAt < new Date()) {
      await prisma.emailOtpAttempt.update({
        where: { id: attemptId },
        data: { status: "EXPIRED" }
      });
      return NextResponse.json({ success: false, error: "OTP has expired." }, { status: 400 });
    }

    if (attempt.otp !== otp) {
      return NextResponse.json({ success: false, error: "Incorrect OTP." }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: attempt.email }
    });

    const newStatus = user ? "VERIFIED" : "VERIFIED_NEW_USER";

    // Mark attempt as verified
    await prisma.emailOtpAttempt.update({
      where: { id: attemptId },
      data: { status: newStatus }
    });

    return NextResponse.json({
      success: true,
      status: newStatus,
      email: attempt.email
    });
  } catch (err: unknown) {
    console.error("Email OTP verify error:", err);
    return NextResponse.json({ success: false, error: "Failed to verify Email OTP." }, { status: 500 });
  }
}
