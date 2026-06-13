import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { handlePaymentSuccess, handlePaymentFailure } from "../../services/razorpayPaymentService";

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

      const paymentId = payload.payload?.payment?.entity?.id;
      const result = await handlePaymentSuccess(razorpayOrderId, paymentId);
      if (result.status === "wallet_topup_credited" || result.status === "order_not_found") {
        return NextResponse.json({ status: result.status });
      }
    }

    if (event === "payment.failed" || event === "payment_link.cancelled") {
      let razorpayOrderId = payload.payload?.payment?.entity?.order_id;
      if (event === "payment_link.cancelled") {
        razorpayOrderId = payload.payload?.payment_link?.entity?.id;
      }
      if (razorpayOrderId) {
        const result = await handlePaymentFailure(razorpayOrderId);
        if (result.status === "wallet_topup_failed") {
          return NextResponse.json({ status: result.status });
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: unknown) {
    console.error("Razorpay webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
