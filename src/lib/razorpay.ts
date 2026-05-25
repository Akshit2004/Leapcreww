import Razorpay from "razorpay";

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret, webhookSecret };
}

export function getRazorpayInstance(): Razorpay | null {
  const config = getRazorpayConfig();
  if (!config) return null;
  return new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
}

export async function createRazorpayOrder(amountPaise: number, receipt: string) {
  const rzp = getRazorpayInstance();
  if (!rzp) throw new Error("Razorpay not configured");
  const order = (await (rzp.orders.create as any)(
    { amount: amountPaise, currency: "INR", receipt, payment_capture: 1 }
  )) as { id: string; amount: number; currency: string; receipt: string; status: string };
  return order;
}

export async function createRazorpayPaymentLink(amountPaise: number, referenceId: string, phone: string, name: string) {
  const rzp = getRazorpayInstance();
  if (!rzp) throw new Error("Razorpay not configured");
  const paymentLink = await (rzp.paymentLink as any).create({
    amount: amountPaise,
    currency: "INR",
    accept_partial: false,
    reference_id: referenceId,
    description: `Order ${referenceId}`,
    customer: {
      name: name || "Customer",
      contact: phone
    },
    notify: {
      sms: false,
      email: false
    },
    reminder_enable: false
  });
  return paymentLink as { id: string; short_url: string };
}

export function verifyRazorpayPayment(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const crypto = require("crypto");
  const config = getRazorpayConfig();
  if (!config?.webhookSecret) return false;
  const expected = crypto
    .createHmac("sha256", config.webhookSecret)
    .update(orderId + "|" + paymentId)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
