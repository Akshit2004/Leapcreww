/**
 * shopifyWebhookService.ts — business logic for Shopify push-webhook events.
 * Handles checkouts, orders, fulfilments, inventory, GDPR, and app uninstall.
 * All Prisma access is delegated to shopifyWebhookRepo.
 */
import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import { enrollOnTrigger } from "@/features/sequences/services/sequenceService";
import { resolveAttribution } from "@/features/analytics/services/attribution";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import { checkAndFlagCodRisk } from "@/features/cod/services/codService";
import * as repo from "../repositories/shopifyWebhookRepo";

// ─── Shopify webhook payload shapes (only the fields this handler reads) ──────

export interface ShopifyAddress {
  phone?: string;
}

export interface ShopifyLineItem {
  title: string;
  price?: string;
  quantity?: number;
}

export interface ShopifyFulfillment {
  tracking_company?: string;
  tracking_number?: string;
}

export interface ShopifyWebhookPayload {
  id?: string | number;
  email?: string;
  customer?: { email?: string; first_name?: string; last_name?: string; phone?: string };
  billing_address?: ShopifyAddress;
  shipping_address?: ShopifyAddress;
  line_items?: ShopifyLineItem[];
  total_price?: string;
  financial_status?: string;
  order_number?: string | number;
  fulfillments?: ShopifyFulfillment[];
  abandoned_checkout_url?: string;
  // inventory_levels/update fields
  inventory_item_id?: number | string;
  available?: number;
}

// ─── Phone extraction helper ──────────────────────────────────────────────────

function extractPhone(payload: ShopifyWebhookPayload, addressObj?: ShopifyAddress): string {
  const rawPhone = addressObj?.phone || payload.customer?.phone || "+919999988888";
  return rawPhone.startsWith("+") ? rawPhone : `+${rawPhone.replace(/[^0-9]/g, "")}`;
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

/**
 * Route a Shopify webhook event to the appropriate handler.
 * Returns a plain object suitable for a JSON response body.
 */
export async function handleShopifyEvent(
  topic: string,
  payload: ShopifyWebhookPayload,
  orgId: string,
  shop: string,
): Promise<{ success: boolean; message?: string; notified?: number }> {
  const d = new Date();
  const timestampStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;

  const email = payload.customer?.email || payload.email || "";
  const name = `${payload.customer?.first_name || "Shopify"} ${payload.customer?.last_name || "Customer"}`.trim();
  const phone = extractPhone(payload, payload.billing_address || payload.shipping_address);

  // ── A. ABANDONED CART ────────────────────────────────────────────────────
  if (topic === "checkouts/create" || topic === "checkouts/update") {
    const contact = await repo.upsertShopifyContact(
      orgId,
      email,
      name,
      phone,
      "Shopify Checkout",
      ["Shopify", "Shopify-Cart"],
    );

    const lineItems = payload.line_items || [];
    const cart = await repo.findOrCreateCart(contact.id);
    await repo.clearCartItems(cart.id);

    for (const item of lineItems) {
      const itemPriceInPaise = Math.round(parseFloat(item.price || "0") * 100);
      const product = await repo.findOrCreateProduct(orgId, item.title, itemPriceInPaise);
      await repo.createCartItem(cart.id, product.id, item.quantity || 1);
    }

    const contactAttributes = (contact.attributes as Record<string, unknown>) || {};
    const alreadyEnrolled = contactAttributes.cart_recovery_enrolled === true;

    contactAttributes.shopify_checkout_url = payload.abandoned_checkout_url || "";
    contactAttributes.cart_total = payload.total_price || "0.00";
    contactAttributes.cart_items = lineItems.map((i) => `${i.title} (x${i.quantity || 1})`).join(", ");
    contactAttributes.cart_abandoned_at = contactAttributes.cart_abandoned_at || timestampStr;
    contactAttributes.cart_recovered = false;
    if (!alreadyEnrolled) contactAttributes.cart_recovery_enrolled = true;

    await repo.updateContactAttributes(contact.id, contactAttributes as Prisma.InputJsonValue);

    if (alreadyEnrolled) {
      // checkouts/update fired again (e.g. address/phone edited) — cart info
      // refreshed above, but the recovery drip is already running for this cart.
      return { success: true, message: "Checkout updated; recovery sequence already enrolled." };
    }

    await repo.createShopifySystemLog(
      orgId,
      `Shopify Webhook: ${topic} - Cart abandoned by ${name} (₹${payload.total_price || "0.00"}). Saved to database, scheduling drip recovery sequence.`,
    );

    await enrollOnTrigger(orgId, "cart_abandoned", contact.id);

    await repo.createMessage({
      sender: "system",
      text: `[Shopify Automations] Cart abandoned by ${name} (₹${payload.total_price || "0.00"}). Enrolled contact into Cart Recovery sequence.`,
      contactId: contact.id,
      organizationId: orgId,
    });

    return { success: true, message: "Abandoned checkout webhook processed." };
  }

  // ── B. ORDER CREATED / CONFIRMED ─────────────────────────────────────────
  if (topic === "orders/create") {
    const isCod = payload.financial_status !== "paid";
    const orderItems = payload.line_items || [];
    const totalPriceInPaise = Math.round(parseFloat(payload.total_price || "0") * 100);
    const formattedPrice = (totalPriceInPaise / 100).toFixed(2);
    const shopifyOrderId = `SHPFY-${payload.order_number || payload.id}`;
    const shopifyNumericId = payload.id != null ? String(payload.id) : undefined;

    const contact = await repo.upsertShopifyContact(
      orgId,
      email,
      name,
      phone,
      "Shopify Purchase",
      ["Shopify", "Shopify-Buyer"],
    );

    const contactAttributes = (contact.attributes as Record<string, unknown>) || {};
    contactAttributes.cart_recovered = true;
    contactAttributes.cart_recovery_enrolled = false;
    contactAttributes.cart_recovered_at = new Date().toISOString();
    contactAttributes.last_order_id = shopifyOrderId;

    if (isCod) {
      contactAttributes.cod_status = "pending";
      contactAttributes.pending_cod_order_id = shopifyOrderId;
      contactAttributes.pending_cod_order_total = formattedPrice;
      contactAttributes.pending_cod_order_items = orderItems
        .map((i: ShopifyLineItem) => `${i.title} (x${i.quantity || 1})`)
        .join(", ");
    }

    await repo.updateContactAttributes(contact.id, contactAttributes as Prisma.InputJsonValue);
    await repo.cancelCartRecoveryEnrollments(orgId, contact.id);

    const attribution = await resolveAttribution(orgId, contact);
    const savedOrder = await repo.createOrder({
      orderId: shopifyOrderId,
      contactId: contact.id,
      total: totalPriceInPaise,
      status: "confirmed",
      paymentStatus: isCod ? "pending" : "paid",
      codStatus: isCod ? "pending" : null,
      phone,
      organizationId: orgId,
      shopifyNumericId: shopifyNumericId ?? null,
      ...attribution,
    });

    for (const item of orderItems) {
      const itemPriceInPaise = Math.round(parseFloat(item.price || "0") * 100);
      const product = await repo.findOrCreateProduct(orgId, item.title, itemPriceInPaise);
      await repo.createOrderItem({
        orderId: savedOrder.id,
        productId: product.id,
        name: item.title,
        price: itemPriceInPaise,
        quantity: item.quantity || 1,
      });
    }

    const { emitEvent } = await import("@/features/webhooks/services/webhookDeliveryService");

    if (isCod) {
      await checkAndFlagCodRisk(
        orgId,
        contact.id,
        name,
        phone,
        shopifyOrderId,
        totalPriceInPaise,
        orderItems.map((i: ShopifyLineItem) => ({ name: i.title, quantity: i.quantity || 1 })),
        shopifyNumericId,
        savedOrder.id,
      );
      await enrollOnTrigger(orgId, "cod_order_placed", contact.id);

      await emitEvent(orgId, "order.cod_pending", {
        orderId: savedOrder.orderId,
        total: totalPriceInPaise,
        currency: "INR",
        source: "shopify",
        contact: { id: contact.id, name: contact.name, phone: contact.phone },
      });

      await repo.createShopifySystemLog(
        orgId,
        `Shopify COD order #${shopifyOrderId} from ${name} (₹${formattedPrice}). Awaiting WhatsApp confirmation.`,
      );
    } else {
      await enrollOnTrigger(orgId, "order_placed", contact.id);

      await emitEvent(orgId, "order.placed", {
        orderId: savedOrder.orderId,
        total: totalPriceInPaise,
        currency: "INR",
        source: "shopify",
        contact: { id: contact.id, name: contact.name, phone: contact.phone },
        items: orderItems.map((i: { title?: string; quantity?: number; price?: string }) => ({
          name: i.title ?? "Item",
          quantity: i.quantity ?? 1,
          price: Math.round(parseFloat(i.price || "0") * 100),
        })),
      });

      const lastActive = contact.lastActiveAt ? new Date(contact.lastActiveAt).getTime() : 0;
      const isSessionActive = Date.now() - lastActive <= 24 * 60 * 60 * 1000;
      const dbTemplate = await repo.findApprovedTemplate(orgId, "order_confirmation");

      let sentSuccessfully = false;
      let textSent = "";

      if (dbTemplate || !isSessionActive) {
        const templateName = dbTemplate?.name || "order_confirmation";
        textSent = `[Template: ${templateName}] Order #${shopifyOrderId} ₹${formattedPrice}`;
        const r = await sendWhatsAppMessage(
          {
            to: formatPhoneNumber(phone),
            template: {
              name: templateName,
              language: { code: "en_US" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: name },
                    { type: "text", text: shopifyOrderId },
                    { type: "text", text: `₹${formattedPrice}` },
                  ],
                },
              ],
            },
          },
          orgId,
        );
        sentSuccessfully = r.ok;
      }

      if (!sentSuccessfully) {
        const receiptText =
          `🛍️ *Order Confirmed!*\n\nHi ${name}, your order #${shopifyOrderId} is confirmed.\n\n` +
          orderItems.map((item: ShopifyLineItem) => `- ${item.title} (x${item.quantity || 1})`).join("\n") +
          `\n\n*Total:* ₹${formattedPrice}\n\nWe'll update you when it ships! 🚚`;
        textSent = receiptText;
        await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text: receiptText }, orgId);
      }

      await repo.createMessage({
        sender: "system",
        text: `[Shopify] Order confirmed: "${textSent.slice(0, 80)}..."`,
        contactId: contact.id,
        organizationId: orgId,
      });

      await repo.createShopifySystemLog(
        orgId,
        `Shopify order #${shopifyOrderId} from ${name} (₹${formattedPrice}) — prepaid.`,
      );
    }

    return { success: true, message: "Order creation webhook processed." };
  }

  // ── C. ORDER FULFILLED / SHIPPED ──────────────────────────────────────────
  if (topic === "orders/fulfilled" || topic === "orders/updated") {
    const orderNumberStr = `SHPFY-${payload.id || Date.now()}`;
    const trackingCompany = payload.fulfillments?.[0]?.tracking_company || "DHL";
    const trackingNumber = payload.fulfillments?.[0]?.tracking_number || "TRACK1234567";
    const trackingUrl = `https://www.google.com/search?q=tracking+${trackingCompany}+${trackingNumber}`;

    const existingOrder = await repo.findOrderWithContact(orgId, orderNumberStr);

    if (existingOrder) {
      const contact = existingOrder.contact;
      await repo.markOrderShipped(existingOrder.id);

      const contactAttributes = (contact.attributes as Record<string, unknown>) || {};
      contactAttributes.last_tracking_carrier = trackingCompany;
      contactAttributes.last_tracking_number = trackingNumber;
      contactAttributes.last_tracking_url = trackingUrl;

      await repo.updateContactAttributes(contact.id, contactAttributes as Prisma.InputJsonValue);

      const lastActive = contact.lastActiveAt ? new Date(contact.lastActiveAt).getTime() : 0;
      const isSessionActive = Date.now() - lastActive <= 24 * 60 * 60 * 1000;
      const dbTemplate = await repo.findApprovedTemplate(orgId, "order_shipped");

      let sentSuccessfully = false;
      let textSent = "";

      if (dbTemplate || !isSessionActive) {
        const templateName = dbTemplate?.name || "order_shipped";
        textSent = `[Template: ${templateName}] Shipped Order ${orderNumberStr} via ${trackingCompany}`;
        const r = await sendWhatsAppMessage(
          {
            to: formatPhoneNumber(contact.phone),
            template: {
              name: templateName,
              language: { code: "en_US" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: contact.name },
                    { type: "text", text: orderNumberStr },
                    { type: "text", text: trackingCompany },
                    { type: "text", text: trackingUrl },
                  ],
                },
              ],
            },
          },
          orgId,
        );
        sentSuccessfully = r.ok;
      }

      if (!sentSuccessfully) {
        const shippingText =
          `📦 *Your Order has shipped!*\n\nHi ${contact.name}, your order ${orderNumberStr} has been handed over to *${trackingCompany}*.\n\n` +
          `🔢 *Tracking Number:* ${trackingNumber}\n🚚 *Track here:* ${trackingUrl}\n\nThank you for shopping with us! 😊`;
        textSent = shippingText;
        await sendWhatsAppMessage({ to: formatPhoneNumber(contact.phone), text: shippingText }, orgId);
      }

      await repo.createMessage({
        sender: "system",
        text: `[Shopify Automations] Order shipped notification: "${textSent.slice(0, 80)}..."`,
        contactId: contact.id,
        organizationId: orgId,
      });
    }

    await repo.createShopifySystemLog(
      orgId,
      `Shopify Webhook: orders/fulfilled - Order #${payload.order_number || payload.id} fulfilled via ${trackingCompany} (Tracking: ${trackingNumber}).`,
    );

    return { success: true, message: "Order fulfillment webhook processed." };
  }

  // ── D. INVENTORY RESTOCKED ────────────────────────────────────────────────
  if (topic === "inventory_levels/update") {
    const inventoryItemId = String(payload.inventory_item_id ?? "");
    const available = payload.available ?? 0;

    if (!inventoryItemId || available <= 0) {
      return { success: true, message: "Inventory not restocked, skipping." };
    }

    const { notifyStockWatchers } = await import("@/features/stock-alerts/services/stockAlertService");
    const { notified } = await notifyStockWatchers({ orgId, shopifyInventoryItemId: inventoryItemId });

    return { success: true, message: `Back-in-stock: notified ${notified} watcher(s).`, notified };
  }

  // ── E. APP UNINSTALLED ────────────────────────────────────────────────────
  if (topic === "app/uninstalled") {
    await repo.disconnectShopifyIntegration(orgId, shop);
    await repo.createShopifySystemLog(
      orgId,
      `Shopify app uninstalled from ${shop}. Integration marked disconnected.`,
    );
    return { success: true };
  }

  // ── F. GDPR — MANDATORY FOR APP STORE LISTING ────────────────────────────

  if (topic === "customers/data_request") {
    await repo.createShopifySystemLog(
      orgId,
      `GDPR customers/data_request received from ${shop}. Customer data request logged.`,
    );
    return { success: true };
  }

  if (topic === "customers/redact") {
    const redactPayload = payload as Record<string, unknown>;
    const customerId: string | undefined = (redactPayload.customer as Record<string, unknown> | undefined)?.id as string | undefined;
    const customerEmail: string | undefined = (redactPayload.customer as Record<string, unknown> | undefined)?.email as string | undefined;
    const customerPhone: string | undefined = (redactPayload.customer as Record<string, unknown> | undefined)?.phone as string | undefined;

    if (customerPhone || customerEmail) {
      const contact = await repo.findContactForRedact(orgId, customerPhone, customerEmail);
      if (contact) {
        await repo.anonymiseContact(contact.id);

        // Right-to-erasure: also purge all cross-merchant network signals for this phone
        if (customerPhone) {
          const phoneHash = createHash("sha256")
            .update(customerPhone.replace(/[^0-9]/g, ""))
            .digest("hex");
          await repo.deleteNetworkSignalsByPhoneHash(phoneHash);
        }
      }
    }

    await repo.createShopifySystemLog(
      orgId,
      `GDPR customers/redact received from ${shop}. Customer ${customerId ?? customerEmail ?? "unknown"} data anonymised.`,
    );
    return { success: true };
  }

  if (topic === "shop/redact") {
    await repo.createShopifySystemLog(
      orgId,
      `GDPR shop/redact received from ${shop}. All shop data deletion acknowledged.`,
    );
    return { success: true };
  }

  return { success: true, message: `Ignored unhandled webhook topic: ${topic}` };
}
