/** walletRepo.ts — Prisma access for wallet top-ups + balance credits. */
import { prisma } from "@/shared/lib/prisma";

/** Create a pending top-up record tied to a platform Razorpay order. */
export function createTopup(input: { organizationId: string; amount: number; razorpayOrderId: string }) {
  return prisma.walletTopup.create({
    data: {
      organizationId: input.organizationId,
      amount: input.amount,
      razorpayOrderId: input.razorpayOrderId,
      status: "pending",
    },
  });
}

export function findTopupByRazorpayOrderId(razorpayOrderId: string) {
  return prisma.walletTopup.findUnique({ where: { razorpayOrderId } });
}

/** Mark a top-up as paid and atomically credit the org wallet + log the event. */
export function creditWalletForTopup(topupId: string, organizationId: string, amount: number) {
  return prisma.$transaction([
    prisma.walletTopup.update({
      where: { id: topupId },
      data: { status: "paid" },
    }),
    prisma.organization.update({
      where: { id: organizationId },
      data: { walletBalance: { increment: amount } },
    }),
    prisma.systemLog.create({
      data: {
        type: "integration",
        message: `Wallet topped up by ₹${amount.toFixed(2)} via Razorpay.`,
        organizationId,
      },
    }),
  ]);
}

export function markTopupFailed(topupId: string) {
  return prisma.walletTopup.update({
    where: { id: topupId },
    data: { status: "failed" },
  });
}
