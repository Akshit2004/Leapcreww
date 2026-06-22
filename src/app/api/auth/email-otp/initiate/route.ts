import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { sendEmailOtp } from "@/shared/lib/email";
import { checkRateLimit } from "@/shared/lib/ratelimit";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json().catch(() => ({ email: "" }));

    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: false, error: "Valid email is required" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Per-email throttle to prevent OTP email bombing (matches WhatsApp send-otp).
    // No-ops when Upstash isn't configured. Checked before any DB/SMTP work.
    const rl = await checkRateLimit("otp", `email-otp-send:${emailLower}`);
    if (rl && !rl.success) {
      return NextResponse.json(
        { success: false, error: "Too many OTP requests. Please wait a few minutes before trying again." },
        { status: 429 }
      );
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // Create attempt record
    const attempt = await prisma.emailOtpAttempt.create({
      data: {
        email: emailLower,
        otp,
        status: "PENDING",
        expiresAt,
      },
    });

    // Dispatch email
    const emailRes = await sendEmailOtp(emailLower, otp);

    if (!emailRes.success) {
      return NextResponse.json({ success: false, error: "Failed to send OTP email" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      expiresAt: expiresAt.toISOString(),
      message: "OTP sent successfully"
    });
  } catch (err: unknown) {
    console.error("Email OTP initiate error:", err);
    return NextResponse.json({ success: false, error: "Failed to initiate Email OTP." }, { status: 500 });
  }
}
