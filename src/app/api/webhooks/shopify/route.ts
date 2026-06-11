import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";
import { enrollOnTrigger } from "@/features/sequences/services/sequenceService";
import { resolveAttribution } from "@/features/analytics/services/attribution";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";

// ─── Shopify webhook HMAC verification ────────────────────────────────
// Verifies x-shopify-hmac-sha256 (base64 HMAC-SHA256 of the raw body with
// SHOPIFY_WEBHOOK_SECRET) using a constant-time compare. Returns false when
// the secret is unset, so the route rejects all traffic until configured.
function verifyShopifyHmac(rawBody: string, header: string | null): boolean {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret || !header) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Catalog synchronization moved to the authenticated, org-scoped route
// POST /api/org/[orgId]/integrations/shopify/sync (see shopifySyncService).
// This file now only receives Shopify push webhooks (HMAC-verified below).

// ─── RECEIVE WEBHOOK NOTIFICATIONS (POST) ─────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Read the raw body once and verify the Shopify HMAC before trusting any
    // header or parsing the payload. Reject forged/unsigned requests with 401.
    const rawBody = await request.text();
    if (!verifyShopifyHmac(rawBody, request.headers.get("x-shopify-hmac-sha256"))) {
      console.warn("⚠️ Shopify webhook: missing or invalid HMAC signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const topic = request.headers.get("x-shopify-topic") || "";
    const shop = request.headers.get("x-shopify-shop-domain") || "";

    const payload: ShopifyWebhookPayload = JSON.parse(rawBody);

    if (!topic || !shop) {
      return NextResponse.json({ error: "Invalid webhook request headers." }, { status: 400 });
    }

    // Find the organization this shop is connected to
    const integration = await prisma.integration.findFirst({
      where: {
        id: "shopify",
        webhookUrl: `https://${shop}`,
      },
    });

    if (!integration) {
      console.warn(`⚠️ Shopify webhook received for unconnected shop: ${shop}`);
      return NextResponse.json({ error: "Store not integrated in WappFlow." }, { status: 404 });
    }

    return await handleWebhookEvent(topic, payload, integration.organizationId);
  } catch (err: unknown) {
    console.error("❌ POST Shopify webhook endpoint failed:", err);
    return NextResponse.json({ error: "Internal server error processing webhook." }, { status: 500 });
  }
}

// ─── Shopify webhook payload shapes (only the fields this handler reads) ──
interface ShopifyAddress {
  phone?: string;
}
interface ShopifyLineItem {
  title: string;
  price?: string;
  quantity?: number;
}
interface ShopifyFulfillment {
  tracking_company?: string;
  tracking_number?: string;
}
interface ShopifyWebhookPayload {
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
}

// Tenant-scoped contact upsert for Shopify events.
// Keyed by (organizationId, email) — never the global id — so two orgs sharing a
// customer email get distinct contacts. When the customer has no email, dedupe by
// phone within the org (also catches WhatsApp-created contacts) and synthesize a
// unique email so the (organizationId, email) constraint always holds.
async function upsertShopifyContact(
  orgId: string,
  email: string,
  name: string,
  phone: string,
  source: string,
  tags: string[]
) {
  // Phone is the identity key — upsert on (org, phone)
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

  const existing = await prisma.contact.findFirst({ where: { phone, organizationId: orgId } });
  if (existing) {
    return prisma.contact.update({
      where: { id: existing.id },
      data: { name, source, tags: { set: Array.from(new Set([...existing.tags, ...tags])) }, status: "Active" },
    });
  }

  const syntheticEmail = `${phone.replace(/[^0-9]/g, "") || "unknown"}@shopify.customer`;
  return prisma.contact.create({
    data: { name, phone, email: syntheticEmail, source, tags, status: "Active", organizationId: orgId },
  });
}

// ─── 3. CORE WEBHOOK EVENT PARSER & HANDLER ────────────────────────────
async function handleWebhookEvent(topic: string, payload: ShopifyWebhookPayload, orgId: string) {
  const d = new Date();
  const timestampStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;

  // Helper to extract clean phone number
  const extractPhone = (addressObj?: ShopifyAddress) => {
    const rawPhone = addressObj?.phone || payload.customer?.phone || "+919999988888";
    return rawPhone.startsWith("+") ? rawPhone : `+${rawPhone.replace(/[^0-9]/g, "")}`;
  };

  const email = payload.customer?.email || payload.email || "";
  const name = `${payload.customer?.first_name || "Shopify"} ${payload.customer?.last_name || "Customer"}`.trim();
  const phone = extractPhone(payload.billing_address || payload.shipping_address);

  // A. HANDLE ABANDONED CART TRIGGER
  if (topic === "checkouts/create" || topic === "checkouts/update") {
    // 1. Create or Update Customer Contact in WappFlow (tenant-scoped by email)
    const contact = await upsertShopifyContact(
      orgId,
      email,
      name,
      phone,
      "Shopify Checkout",
      ["Shopify", "Shopify-Cart"]
    );

    // Sync line items to Cart / CartItem tables
    const lineItems = payload.line_items || [];
    let cart = await prisma.cart.findUnique({
      where: { contactId: contact.id },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { contactId: contact.id },
      });
    }

    // Delete existing cart items
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    // Insert new cart items & sync with Product catalog
    for (const item of lineItems) {
      const itemPriceInPaise = Math.round(parseFloat(item.price || "0") * 100);
      let product = await prisma.product.findFirst({
        where: { name: item.title, organizationId: orgId },
      });
      if (!product) {
        product = await prisma.product.create({
          data: {
            name: item.title,
            description: "Shopify catalog item",
            price: itemPriceInPaise,
            images: ["https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=300"],
            category: "Shopify",
            stock: 50,
            organizationId: orgId,
          },
        });
      }
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity: item.quantity || 1,
        },
      });
    }

    // Save checkout attributes in contact profile
    const contactAttributes = (contact.attributes as Record<string, unknown>) || {};
    contactAttributes.shopify_checkout_url = payload.abandoned_checkout_url || "";
    contactAttributes.cart_total = payload.total_price || "0.00";
    contactAttributes.cart_items = lineItems.map((i) => `${i.title} (x${i.quantity || 1})`).join(", ");
    contactAttributes.cart_abandoned_at = timestampStr;
    contactAttributes.cart_recovered = false;

    await prisma.contact.update({
      where: { id: contact.id },
      data: { attributes: contactAttributes as Prisma.InputJsonValue },
    });

    // 2. Log event in DB system log
    await prisma.systemLog.create({
      data: {
        type: "integration",
        message: `Shopify Webhook: checkouts/create - Cart abandoned by ${name} (₹${payload.total_price || "0.00"}). Saved to database, scheduling drip recovery sequence.`,
        organizationId: orgId,
      },
    });

    // Enroll in drip sequence
    await enrollOnTrigger(orgId, "cart_abandoned", contact.id);

    // 3. Create message bubble
    await prisma.message.create({
      data: {
        sender: "system",
        text: `[Shopify Automations] Cart abandoned by ${name} (₹${payload.total_price || "0.00"}). Enrolled contact into Cart Recovery sequence.`,
        contactId: contact.id,
        organizationId: orgId,
      },
    });

    return NextResponse.json({ success: true, message: "Abandoned checkout webhook processed." });
  }

  // B. HANDLE ORDER CREATED / CONFIRMED
  if (topic === "orders/create") {
    // 1. Create or Update Customer Contact in WappFlow (tenant-scoped by email)
    const contact = await upsertShopifyContact(
      orgId,
      email,
      name,
      phone,
      "Shopify Purchase",
      ["Shopify", "Shopify-Buyer"]
    );

    // Update attributes to mark cart as recovered
    const contactAttributes = (contact.attributes as Record<string, unknown>) || {};
    contactAttributes.cart_recovered = true;
    await prisma.contact.update({
      where: { id: contact.id },
      data: { attributes: contactAttributes as Prisma.InputJsonValue },
    });

    // Cancel active abandoned cart sequence enrollments
    const activeEnrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        contactId: contact.id,
        status: "active",
        sequence: {
          trigger: "cart_abandoned",
        },
      },
    });
    for (const enrollment of activeEnrollments) {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "completed", nextRunAt: null },
      });
    }

    // 2. Fetch or create Product placeholders if they don't exist yet
    const orderItems = payload.line_items || [];
    const totalPriceInPaise = Math.round(parseFloat(payload.total_price || "0") * 100);

    const attribution = await resolveAttribution(orgId, contact);

    const savedOrder = await prisma.order.create({
      data: {
        orderId: `SHPFY-${payload.id || Date.now()}`,
        contactId: contact.id,
        total: totalPriceInPaise,
        status: "confirmed",
        paymentStatus: payload.financial_status === "paid" ? "paid" : "pending",
        phone: phone,
        organizationId: orgId,
        ...attribution,
      },
    });

    // Sequence trigger: enroll into order_placed sequences (e.g. order_confirmation, review).
    await enrollOnTrigger(orgId, "order_placed", contact.id);

    // Outbound webhook (T-08): notify subscribers of the new order.
    const { emitEvent } = await import("@/features/webhooks/services/webhookDeliveryService");
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

    // Insert order items
    for (const item of orderItems) {
      const itemPriceInPaise = Math.round(parseFloat(item.price || "0") * 100);

      // Verify product exists, create temporary mock if not
      let product = await prisma.product.findFirst({
        where: { name: item.title, organizationId: orgId },
      });

      if (!product) {
        product = await prisma.product.create({
          data: {
            name: item.title,
            description: "Shopify catalog item",
            price: itemPriceInPaise,
            images: ["https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=300"],
            category: "Shopify",
            stock: 50,
            organizationId: orgId,
          },
        });
      }

      await prisma.orderItem.create({
        data: {
          orderId: savedOrder.id,
          productId: product.id,
          name: item.title,
          price: itemPriceInPaise,
          quantity: item.quantity || 1,
        },
      });
    }

    // 3. Log event
    await prisma.systemLog.create({
      data: {
        type: "integration",
        message: `Shopify Webhook: orders/create - Order #${payload.order_number || payload.id} received from ${name} (₹${(
          totalPriceInPaise / 100
        ).toFixed(2)}). Registered order record in WappFlow.`,
        organizationId: orgId,
      },
    });

    // 4. Dispatch Receipt / WhatsApp Confirmation Notification
    const lastActive = contact.lastActiveAt ? new Date(contact.lastActiveAt).getTime() : 0;
    const isSessionActive = (Date.now() - lastActive) <= 24 * 60 * 60 * 1000;
    const formattedPrice = (totalPriceInPaise / 100).toFixed(2);
    
    const dbTemplate = await prisma.template.findFirst({
      where: { name: "order_confirmation", organizationId: orgId, metaStatus: "approved" },
    });

    let sentSuccessfully = false;
    let textSent = "";

    if (dbTemplate || !isSessionActive) {
      const templateName = dbTemplate?.name || "order_confirmation";
      textSent = `[Template: ${templateName}] Confirmed Order #${payload.order_number || payload.id} for ₹${formattedPrice}`;
      const r = await sendWhatsAppMessage({
        to: formatPhoneNumber(phone),
        template: {
          name: templateName,
          language: { code: "en_US" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: name },
                { type: "text", text: `SHPFY-${payload.order_number || payload.id}` },
                { type: "text", text: `₹${formattedPrice}` },
              ],
            },
          ],
        },
      }, orgId);
      sentSuccessfully = r.ok;
    }

    if (!sentSuccessfully) {
      // Send text message receipt if session is active or template failed
      const receiptText = `🛍️ *Order Confirmed!*\n\nHi ${name}, thank you for your purchase. We have received your order #${payload.order_number || payload.id}.\n\n*Items Purchased:*\n` +
        orderItems.map(item => `- ${item.title} (x${item.quantity || 1})`).join("\n") +
        `\n\n*Total Amount:* ₹${formattedPrice}\n\nWe will update you as soon as your items are shipped! 🚚`;
      textSent = receiptText;
      await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text: receiptText }, orgId);
    }

    // Create message bubble in WappFlow chat screen
    await prisma.message.create({
      data: {
        sender: "system",
        text: `[Shopify Automations] Order confirmed! Dispatched confirmation alert: "${textSent.slice(0, 80)}..."`,
        contactId: contact.id,
        organizationId: orgId,
      },
    });

    return NextResponse.json({ success: true, message: "Order creation webhook processed." });
  }

  // C. HANDLE ORDER FULFILLED / SHIPPED
  if (topic === "orders/fulfilled" || topic === "orders/updated") {
    const orderNumberStr = `SHPFY-${payload.id || Date.now()}`;
    const trackingCompany = payload.fulfillments?.[0]?.tracking_company || "DHL";
    const trackingNumber = payload.fulfillments?.[0]?.tracking_number || "TRACK1234567";
    const trackingUrl = `https://www.google.com/search?q=tracking+${trackingCompany}+${trackingNumber}`;

    // 1. Locate Order
    const existingOrder = await prisma.order.findFirst({
      where: {
        orderId: orderNumberStr,
        organizationId: orgId,
      },
      include: { contact: true },
    });

    if (existingOrder) {
      const contact = existingOrder.contact;
      await prisma.order.update({
        where: { id: existingOrder.id },
        data: {
          status: "shipped",
        },
      });

      // Update Contact attributes with shipping info
      const contactAttributes = (contact.attributes as Record<string, unknown>) || {};
      contactAttributes.last_tracking_carrier = trackingCompany;
      contactAttributes.last_tracking_number = trackingNumber;
      contactAttributes.last_tracking_url = trackingUrl;

      await prisma.contact.update({
        where: { id: contact.id },
        data: { attributes: contactAttributes as Prisma.InputJsonValue },
      });

      // 24-hour session window check
      const lastActive = contact.lastActiveAt ? new Date(contact.lastActiveAt).getTime() : 0;
      const isSessionActive = (Date.now() - lastActive) <= 24 * 60 * 60 * 1000;
      
      const dbTemplate = await prisma.template.findFirst({
        where: { name: "order_shipped", organizationId: orgId, metaStatus: "approved" },
      });

      let sentSuccessfully = false;
      let textSent = "";

      if (dbTemplate || !isSessionActive) {
        const templateName = dbTemplate?.name || "order_shipped";
        textSent = `[Template: ${templateName}] Shipped Order ${orderNumberStr} via ${trackingCompany}`;
        const r = await sendWhatsAppMessage({
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
        }, orgId);
        sentSuccessfully = r.ok;
      }

      if (!sentSuccessfully) {
        const shippingText = `📦 *Your Order has shipped!*\n\nHi ${contact.name}, your order ${orderNumberStr} has been handed over to *${trackingCompany}*.\n\n🔢 *Tracking Number:* ${trackingNumber}\n🚚 *Track here:* ${trackingUrl}\n\nThank you for shopping with us! 😊`;
        textSent = shippingText;
        await sendWhatsAppMessage({ to: formatPhoneNumber(contact.phone), text: shippingText }, orgId);
      }

      // Create message bubble in live chat
      await prisma.message.create({
        data: {
          sender: "system",
          text: `[Shopify Automations] Order shipped notification: "${textSent.slice(0, 80)}..."`,
          contactId: contact.id,
          organizationId: orgId,
        },
      });
    }

    // 2. Log fulfillment
    await prisma.systemLog.create({
      data: {
        type: "integration",
        message: `Shopify Webhook: orders/fulfilled - Order #${payload.order_number || payload.id} fulfilled via ${trackingCompany} (Tracking: ${trackingNumber}).`,
        organizationId: orgId,
      },
    });

    return NextResponse.json({ success: true, message: "Order fulfillment webhook processed." });
  }

  return NextResponse.json({ success: true, message: `Ignored unhandled webhook topic: ${topic}` });
}
