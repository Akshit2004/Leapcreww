/** razorpayWebhookRepo.ts — Prisma access for the Razorpay payment-events webhook. */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

/** Appointments are collected offline (no Razorpay), so payment events only ever resolve to marketplace Order rows. */
export function findOrderByRazorpayOrderId(razorpayOrderId: string) {
  return prisma.order.findFirst({
    where: { razorpayOrderId },
    include: { contact: true },
  });
}

export function updateOrder(orderId: string, data: Prisma.OrderUpdateInput) {
  return prisma.order.update({ where: { id: orderId }, data });
}

export function updateContactTags(contactId: string, tags: string[]) {
  return prisma.contact.update({
    where: { id: contactId },
    data: { tags: { set: tags } },
  });
}

export function createSystemLog(data: { type: string; message: string; organizationId: string }) {
  return prisma.systemLog.create({ data });
}
