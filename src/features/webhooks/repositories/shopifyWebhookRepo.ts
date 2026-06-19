/** shopifyWebhookRepo.ts — Prisma access for Shopify push-webhook events. */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Tenant-scoped contact upsert for Shopify events.
 * Keyed by (organizationId, phone) — never the global id — so two orgs sharing a
 * customer phone get distinct contacts. When the customer has no phone, a synthetic
 * email is used to ensure the (organizationId, email) constraint always holds.
 */
export async function upsertShopifyContact(
  orgId: string,
  email: string,
  name: string,
  phone: string,
  source: string,
  tags: string[],
) {
  // Phone is the primary identity key — upsert on (org, phone)
  if (phone) {
    const existing = await prisma.contact.findFirst({ where: { phone, organizationId: orgId } });
    if (existing) {
      return prisma.contact.update({
        where: { id: existing.id },
        data: { name, email: email || existing.email, source, tags: { set: tags }, status: "Active" },
      });
    }
    return prisma.contact.create({
      data: { name, phone, email: email || null, source, tags, status: "Active", organizationId: orgId },
    });
  }

  const existingByPhone = await prisma.contact.findFirst({ where: { phone, organizationId: orgId } });
  if (existingByPhone) {
    return prisma.contact.update({
      where: { id: existingByPhone.id },
      data: {
        name,
        source,
        tags: { set: Array.from(new Set([...existingByPhone.tags, ...tags])) },
        status: "Active",
      },
    });
  }

  const syntheticEmail = `${phone.replace(/[^0-9]/g, "") || "unknown"}@shopify.customer`;
  return prisma.contact.create({
    data: { name, phone, email: syntheticEmail, source, tags, status: "Active", organizationId: orgId },
  });
}

/** Find or create the Cart row for a contact. */
export async function findOrCreateCart(contactId: string) {
  const existing = await prisma.cart.findUnique({ where: { contactId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { contactId } });
}

/** Delete all CartItem rows for a cart (called before re-inserting fresh line items). */
export function clearCartItems(cartId: string) {
  return prisma.cartItem.deleteMany({ where: { cartId } });
}

/** Find or create a Product record scoped to the org. */
export async function findOrCreateProduct(
  orgId: string,
  title: string,
  priceInPaise: number,
) {
  const existing = await prisma.product.findFirst({ where: { name: title, organizationId: orgId } });
  if (existing) return existing;
  return prisma.product.create({
    data: {
      name: title,
      description: "Shopify catalog item",
      price: priceInPaise,
      images: ["https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=300"],
      category: "Shopify",
      stock: 50,
      organizationId: orgId,
    },
  });
}

/** Create a CartItem record. */
export function createCartItem(cartId: string, productId: string, quantity: number) {
  return prisma.cartItem.create({
    data: { cartId, productId, quantity },
  });
}

/** Patch contact attributes (used for checkout/cart events). */
export function updateContactAttributes(contactId: string, attributes: Prisma.InputJsonValue) {
  return prisma.contact.update({
    where: { id: contactId },
    data: { attributes },
  });
}

/** Create a Message bubble in the live-chat inbox. */
export function createMessage(data: {
  sender: string;
  text: string;
  contactId: string;
  organizationId: string;
}) {
  return prisma.message.create({ data });
}

/** Write a system log entry. */
export function createShopifySystemLog(orgId: string, message: string) {
  return prisma.systemLog.create({
    data: { type: "integration", message, organizationId: orgId },
  });
}

/** Cancel active/paused cart-recovery enrollments for a contact. */
export function cancelCartRecoveryEnrollments(orgId: string, contactId: string) {
  return prisma.sequenceEnrollment.updateMany({
    where: {
      contactId,
      organizationId: orgId,
      status: { in: ["active", "paused"] },
      sequence: { trigger: "cart_abandoned" },
    },
    data: { status: "completed", nextRunAt: null },
  });
}

/** Create an order record using scalar foreign-key fields. */
export function createOrder(data: Prisma.OrderUncheckedCreateInput) {
  return prisma.order.create({ data });
}

/** Create an OrderItem record using scalar foreign-key fields. */
export function createOrderItem(data: Prisma.OrderItemUncheckedCreateInput) {
  return prisma.orderItem.create({ data });
}

/** Find an order by its display orderId (org-scoped), including the related contact. */
export function findOrderWithContact(orgId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { orderId, organizationId: orgId },
    include: { contact: true },
  });
}

/** Mark an order as shipped. */
export function markOrderShipped(orderId: string) {
  return prisma.order.update({ where: { id: orderId }, data: { status: "shipped" } });
}

/** Find the first approved template with the given name, scoped to the org. */
export function findApprovedTemplate(orgId: string, name: string) {
  return prisma.template.findFirst({
    where: { name, organizationId: orgId, metaStatus: "approved" },
  });
}

/** Disconnect a Shopify integration (app/uninstalled). */
export function disconnectShopifyIntegration(orgId: string, shop: string) {
  return prisma.integration.updateMany({
    where: { id: "shopify", webhookUrl: `https://${shop}`, organizationId: orgId },
    data: { status: "disconnected" },
  });
}

/** Find a contact by phone or email within an org (for GDPR redact). */
export async function findContactForRedact(orgId: string, phone?: string, email?: string) {
  return prisma.contact.findFirst({
    where: {
      organizationId: orgId,
      ...(phone ? { phone } : { email: email ?? "" }),
    },
  });
}

/** Anonymise a contact record in-place (GDPR right to erasure). */
export function anonymiseContact(contactId: string) {
  return prisma.contact.update({
    where: { id: contactId },
    data: {
      name: "[Redacted]",
      email: null,
      phone: `redacted_${contactId}`,
      attributes: {},
      tags: [],
    },
  });
}

/** Delete all NetworkSignal rows for a given phone hash (GDPR right to erasure). */
export function deleteNetworkSignalsByPhoneHash(phoneHash: string) {
  return prisma.networkSignal.deleteMany({ where: { phoneHash } });
}

/** Find the integration record for a Shopify shop. */
export function findShopifyIntegration(shop: string) {
  return prisma.integration.findFirst({
    where: {
      id: "shopify",
      webhookUrl: `https://${shop}`,
    },
  });
}
