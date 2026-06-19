/**
 * codRepo.ts — Prisma access for the COD (Cash on Delivery) confirmation feature.
 *
 * This is the ONLY place @/shared/lib/prisma may be imported within the cod
 * feature. Every query is scoped by organizationId (Article II).
 */
import { prisma } from "@/shared/lib/prisma";

/** Update a contact's attributes/tags after a COD confirm/cancel reply. */
export function updateContactCodStatus(
  contactId: string,
  attributes: Record<string, any>,
  tags: string[]
) {
  return prisma.contact.update({
    where: { id: contactId },
    data: {
      attributes,
      tags: { set: tags },
    },
  });
}

/** Mark all orders matching orderId+org with the given COD status. */
export function updateOrderCodStatus(orderId: string, organizationId: string, codStatus: string) {
  return prisma.order.updateMany({
    where: { orderId, organizationId },
    data: { codStatus },
  });
}

/** Wire a Razorpay payment link onto an order so its webhook can resolve it. */
export function setOrderRazorpayLink(orderId: string, organizationId: string, razorpayOrderId: string) {
  return prisma.order.updateMany({
    where: { orderId, organizationId },
    data: { razorpayOrderId },
  });
}

/** Log an outbound agent message and reflect it on the contact's inbox preview. */
export async function recordAgentMessage(
  contactId: string,
  organizationId: string,
  text: string
) {
  await prisma.message.create({
    data: { sender: "agent", text, contactId, organizationId },
  });

  const d = new Date();
  const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  await prisma.contact.update({
    where: { id: contactId },
    data: { lastMessage: text.slice(0, 60), lastMessageTime: timeStr },
  });
}

/** Write a system log entry for COD confirm/cancel events. */
export function createCodSystemLog(organizationId: string, message: string) {
  return prisma.systemLog.create({
    data: { type: "integration", message, organizationId },
  });
}

/** All active sequence enrollments triggered by "cod_order_placed" for a contact. */
export function findActiveCodSequenceEnrollments(contactId: string, organizationId: string) {
  return prisma.sequenceEnrollment.findMany({
    where: {
      contactId,
      organizationId,
      status: "active",
      sequence: { trigger: "cod_order_placed" },
    },
  });
}

/** Mark a sequence enrollment as completed (stops further scheduled runs). */
export function completeSequenceEnrollment(enrollmentId: string) {
  return prisma.sequenceEnrollment.update({
    where: { id: enrollmentId },
    data: { status: "completed", nextRunAt: null },
  });
}

/**
 * Stamp a Shopify fulfillment hold onto the order row.
 * `fulfillmentHeldAt` is set to now so the cron can auto-release stale holds.
 */
export function setOrderFulfillmentHold(
  orderId: string,
  organizationId: string,
  fulfillmentHoldId: string
) {
  return prisma.order.updateMany({
    where: { orderId, organizationId },
    data: { fulfillmentHoldId, fulfillmentHeldAt: new Date() },
  });
}

/**
 * Clear the fulfillment hold fields once the hold is released (confirmed or
 * auto-released by the cron).
 */
export function clearOrderFulfillmentHold(orderId: string, organizationId: string) {
  return prisma.order.updateMany({
    where: { orderId, organizationId },
    data: { fulfillmentHoldId: null, fulfillmentHeldAt: null },
  });
}

/**
 * Return the first order row for (orderId, org) with its Shopify identifiers.
 * Used by the fulfillment hold logic to fetch hold IDs before releasing them.
 */
export function findOrderByOrderId(orderId: string, organizationId: string) {
  return prisma.order.findFirst({
    where: { orderId, organizationId },
    select: { id: true, orderId: true, shopifyNumericId: true, fulfillmentHoldId: true },
  });
}
