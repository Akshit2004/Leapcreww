import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/shared/lib/prisma";
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

// ─── 1. HANDLE CATALOG SYNCHRONIZATION (GET) ──────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId")?.trim();
    const action = searchParams.get("action")?.trim();

    if (!orgId) {
      return NextResponse.json({ error: "orgId parameter is required." }, { status: 400 });
    }

    if (action !== "sync") {
      return NextResponse.json({ error: "Invalid action. Supported: action=sync" }, { status: 400 });
    }

    // A. Fetch Shopify Credentials from DB
    const integration = await prisma.integration.findUnique({
      where: {
        id_organizationId: {
          id: "shopify",
          organizationId: orgId,
        },
      },
    });

    if (!integration || !integration.apiKey || integration.status !== "connected") {
      return NextResponse.json(
        { error: "Shopify is not connected for this organization. Please connect it first." },
        { status: 400 }
      );
    }

    const { shopDomain, accessToken } = JSON.parse(integration.apiKey);
    if (!shopDomain || !accessToken) {
      return NextResponse.json({ error: "Invalid Shopify credentials in database." }, { status: 400 });
    }

    // B. Fetch Products from Shopify API
    const shopifyProductsUrl = `https://${shopDomain}/admin/api/2024-04/products.json?limit=50`;
    const response = await fetch(shopifyProductsUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("❌ Shopify product fetch failed:", err);
      return NextResponse.json(
        { error: "Failed to fetch products from Shopify API.", details: err },
        { status: 400 }
      );
    }

    const data = await response.json();
    const shopifyProducts = data.products || [];

    // C. Map & Upsert Products into WappFlow Database
    let syncedCount = 0;

    for (const sp of shopifyProducts) {
      // Get price (Shopify variants have individual prices, we use the first variant's price)
      const firstVariant = sp.variants?.[0];
      const rawPrice = parseFloat(firstVariant?.price || "0");
      const priceInPaise = Math.round(rawPrice * 100); // WappFlow stores prices in Paise (₹1 = 100 Paise)

      // Calculate total stock across all variants
      const totalStock = sp.variants?.reduce(
        (sum: number, variant: { inventory_quantity?: number }) =>
          sum + (variant.inventory_quantity || 0),
        0
      ) || 10; // Default to 10 if inventory tracking is disabled

      // Extract image source URLs
      const images = sp.images?.map((img: { src: string }) => img.src) || [];
      if (images.length === 0 && sp.image?.src) {
        images.push(sp.image.src);
      }
      // Provide a nice fallback mock image if no images are present
      if (images.length === 0) {
        images.push("https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=300&auto=format&fit=crop");
      }

      const productPayload = {
        name: sp.title || "Shopify Product",
        description: sp.body_html?.replace(/<[^>]*>/g, "") || "Imported Shopify product",
        price: priceInPaise,
        images,
        category: sp.product_type || "Shopify",
        stock: totalStock,
        isActive: true,
      };

      // We use product ID from Shopify as a custom reference or just query by name
      const existingProduct = await prisma.product.findFirst({
        where: {
          name: sp.title,
          organizationId: orgId,
        },
      });

      if (existingProduct) {
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: productPayload,
        });
      } else {
        await prisma.product.create({
          data: {
            ...productPayload,
            organizationId: orgId,
          },
        });
      }

      syncedCount++;
    }

    // Save System Log
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "integration",
        message: `Catalog Sync Success: Imported and updated ${syncedCount} products from Shopify.`,
        organizationId: orgId,
      },
    });

    return NextResponse.json({ success: true, synced: syncedCount });
  } catch (err: unknown) {
    console.error("❌ GET Shopify sync endpoint failed:", err);
    return NextResponse.json({ error: "Internal server error during catalog sync." }, { status: 500 });
  }
}

// ─── 2. RECEIVE WEBHOOK NOTIFICATIONS (POST) ──────────────────────────
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

// ─── 3. CORE WEBHOOK EVENT PARSER & HANDLER ────────────────────────────
async function handleWebhookEvent(topic: string, payload: ShopifyWebhookPayload, orgId: string) {
  const d = new Date();
  const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const timestampStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;

  // Helper to extract clean phone number
  const extractPhone = (addressObj?: ShopifyAddress) => {
    const rawPhone = addressObj?.phone || payload.customer?.phone || "+919999988888";
    return rawPhone.startsWith("+") ? rawPhone : `+${rawPhone.replace(/[^0-9]/g, "")}`;
  };

  const email = payload.customer?.email || payload.email || "shopify@test.wappflow.com";
  const name = `${payload.customer?.first_name || "Shopify"} ${payload.customer?.last_name || "Customer"}`.trim();
  const phone = extractPhone(payload.billing_address || payload.shipping_address);

  // A. HANDLE ABANDONED CART TRIGGER
  if (topic === "checkouts/create" || topic === "checkouts/update") {
    // 1. Create or Update Customer Contact in WappFlow
    const contact = await prisma.contact.upsert({
      where: { id: email }, // Standard email identifier
      update: {
        name,
        phone,
        source: "Shopify Checkout",
        tags: { set: ["Shopify", "Shopify-Cart"] },
        status: "Active",
      },
      create: {
        id: email,
        name,
        phone,
        email,
        source: "Shopify Checkout",
        tags: ["Shopify", "Shopify-Cart"],
        status: "Active",
        organizationId: orgId,
      },
    });

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
    const contactAttributes = (contact.attributes as Record<string, any>) || {};
    contactAttributes.shopify_checkout_url = payload.abandoned_checkout_url || "";
    contactAttributes.cart_total = payload.total_price || "0.00";
    contactAttributes.cart_items = lineItems.map((i) => `${i.title} (x${i.quantity || 1})`).join(", ");
    contactAttributes.cart_abandoned_at = timestampStr;
    contactAttributes.cart_recovered = false;

    await prisma.contact.update({
      where: { id: contact.id },
      data: { attributes: contactAttributes },
    });

    // 2. Log event in DB system log
    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
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
        timestamp: timestampStr,
        contactId: contact.id,
        organizationId: orgId,
      },
    });

    return NextResponse.json({ success: true, message: "Abandoned checkout webhook processed." });
  }

  // B. HANDLE ORDER CREATED / CONFIRMED
  if (topic === "orders/create") {
    // 1. Create or Update Customer Contact in WappFlow
    const contact = await prisma.contact.upsert({
      where: { id: email },
      update: {
        name,
        phone,
        source: "Shopify Purchase",
        tags: { set: ["Shopify", "Shopify-Buyer"] },
        status: "Active",
      },
      create: {
        id: email,
        name,
        phone,
        email,
        source: "Shopify Purchase",
        tags: ["Shopify", "Shopify-Buyer"],
        status: "Active",
        organizationId: orgId,
      },
    });

    // Update attributes to mark cart as recovered
    const contactAttributes = (contact.attributes as Record<string, any>) || {};
    contactAttributes.cart_recovered = true;
    await prisma.contact.update({
      where: { id: contact.id },
      data: { attributes: contactAttributes },
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
        timestamp: timeStr,
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
        timestamp: timestampStr,
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
      const contactAttributes = (contact.attributes as Record<string, any>) || {};
      contactAttributes.last_tracking_carrier = trackingCompany;
      contactAttributes.last_tracking_number = trackingNumber;
      contactAttributes.last_tracking_url = trackingUrl;

      await prisma.contact.update({
        where: { id: contact.id },
        data: { attributes: contactAttributes },
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
          timestamp: timestampStr,
          contactId: contact.id,
          organizationId: orgId,
        },
      });
    }

    // 2. Log fulfillment
    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "integration",
        message: `Shopify Webhook: orders/fulfilled - Order #${payload.order_number || payload.id} fulfilled via ${trackingCompany} (Tracking: ${trackingNumber}).`,
        organizationId: orgId,
      },
    });

    return NextResponse.json({ success: true, message: "Order fulfillment webhook processed." });
  }

  return NextResponse.json({ success: true, message: `Ignored unhandled webhook topic: ${topic}` });
}
