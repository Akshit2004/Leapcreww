/**
 * commerceWebhookService.ts — business logic for the platform-agnostic commerce
 * webhook. Handles COD orders, prepaid orders, abandoned carts, and inventory
 * restock notifications. All Prisma access is delegated to commerceWebhookRepo.
 */
import { z } from "zod";
import { ApiError } from "@/shared/lib/api";
import { enrollOnTrigger } from "@/features/sequences/services/sequenceService";
import { emitEvent } from "@/features/webhooks/services/webhookDeliveryService";
import { checkAndFlagCodRisk } from "@/features/cod/services/codService";
import * as repo from "../repositories/commerceWebhookRepo";

// ─── Zod schema (shared by route for parsing and service for typing) ──────────

export const CommerceEventSchema = z.object({
  event: z.enum(["order.cod_pending", "order.placed", "cart.abandoned", "inventory.restocked"]),
  contact: z
    .object({
      phone: z.string().min(5).max(20),
      name: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  order: z
    .object({
      id: z.string().max(128),
      total: z.number().nonnegative(),
      items: z
        .array(z.object({ name: z.string(), quantity: z.number().int().positive(), price: z.number() }))
        .optional(),
    })
    .optional(),
  cart: z
    .object({
      total: z.string(),
      checkout_url: z.string().url(),
      items: z.string().optional(),
    })
    .optional(),
  source: z.string().max(64).optional(),
  product: z
    .object({
      sku: z.string().max(128),
      title: z.string().max(255),
      url: z.string().url().max(2048).optional(),
    })
    .optional(),
});

export type CommerceEventInput = z.infer<typeof CommerceEventSchema>;

// ─── Phone normalizer ─────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  return raw.startsWith("+") ? `+${digits}` : `+${digits}`;
}

// ─── Event response shapes ────────────────────────────────────────────────────

export type CommerceEventResult =
  | { event: "inventory.restocked"; sku: string; notified: number }
  | { event: "order.cod_pending"; orderId: string; contactId: string }
  | { event: "order.placed"; orderId: string; contactId: string }
  | { event: "cart.abandoned"; contactId: string; skipped?: string };

// ─── Main handler ─────────────────────────────────────────────────────────────

/**
 * Handle a validated commerce event for an org.
 * Throws `ApiError` for any business-level validation failures.
 */
export async function handleCommerceEvent(
  orgId: string,
  data: CommerceEventInput,
): Promise<CommerceEventResult> {
  const { event, contact: contactInput, order, cart, source = "custom" } = data;

  // ── inventory.restocked ───────────────────────────────────────────────────
  if (event === "inventory.restocked") {
    if (!data.product) {
      throw new ApiError("product is required for inventory.restocked", 400);
    }
    const { sku, title, url } = data.product;
    const { notifyStockWatchers } = await import("@/features/stock-alerts/services/stockAlertService");
    const { notified } = await notifyStockWatchers({ orgId, sku, productTitle: title, productUrl: url });
    await emitEvent(orgId, "inventory.restocked", { sku, title, url: url ?? null, source, notified });
    return { event: "inventory.restocked", sku, notified };
  }

  if (!contactInput) {
    throw new ApiError("contact is required for this event", 400);
  }

  const phone = normalizePhone(contactInput.phone);
  const contact = await repo.upsertCommerceContact(orgId, phone, contactInput.name, contactInput.email, source);

  // ── order.cod_pending ─────────────────────────────────────────────────────
  if (event === "order.cod_pending") {
    if (!order) {
      throw new ApiError("order is required for order.cod_pending", 400);
    }

    const formattedTotal = order.total.toFixed(2);
    const itemsSummary = order.items?.map((i) => `${i.name} (x${i.quantity})`).join(", ") || "";
    const totalPaise = Math.round(order.total * 100);
    const currentAttrs = (contact.attributes as Record<string, unknown>) || {};

    await repo.setContactCodPendingAttrs(
      contact.id,
      currentAttrs,
      contact.tags,
      order.id,
      formattedTotal,
      itemsSummary,
      source,
    );

    await repo.createCodOrder(orgId, order.id, contact.id, totalPaise, phone);

    // Cancel any active/paused cart-recovery sequences — customer placed an order
    await repo.cancelCartRecoveryEnrollments(orgId, contact.id, currentAttrs);

    await checkAndFlagCodRisk(
      orgId,
      contact.id,
      contact.name,
      phone,
      order.id,
      totalPaise,
      order.items?.map((i) => ({ name: i.name, quantity: i.quantity })),
      // shopifyNumericId — not available for non-Shopify sources
      undefined,
    );

    await enrollOnTrigger(orgId, "cod_order_placed", contact.id);

    await emitEvent(orgId, "order.cod_pending", {
      orderId: order.id,
      total: totalPaise,
      currency: "INR",
      source,
      contact: { id: contact.id, name: contact.name, phone: contact.phone },
    });

    await repo.createCommerceSystemLog(
      orgId,
      `[${source}] COD order #${order.id} from ${contact.name} (₹${formattedTotal}). Awaiting WhatsApp confirmation.`,
    );

    return { event: "order.cod_pending", orderId: order.id, contactId: contact.id };
  }

  // ── order.placed ──────────────────────────────────────────────────────────
  if (event === "order.placed") {
    if (!order) {
      throw new ApiError("order is required for order.placed", 400);
    }

    const totalPaise = Math.round(order.total * 100);
    const currentAttrs = (contact.attributes as Record<string, unknown>) || {};

    await repo.createPrepaidOrder(orgId, order.id, contact.id, totalPaise, phone);

    // Cancel any active/paused cart-recovery sequences — customer placed an order
    await repo.cancelCartRecoveryEnrollments(orgId, contact.id, currentAttrs);

    await enrollOnTrigger(orgId, "order_placed", contact.id);

    await emitEvent(orgId, "order.placed", {
      orderId: order.id,
      total: totalPaise,
      currency: "INR",
      source,
      contact: { id: contact.id, name: contact.name, phone: contact.phone },
    });

    await repo.createCommerceSystemLog(
      orgId,
      `[${source}] Prepaid order #${order.id} from ${contact.name} (₹${order.total.toFixed(2)}).`,
    );

    return { event: "order.placed", orderId: order.id, contactId: contact.id };
  }

  // ── cart.abandoned ────────────────────────────────────────────────────────
  if (event === "cart.abandoned") {
    if (!cart) {
      throw new ApiError("cart is required for cart.abandoned", 400);
    }

    const attrs = (contact.attributes as Record<string, unknown>) || {};
    if (attrs.cart_recovery_enrolled === true) {
      return { event: "cart.abandoned", contactId: contact.id, skipped: "already enrolled" };
    }

    await repo.setContactCartAbandonedAttrs(
      contact.id,
      attrs,
      contact.tags,
      cart.checkout_url,
      cart.total,
      cart.items || "",
      source,
    );

    await enrollOnTrigger(orgId, "cart_abandoned", contact.id);

    await repo.createCommerceSystemLog(
      orgId,
      `[${source}] Cart abandoned by ${contact.name} (₹${cart.total}). Enrolled in recovery sequence.`,
    );

    return { event: "cart.abandoned", contactId: contact.id };
  }

  throw new ApiError("Unhandled event type", 400);
}
