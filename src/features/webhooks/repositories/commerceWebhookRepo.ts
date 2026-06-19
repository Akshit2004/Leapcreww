/** commerceWebhookRepo.ts — Prisma access for the platform-agnostic commerce webhook. */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Upsert a contact for a commerce event. The identity key is (organizationId, phone).
 * Creates a new contact when none exists; updates name/email/status otherwise.
 */
export async function upsertCommerceContact(
  orgId: string,
  phone: string,
  name?: string,
  email?: string,
  source?: string,
) {
  const existing = await prisma.contact.findFirst({
    where: { phone, organizationId: orgId },
  });

  if (existing) {
    return prisma.contact.update({
      where: { id: existing.id },
      data: {
        name: name || existing.name,
        email: email || existing.email,
        status: "Active",
      },
    });
  }

  return prisma.contact.create({
    data: {
      name: name || `Customer ${phone.slice(-4)}`,
      phone,
      email: email || null,
      source: source || "Commerce Webhook",
      tags: [source || "webhook"],
      status: "Active",
      organizationId: orgId,
    },
  });
}

/** Patch contact attributes and tags for a COD-pending event. */
export async function setContactCodPendingAttrs(
  contactId: string,
  currentAttributes: Record<string, unknown>,
  currentTags: string[],
  orderId: string,
  formattedTotal: string,
  itemsSummary: string,
  source: string,
) {
  return prisma.contact.update({
    where: { id: contactId },
    data: {
      attributes: {
        ...currentAttributes,
        cod_status: "pending",
        pending_cod_order_id: orderId,
        pending_cod_order_total: formattedTotal,
        pending_cod_order_items: itemsSummary,
      },
      tags: { set: Array.from(new Set([...currentTags, source, "COD-Pending"])) },
    },
  });
}

/** Create an order record for a COD commerce event. */
export async function createCodOrder(
  orgId: string,
  orderId: string,
  contactId: string,
  totalPaise: number,
  phone: string,
) {
  return prisma.order.create({
    data: {
      orderId,
      contactId,
      total: totalPaise,
      status: "confirmed",
      paymentStatus: "pending",
      codStatus: "pending",
      phone,
      organizationId: orgId,
    },
  });
}

/** Create an order record for a prepaid commerce event. */
export async function createPrepaidOrder(
  orgId: string,
  orderId: string,
  contactId: string,
  totalPaise: number,
  phone: string,
) {
  return prisma.order.create({
    data: {
      orderId,
      contactId,
      total: totalPaise,
      status: "confirmed",
      paymentStatus: "paid",
      codStatus: null,
      phone,
      organizationId: orgId,
    },
  });
}

/**
 * Cancel any active or paused cart-recovery sequence enrollments for a contact
 * and mark the contact's cart as recovered.
 */
export async function cancelCartRecoveryEnrollments(
  orgId: string,
  contactId: string,
  currentAttributes: Record<string, unknown>,
) {
  await prisma.sequenceEnrollment.updateMany({
    where: {
      contactId,
      organizationId: orgId,
      status: { in: ["active", "paused"] },
      sequence: { trigger: "cart_abandoned" },
    },
    data: { status: "completed", nextRunAt: null },
  });

  return prisma.contact.update({
    where: { id: contactId },
    data: {
      attributes: {
        ...currentAttributes,
        cart_recovered: true,
        cart_recovery_enrolled: false,
        cart_recovered_at: new Date().toISOString(),
      },
    },
  });
}

/** Patch contact attributes and tags for a cart-abandoned event. */
export async function setContactCartAbandonedAttrs(
  contactId: string,
  currentAttributes: Record<string, unknown>,
  currentTags: string[],
  checkoutUrl: string,
  cartTotal: string,
  cartItems: string,
  source: string,
) {
  return prisma.contact.update({
    where: { id: contactId },
    data: {
      attributes: {
        ...currentAttributes,
        shopify_checkout_url: checkoutUrl,
        cart_total: cartTotal,
        cart_items: cartItems,
        cart_abandoned_at: new Date().toISOString(),
        cart_recovery_enrolled: true,
      },
      tags: { set: Array.from(new Set([...currentTags, source, "Abandoned-Cart"])) },
    },
  });
}

/** Write a system log entry for a commerce event. */
export function createCommerceSystemLog(orgId: string, message: string) {
  return prisma.systemLog.create({
    data: { type: "integration", message, organizationId: orgId },
  });
}
