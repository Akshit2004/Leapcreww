import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { sendWhatsAppMessage } from "@/shared/lib/whatsapp";

import crypto from "crypto";

// ─── Razorpay webhook payload (only the fields this handler reads) ────────
interface RazorpayEntity {
  id?: string;
  order_id?: string;
}
interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayEntity };
    order?: { entity?: RazorpayEntity };
    payment_link?: { entity?: RazorpayEntity };
  };
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const signature = req.headers.get("x-razorpay-signature");
    const bodyText = await req.text();

    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(bodyText)
      .digest("hex");

    const expectedBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(signature ?? "");
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      console.warn("Razorpay webhook: invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload: RazorpayWebhookPayload = JSON.parse(bodyText);
    const event = payload.event;

    if (event === "payment.captured" || event === "order.paid" || event === "payment_link.paid") {
      let razorpayOrderId = payload.payload?.payment?.entity?.order_id ||
                              payload.payload?.order?.entity?.id;

      if (event === "payment_link.paid") {
        razorpayOrderId = payload.payload?.payment_link?.entity?.id; // This matches the plink_ ID we saved
      }

      if (!razorpayOrderId) {
        return NextResponse.json({ error: "No order identifier in payload" }, { status: 400 });
      }

      // ─── Appointment slot paid via payment link ──────────────────
      // Appointments track payment on the slot itself (slot-native), so they
      // never create Order rows. Check slots first and short-circuit.
      const slot = await prisma.appointmentSlot.findUnique({
        where: { razorpayPaymentLinkId: razorpayOrderId },
        include: { contact: true },
      });
      if (slot) {
        if (!slot.isBooked) {
          await prisma.appointmentSlot.update({
            where: { id: slot.id },
            data: { isBooked: true, paymentStatus: "paid", holdExpiresAt: null },
          });
        }
        if (slot.contact && slot.contactId) {
          const { sendBookingConfirmed } = await import("@/shared/lib/appointment");
          await sendBookingConfirmed(slot.contact.phone, slot.contactId, slot.organizationId, slot.id);
        }
        return NextResponse.json({ status: "ok" });
      }

      const order = await prisma.order.findFirst({
        where: { razorpayOrderId },
        include: { contact: true },
      });

      if (!order) {
        console.warn(`Razorpay webhook: order ${razorpayOrderId} not found in DB`);
        return NextResponse.json({ status: "order_not_found" });
      }

      const paymentId = payload.payload?.payment?.entity?.id;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "paid",
          status: "confirmed",
          ...(paymentId ? { razorpayPaymentId: paymentId } : {}),
        },
      });

      // Cart paid → mark recovered and stop any active abandoned-cart drip.
      const { markCartRecovered } = await import("@/features/sequences/services/sequenceService");
      await markCartRecovered(order.organizationId, order.contactId);

      const cleanPhone = order.contact.phone.replace(/[^0-9]/g, "");
      const text = `✅ *Payment Received!* 🎉

Thank you for your order *${order.orderId}*!

📦 *Status:* Confirmed
💳 *Payment:* Paid — ₹${(order.total / 100).toFixed(2)}

We'll notify you when it ships. Reply *ORDERS* to check status anytime.`;

      await sendWhatsAppMessage({ to: cleanPhone, text }, order.organizationId);
    }

    if (event === "payment.failed" || event === "payment_link.cancelled") {
      let razorpayOrderId = payload.payload?.payment?.entity?.order_id;
      if (event === "payment_link.cancelled") {
        razorpayOrderId = payload.payload?.payment_link?.entity?.id;
      }
      if (razorpayOrderId) {
        // Release a soft-held appointment slot so it becomes bookable again.
        const failedSlot = await prisma.appointmentSlot.findUnique({
          where: { razorpayPaymentLinkId: razorpayOrderId },
        });
        if (failedSlot) {
          if (!failedSlot.isBooked) {
            await prisma.appointmentSlot.update({
              where: { id: failedSlot.id },
              data: { paymentStatus: "none", holdExpiresAt: null, contactId: null, razorpayPaymentLinkId: null },
            });
          }
          return NextResponse.json({ status: "ok" });
        }

        const order = await prisma.order.findFirst({
          where: { razorpayOrderId },
          include: { contact: true },
        });
        if (order) {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: "failed" },
          });
          const cleanPhone = order.contact.phone.replace(/[^0-9]/g, "");
          await sendWhatsAppMessage({
            to: cleanPhone,
            text: "❌ *Payment Failed*\n\nYour payment didn't go through. Please try again or use a different payment method.\n\nReply *CHECKOUT* to retry.",
          }, order.organizationId);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: unknown) {
    console.error("Razorpay webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}