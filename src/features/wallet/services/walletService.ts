/**
 * walletService.ts — Wallet top-ups via the platform's Razorpay account
 * (T-06 wallet balance, not a tenant's own Razorpay integration).
 */
import { ApiError } from "@/shared/lib/api";
import { createPlatformRazorpayOrder } from "@/shared/lib/razorpay";
import * as repo from "../repositories/walletRepo";
import type { CreateTopupInput, CreateTopupResult } from "../types";

/** Create a pending top-up + matching Razorpay order for the checkout widget. */
export async function createTopupOrder(input: CreateTopupInput): Promise<CreateTopupResult> {
  if (!Number.isFinite(input.amount) || input.amount < 100) {
    throw new ApiError("Minimum top-up amount is ₹100", 400);
  }

  const amountPaise = Math.round(input.amount * 100);
  const receipt = `topup_${input.organizationId}_${Date.now()}`;

  let order;
  try {
    order = await createPlatformRazorpayOrder(amountPaise, receipt);
  } catch (err) {
    console.error("[wallet] Failed to create Razorpay order:", err);
    throw new ApiError("Unable to start payment. Please try again later.", 502);
  }

  const topup = await repo.createTopup({
    organizationId: input.organizationId,
    amount: input.amount,
    razorpayOrderId: order.id,
  });

  return {
    topupId: topup.id,
    razorpayOrderId: order.id,
    amount: input.amount,
    currency: "INR",
    keyId: order.keyId,
  };
}
