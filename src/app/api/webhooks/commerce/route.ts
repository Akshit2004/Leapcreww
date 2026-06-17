/**
 * POST /api/webhooks/commerce
 *
 * Platform-agnostic commerce event webhook. Any store (WooCommerce, custom,
 * Dukaan, etc.) can POST a normalized CommerceEvent here using an org API key.
 * The same COD confirmation flows and sequence triggers that Shopify uses fire
 * identically — the platform is irrelevant above this layer.
 *
 * Auth: Authorization: Bearer wf_live_<key>
 *
 * Supported events:
 *   order.cod_pending    — COD order placed; fires cod_order_placed sequence
 *   order.placed         — Prepaid order placed; fires order_placed sequence
 *   cart.abandoned       — Cart left unpaid; fires cart_abandoned sequence
 *   inventory.restocked  — SKU back in stock; notifies registered watchers
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/shared/lib/prisma";
import { enrollOnTrigger } from "@/features/sequences/services/sequenceService";
import { emitEvent } from "@/features/webhooks/services/webhookDeliveryService";
import { authenticateApiKey } from "@/features/public-api/services/apiKeyService";
import { ApiError } from "@/shared/lib/api";
import { checkAndFlagCodRisk } from "@/features/cod/services/codService";

const CommerceEventSchema = z.object({
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
      total: z.number().nonnegative(), // rupees (not paise) — e.g. 1249.00
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
  source: z.string().max(64).optional(), // e.g. "woocommerce", "dukaan", "custom"
  // inventory.restocked fields
  product: z
    .object({
      sku: z.string().max(128),
      title: z.string().max(255),
      url: z.string().url().max(2048).optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Authenticate via existing API key infrastructure
    const ctx = await authenticateApiKey(req);
    const orgId = ctx.organizationId;

    const body = await req.json();
    const parsed = CommerceEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { event, contact: contactInput, order, cart, source = "custom" } = parsed.data;

    // inventory.restocked is a product-level event with no single contact
    if (event === "inventory.restocked") {
      if (!parsed.data.product) {
        return NextResponse.json({ error: "product is required for inventory.restocked" }, { status: 400 });
      }
      const { sku, title, url } = parsed.data.product;
      const { notifyStockWatchers } = await import("@/features/stock-alerts/services/stockAlertService");
      const { notified } = await notifyStockWatchers({ orgId, sku, productTitle: title, productUrl: url });
      await emitEvent(orgId, "inventory.restocked", { sku, title, url: url ?? null, source, notified });
      return NextResponse.json({ success: true, event, sku, notified });
    }

    if (!contactInput) {
      return NextResponse.json({ error: "contact is required for this event" }, { status: 400 });
    }

    const phone = normalizePhone(contactInput.phone);

    // Upsert contact (org-scoped, keyed by phone)
    const contact = await upsertContact(orgId, phone, contactInput.name, contactInput.email, source);

    if (event === "order.cod_pending") {
      if (!order) {
        return NextResponse.json({ error: "order is required for order.cod_pending" }, { status: 400 });
      }

      const formattedTotal = order.total.toFixed(2);

      // Set COD-specific attributes the confirmation sequence templates need
      const attrs = (contact.attributes as Record<string, unknown>) || {};
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          attributes: {
            ...attrs,
            cod_status: "pending",
            pending_cod_order_id: order.id,
            pending_cod_order_total: formattedTotal,
            pending_cod_order_items: order.items?.map((i) => `${i.name} (x${i.quantity})`).join(", ") || "",
          },
          tags: { set: Array.from(new Set([...contact.tags, source, "COD-Pending"])) },
        },
      });

      // Create order record (minimal — no product sync for non-Shopify sources)
      await prisma.order.create({
        data: {
          orderId: order.id,
          contactId: contact.id,
          total: Math.round(order.total * 100),
          status: "confirmed",
          paymentStatus: "pending",
          codStatus: "pending",
          phone,
          organizationId: orgId,
        },
      });

      // Cancel any active/paused cart recovery enrollments — customer placed an order
      await prisma.sequenceEnrollment.updateMany({
        where: {
          contactId: contact.id,
          organizationId: orgId,
          status: { in: ["active", "paused"] },
          sequence: { trigger: "cart_abandoned" },
        },
        data: { status: "completed", nextRunAt: null },
      });
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          attributes: {
            ...((contact.attributes as Record<string, unknown>) || {}),
            cart_recovered: true,
            cart_recovery_enrolled: false,
            cart_recovered_at: new Date().toISOString(),
          },
        },
      });

      await checkAndFlagCodRisk(
        orgId,
        contact.id,
        contact.name,
        phone,
        order.id,
        Math.round(order.total * 100),
        order.items?.map((i) => ({ name: i.name, quantity: i.quantity })),
        // shopifyNumericId — not available for non-Shopify sources
        undefined,
      );
      await enrollOnTrigger(orgId, "cod_order_placed", contact.id);

      await emitEvent(orgId, "order.cod_pending", {
        orderId: order.id,
        total: Math.round(order.total * 100),
        currency: "INR",
        source,
        contact: { id: contact.id, name: contact.name, phone: contact.phone },
      });

      await prisma.systemLog.create({
        data: {
          type: "integration",
          message: `[${source}] COD order #${order.id} from ${contact.name} (₹${formattedTotal}). Awaiting WhatsApp confirmation.`,
          organizationId: orgId,
        },
      });

      return NextResponse.json({ success: true, event, orderId: order.id, contactId: contact.id });
    }

    if (event === "order.placed") {
      if (!order) {
        return NextResponse.json({ error: "order is required for order.placed" }, { status: 400 });
      }

      await prisma.order.create({
        data: {
          orderId: order.id,
          contactId: contact.id,
          total: Math.round(order.total * 100),
          status: "confirmed",
          paymentStatus: "paid",
          codStatus: null,
          phone,
          organizationId: orgId,
        },
      });

      // Cancel any active/paused cart recovery enrollments — customer placed an order
      await prisma.sequenceEnrollment.updateMany({
        where: {
          contactId: contact.id,
          organizationId: orgId,
          status: { in: ["active", "paused"] },
          sequence: { trigger: "cart_abandoned" },
        },
        data: { status: "completed", nextRunAt: null },
      });
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          attributes: {
            ...((contact.attributes as Record<string, unknown>) || {}),
            cart_recovered: true,
            cart_recovery_enrolled: false,
            cart_recovered_at: new Date().toISOString(),
          },
        },
      });

      await enrollOnTrigger(orgId, "order_placed", contact.id);

      await emitEvent(orgId, "order.placed", {
        orderId: order.id,
        total: Math.round(order.total * 100),
        currency: "INR",
        source,
        contact: { id: contact.id, name: contact.name, phone: contact.phone },
      });

      await prisma.systemLog.create({
        data: {
          type: "integration",
          message: `[${source}] Prepaid order #${order.id} from ${contact.name} (₹${order.total.toFixed(2)}).`,
          organizationId: orgId,
        },
      });

      return NextResponse.json({ success: true, event, orderId: order.id, contactId: contact.id });
    }

    if (event === "cart.abandoned") {
      if (!cart) {
        return NextResponse.json({ error: "cart is required for cart.abandoned" }, { status: 400 });
      }

      const attrs = (contact.attributes as Record<string, unknown>) || {};
      if (attrs.cart_recovery_enrolled === true) {
        return NextResponse.json({ success: true, event, skipped: "already enrolled", contactId: contact.id });
      }

      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          attributes: {
            ...attrs,
            shopify_checkout_url: cart.checkout_url,
            cart_total: cart.total,
            cart_items: cart.items || "",
            cart_abandoned_at: new Date().toISOString(),
            cart_recovery_enrolled: true,
          },
          tags: { set: Array.from(new Set([...contact.tags, source, "Abandoned-Cart"])) },
        },
      });

      await enrollOnTrigger(orgId, "cart_abandoned", contact.id);

      await prisma.systemLog.create({
        data: {
          type: "integration",
          message: `[${source}] Cart abandoned by ${contact.name} (₹${cart.total}). Enrolled in recovery sequence.`,
          organizationId: orgId,
        },
      });

      return NextResponse.json({ success: true, event, contactId: contact.id });
    }

    return NextResponse.json({ error: "Unhandled event type" }, { status: 400 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[Commerce webhook]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  return raw.startsWith("+") ? `+${digits}` : `+${digits}`;
}

async function upsertContact(
  orgId: string,
  phone: string,
  name?: string,
  email?: string,
  source?: string
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
