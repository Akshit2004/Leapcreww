import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ResolvedAttribution } from "@/features/analytics/services/attribution";

export function findCartWithItems(contactId: string) {
  return prisma.cart.findUnique({
    where: { contactId },
    include: { items: { include: { product: true } } },
  });
}

export function findContactById(contactId: string) {
  return prisma.contact.findUnique({ where: { id: contactId } });
}

export interface OrderCreateInput {
  orderId: string;
  contactId: string;
  total: number;
  razorpayOrderId: string;
  phone: string;
  organizationId: string;
  address: Prisma.InputJsonValue;
  attribution: ResolvedAttribution;
  items: { productId: string; name: string; price: number; quantity: number }[];
}

/** Create the order + its items, then clear the cart, in a single transaction. */
export function createOrderAndClearCart(input: OrderCreateInput, cartId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderId: input.orderId,
        contactId: input.contactId,
        total: input.total,
        status: "pending",
        paymentStatus: "pending",
        razorpayOrderId: input.razorpayOrderId,
        phone: input.phone,
        organizationId: input.organizationId,
        address: input.address,
        ...input.attribution,
        items: { create: input.items },
      },
      include: { items: true },
    });
    await tx.cartItem.deleteMany({ where: { cartId } });
    return order;
  });
}

export function findOrderByRazorpayOrderId(razorpayOrderId: string) {
  return prisma.order.findFirst({ where: { razorpayOrderId } });
}

export function markOrderPaid(orderId: string, paymentId: string, signature: string) {
  return prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "paid",
      status: "confirmed",
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    },
  });
}
