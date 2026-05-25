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
