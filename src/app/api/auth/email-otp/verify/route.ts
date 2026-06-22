import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { checkRateLimit } from "@/shared/lib/ratelimit";
import crypto from "crypto";

/** Constant-time OTP comparison with an equal-length guard. */
function otpMatches(stored: string | null, provided: string): boolean {
  if (!stored) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    const { attemptId, otp } = await req.json().catch(() => ({ attemptId: "", otp: "" }));

    if (!attemptId || !otp || typeof attemptId !== "string" || typeof otp !== "string") {
      return NextResponse.json({ success: false, error: "Missing attempt ID or OTP." }, { status: 400 });
    }

    // Brute-force throttle: EmailOtpAttempt has no attempts counter, so cap
    // guesses per attempt id via the shared OTP limiter (no-ops without Upstash).
    const rl = await checkRateLimit("otp", `email-otp-verify:${attemptId}`);
    if (rl && !rl.success) {
      return NextResponse.json(
        { success: false, error: "Too many incorrect attempts. Please request a new code." },
        { status: 429 }
      );
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

    if (!otpMatches(attempt.otp, otp.trim())) {
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
