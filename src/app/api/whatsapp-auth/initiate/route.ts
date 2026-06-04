import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/shared/lib/prisma";

export async function POST() {
  try {
    const randomSuffix = crypto.randomBytes(6).toString("hex").toUpperCase();
    const code = `WPF-${randomSuffix}`;

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const attempt = await prisma.whatsAppLoginAttempt.create({
      data: {
        code,
        status: "PENDING",
        expiresAt,
      },
    });

    const botNumber = process.env.NEXT_PUBLIC_SYSTEM_WHATSAPP_NUMBER;
    const textMessage = `Hi, I'd like to verify my Account Signup for WappFlow. Verification Code: ${code}`;
    const waUrl = `https://wa.me/${botNumber}?text=${encodeURIComponent(textMessage)}`;

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      code,
      expiresAt: expiresAt.toISOString(),
      waUrl,
    });
  } catch (err: unknown) {
    console.error("WhatsApp auth initiate error:", err);
    return NextResponse.json({ success: false, error: "Failed to initiate WhatsApp login." }, { status: 500 });
  }
}
