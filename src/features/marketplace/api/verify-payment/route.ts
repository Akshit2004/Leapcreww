import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { verifyRazorpayPayment } from "@/shared/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isValid = await verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, order.organizationId);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "paid",
        status: "confirmed",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      },
    });

    // Cart paid → mark recovered and stop any active abandoned-cart drip.
    const { markCartRecovered } = await import("@/features/sequences/services/sequenceService");
    await markCartRecovered(order.organizationId, order.contactId);

    return NextResponse.json({ status: "verified", orderId: order.orderId });
  } catch (err: unknown) {
    console.error("Payment verification error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}