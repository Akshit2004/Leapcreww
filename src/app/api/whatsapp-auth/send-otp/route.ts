import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ success: false, error: "Missing or invalid phone number." }, { status: 400 });
    }

    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = `+91${cleanPhone}`;
    } else if (!cleanPhone.startsWith("+")) {
      cleanPhone = `+${cleanPhone}`;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry
    
    const randomSuffix = crypto.randomBytes(6).toString("hex").toUpperCase();
    const code = `WPF-OTP-${randomSuffix}`;

    const attempt = await prisma.whatsAppLoginAttempt.create({
      data: {
        code,
        otp,
        phone: cleanPhone,
        status: "PENDING",
        expiresAt,
      },
    });

    const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";
    let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!phoneNumberId) {
      const activeOrg = await prisma.organization.findFirst({
        where: { whatsappConnected: true, whatsappPhoneNumberId: { not: null } },
        select: { whatsappPhoneNumberId: true },
      });
      phoneNumberId = activeOrg?.whatsappPhoneNumberId || undefined;
    }

    let metaSuccess = false;
    let metaErrorMessage = "";

    if (systemToken && phoneNumberId) {
      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
      
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone.replace("+", ""), // Strips '+' prefix specifically for Meta's Graph API payload
        type: "template",
        template: {
          name: "login_otp",
          language: {
            code: "en_US",
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: otp,
                },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [
                {
                  type: "text",
                  text: otp,
                },
              ],
            },
          ],
        },
      };

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${systemToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        
        if (response.ok) {
          metaSuccess = true;
        } else {
          metaErrorMessage = data.error?.message || "Meta API response error";
          console.warn("[Meta OTP Send Warning] Failed to send template message via Graph API:", data.error);
        }
      } catch (metaErr) {
        metaErrorMessage = metaErr instanceof Error ? metaErr.message : String(metaErr);
        console.error("[Meta OTP Exception] Network/connection failure:", metaErr);
      }
    } else {
      metaErrorMessage = "Meta WhatsApp credentials (WHATSAPP_SYSTEM_USER_TOKEN) or system phone_number_id (WHATSAPP_PHONE_NUMBER_ID) are not configured in environment.";
    }

    if (!metaSuccess) {
      // Clean up the failed login attempt record in PostgreSQL
      await prisma.whatsAppLoginAttempt.delete({
        where: { id: attempt.id }
      }).catch(() => {});

      return NextResponse.json({
        success: false,
        error: metaErrorMessage || "Failed to dispatch OTP template via Meta API."
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      expiresAt: expiresAt.toISOString(),
      message: "OTP sent successfully via WhatsApp."
    });
  } catch (err: unknown) {
    console.error("WhatsApp OTP send route error:", err);
    return NextResponse.json({ success: false, error: "Failed to dispatch OTP." }, { status: 500 });
  }
}
