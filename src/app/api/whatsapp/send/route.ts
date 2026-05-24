import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const { to, text, contactId, orgId } = await req.json();

    if (!to || !text) {
      return NextResponse.json({ error: "Missing required fields: to, text" }, { status: 400 });
    }

    const formattedPhone = formatPhoneNumber(to);
    const result = await sendWhatsAppMessage({ to: formattedPhone, text });

    if (!result.ok) {
      console.error("WhatsApp send failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Failed to send WhatsApp message", details: result.data },
        { status: 502 }
      );
    }

    console.log("WhatsApp message sent:", result.data?.messages?.[0]?.id);

    return NextResponse.json({
      status: "sent",
      waMessageId: result.data?.messages?.[0]?.id || null,
    });
  } catch (err: any) {
    console.error("WhatsApp send API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}