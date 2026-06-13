/** razorpayPaymentService.ts — business logic for Razorpay payment-event webhooks
 * (wallet topups and marketplace order payment confirmation/failure). */
import { sendWhatsAppMessage } from "@/shared/lib/whatsapp";
import { findTopupByRazorpayOrderId, creditWalletForTopup, markTopupFailed } from "@/features/wallet/repositories/walletRepo";
import { markCartRecovered } from "@/features/sequences/services/sequenceService";
import * as repo from "../repositories/razorpayWebhookRepo";

export type PaymentSuccessResult =
  | { status: "wallet_topup_credited" }
  | { status: "order_not_found" }
  | { status: "order_confirmed" };

/**
 * Handle payment.captured / order.paid / payment_link.paid: credit a pending
 * wallet topup, or confirm payment for a marketplace order.
 */
export async function handlePaymentSuccess(razorpayOrderId: string, paymentId?: string): Promise<PaymentSuccessResult> {
  // Check if this is a Wallet Topup order
  const topup = await findTopupByRazorpayOrderId(razorpayOrderId);
  if (topup) {
    if (topup.status === "pending") {
      await creditWalletForTopup(topup.id, topup.organizationId, topup.amount);
    }
    return { status: "wallet_topup_credited" };
  }

  // Appointments are collected offline (no Razorpay), so payment events
  // only ever resolve to marketplace Order rows.
  const order = await repo.findOrderByRazorpayOrderId(razorpayOrderId);

  if (!order) {
    console.warn(`Razorpay webhook: order ${razorpayOrderId} not found in DB`);
    return { status: "order_not_found" };
  }

  const wasCodConversion = order.codStatus === "confirmed";

  await repo.updateOrder(order.id, {
    paymentStatus: "paid",
    status: "confirmed",
    codStatus: wasCodConversion ? null : order.codStatus,
    ...(paymentId ? { razorpayPaymentId: paymentId } : {}),
  });

  // Cart paid → mark recovered and stop any active abandoned-cart drip.
  await markCartRecovered(order.organizationId, order.contactId);

  const cleanPhone = order.contact.phone.replace(/[^0-9]/g, "");

  if (wasCodConversion) {
    // Customer took the prepaid conversion offer — send a celebratory message.
    await repo.updateContactTags(
      order.contactId,
      Array.from(
        new Set([
          ...order.contact.tags.filter((t) => t !== "cod-confirmed"),
          "cod-converted-prepaid",
        ])
      )
    );

    await repo.createSystemLog({
      type: "integration",
      message: `COD order #${order.orderId} converted to prepaid by ${order.contact.name}. Saved ₹50.`,
      organizationId: order.organizationId,
    });

    await sendWhatsAppMessage({
      to: cleanPhone,
      text:
        `🎊 *You saved ₹50!*\n\nPayment received for order #${order.orderId}. ` +
        `Great choice paying online — we'll get it packed and shipped right away. 🚀`,
    }, order.organizationId);
  } else {
    const text = `✅ *Payment Received!* 🎉\n\nThank you for your order *${order.orderId}*!\n\n📦 *Status:* Confirmed\n💳 *Payment:* Paid — ₹${(order.total / 100).toFixed(2)}\n\nWe'll notify you when it ships. Reply *ORDERS* to check status anytime.`;
    await sendWhatsAppMessage({ to: cleanPhone, text }, order.organizationId);
  }

  return { status: "order_confirmed" };
}

export type PaymentFailureResult =
  | { status: "wallet_topup_failed" }
  | { status: "order_not_found" }
  | { status: "order_failed" }
  | { status: "noop" };

/** Handle payment.failed / payment_link.cancelled: mark a pending wallet topup or order as failed. */
export async function handlePaymentFailure(razorpayOrderId: string): Promise<PaymentFailureResult> {
  // Check if this is a Wallet Topup order
  const topup = await findTopupByRazorpayOrderId(razorpayOrderId);
  if (topup) {
    if (topup.status === "pending") {
      await markTopupFailed(topup.id);
    }
    return { status: "wallet_topup_failed" };
  }

  const order = await repo.findOrderByRazorpayOrderId(razorpayOrderId);
  if (!order) {
    return { status: "order_not_found" };
  }

  await repo.updateOrder(order.id, { paymentStatus: "failed" });
  const cleanPhone = order.contact.phone.replace(/[^0-9]/g, "");
  await sendWhatsAppMessage({
    to: cleanPhone,
    text: "❌ *Payment Failed*\n\nYour payment didn't go through. Please try again or use a different payment method.\n\nReply *CHECKOUT* to retry.",
  }, order.organizationId);

  return { status: "order_failed" };
}
