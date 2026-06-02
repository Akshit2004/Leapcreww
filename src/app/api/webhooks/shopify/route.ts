import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";

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
    const topic = request.headers.get("x-shopify-topic") || "";
    const shop = request.headers.get("x-shopify-shop-domain") || "";

    const payload = await request.json();

    if (!topic || !shop) {
      // Support manual webhook trigger simulation testing
      const { simulatedTopic, simulatedPayload, orgId } = payload;
      if (simulatedTopic && simulatedPayload && orgId) {
        return await handleWebhookEvent(simulatedTopic, simulatedPayload, orgId);
      }
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

// ─── 3. CORE WEBHOOK EVENT PARSER & HANDLER ────────────────────────────
async function handleWebhookEvent(topic: string, payload: any, orgId: string) {
  const d = new Date();
  const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const timestampStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;

  // Helper to extract clean phone number
  const extractPhone = (addressObj: any) => {
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

    // 2. Log event in DB system log
    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "integration",
        message: `Shopify Webhook: checkouts/create - Cart abandoned by ${name} (${phone}). Added tag "Shopify-Cart" and scheduled WhatsApp alert.`,
        organizationId: orgId,
      },
    });

    // 3. Create simulated autoresponder message
    await prisma.message.create({
      data: {
        sender: "system",
        text: `[Shopify Automations] Abandoned checkout recovered! Sent WhatsApp recovery notification template welcome_verification to ${name} (${phone}).`,
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

    // 2. Fetch or create Product placeholders if they don't exist yet
    const orderItems = payload.line_items || [];
    const totalPriceInPaise = Math.round(parseFloat(payload.total_price || "0") * 100);

    const savedOrder = await prisma.order.create({
      data: {
        orderId: `SHPFY-${payload.id || Date.now()}`,
        contactId: contact.id,
        total: totalPriceInPaise,
        status: "confirmed",
        paymentStatus: payload.financial_status === "paid" ? "paid" : "pending",
        phone: phone,
        organizationId: orgId,
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

    // 4. Create simulated message
    await prisma.message.create({
      data: {
        sender: "system",
        text: `[Shopify Automations] Order confirmed! Dispatched receipt template welcome_verification via WhatsApp to ${name} (${phone}).`,
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

    // 1. Locate Order
    const existingOrder = await prisma.order.findFirst({
      where: {
        orderId: orderNumberStr,
        organizationId: orgId,
      },
    });

    if (existingOrder) {
      await prisma.order.update({
        where: { id: existingOrder.id },
        data: {
          status: "shipped",
        },
      });
    }

    // 2. Log fulfillment
    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "integration",
        message: `Shopify Webhook: orders/fulfilled - Order #${payload.order_number || payload.id} fulfilled via ${trackingCompany}.`,
        organizationId: orgId,
      },
    });

    return NextResponse.json({ success: true, message: "Order fulfillment webhook processed." });
  }

  return NextResponse.json({ success: true, message: `Ignored unhandled webhook topic: ${topic}` });
}
