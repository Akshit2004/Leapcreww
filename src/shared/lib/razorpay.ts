import Razorpay from "razorpay";
import * as crypto from "crypto";
import { prisma } from "./prisma";
import { decryptSecretSafe } from "./crypto";


export async function getRazorpayConfig(orgId: string) {
  const integration = await prisma.integration.findUnique({
    where: {
      id_organizationId: {
        id: "razorpay",
        organizationId: orgId,
      },
    },
  });

  if (!integration || !integration.apiKey) {
    throw new Error("Razorpay account not linked for this marketplace.");
  }

  let config;
  try {
    config = JSON.parse(decryptSecretSafe(integration.apiKey));
  } catch (e) {
    throw new Error("Invalid Razorpay configuration.");
  }

  const { keyId, keySecret, webhookSecret } = config;
  if (!keyId || !keySecret) {
    throw new Error("Incomplete Razorpay configuration.");
  }

  return { keyId, keySecret, webhookSecret };
}

export async function getRazorpayInstance(orgId: string): Promise<Razorpay> {
  const config = await getRazorpayConfig(orgId);
  return new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
}

export async function createRazorpayOrder(amountPaise: number, receipt: string, orgId: string) {
  const config = await getRazorpayConfig(orgId);
  const rzp = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
  const order = (await (rzp.orders.create as unknown as (params: Record<string, unknown>) => Promise<unknown>)(
    { amount: amountPaise, currency: "INR", receipt, payment_capture: 1 }
  )) as { id: string; amount: number; currency: string; receipt: string; status: string };
  return { ...order, keyId: config.keyId };
}

export async function createPlatformRazorpayOrder(amountPaise: number, receipt: string) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Platform Razorpay credentials are not configured in environment variables.");
  }
  const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const order = (await (rzp.orders.create as unknown as (params: Record<string, unknown>) => Promise<unknown>)(
    { amount: amountPaise, currency: "INR", receipt, payment_capture: 1 }
  )) as { id: string; amount: number; currency: string; receipt: string; status: string };
  return { ...order, keyId };
}

export async function createRazorpayPaymentLink(amountPaise: number, referenceId: string, phone: string, name: string, orgId: string) {
  const rzp = await getRazorpayInstance(orgId);
  const paymentLink = await (rzp.paymentLink as unknown as Record<string, (params: Record<string, unknown>) => Promise<unknown>>).create({
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

export async function verifyRazorpayPayment(
  orderId: string,
  paymentId: string,
  signature: string,
  orgId: string
): Promise<boolean> {
  const config = await getRazorpayConfig(orgId);
  if (!config?.webhookSecret) return false;
  const expected = crypto
    .createHmac("sha256", config.webhookSecret)
    .update(orderId + "|" + paymentId)
    .digest("hex");
  // Length guard: timingSafeEqual throws RangeError on unequal buffer lengths.
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
