import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";

function logTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function getShopifyCredentials(orgId: string) {
  const integration = await prisma.integration.findUnique({
    where: { id_organizationId: { id: "shopify", organizationId: orgId } },
  });
  if (!integration?.apiKey) return null;
  try {
    return JSON.parse(integration.apiKey) as { shopDomain: string; accessToken: string; shopName: string };
  } catch {
    return null;
  }
}

async function upsertShopifyContact(
  orgId: string,
  phone: string,
  name: string,
  tag: string,
  source: string
) {
  const existing = await prisma.contact.findFirst({ where: { phone, organizationId: orgId } });
  if (existing) {
    const tags = Array.from(new Set([...existing.tags, tag]));
    return prisma.contact.update({ where: { id: existing.id }, data: { tags, lastMessageTime: new Date().toISOString() } });
  }
  return prisma.contact.create({
    data: {
      name,
      phone,
      email: "",
      source,
      tags: [tag],
      status: "Active",
      organizationId: orgId,
    },
  });
}

// POST — receive Shopify webhook events
export async function POST(req: NextRequest) {
  const topic = req.headers.get("x-shopify-topic") || "";
  const orgId = req.nextUrl.searchParams.get("orgId");

  if (!orgId) {
    // Try to match org by shopify domain header
    const shopDomain = req.headers.get("x-shopify-shop-domain");
    if (!shopDomain) return NextResponse.json({ ok: true }); // Silently accept
    // Find org by stored credentials
    const integrations = await prisma.integration.findMany({ where: { id: "shopify", status: "connected" } });
    for (const intg of integrations) {
      try {
        const creds = JSON.parse(intg.apiKey || "{}");
        if (creds.shopDomain === shopDomain) {
          return handleWebhook(req, topic, intg.organizationId);
        }
      } catch {}
    }
    return NextResponse.json({ ok: true });
  }

  return handleWebhook(req, topic, orgId);
}

async function handleWebhook(req: NextRequest, topic: string, orgId: string) {
  const payload = await req.json();

  if (topic === "checkouts/create") {
    const { customer, line_items } = payload;
    const phone = customer?.phone || "";
    const name = `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() || "Shopify Customer";
    if (phone) await upsertShopifyContact(orgId, phone, name, "Shopify", "Shopify Cart");

    await prisma.systemLog.create({
      data: {
        timestamp: logTime(),
        type: "integration",
        message: `Shopify abandoned cart: ${name} (${phone}) — ${line_items?.length || 0} item(s).`,
        organizationId: orgId,
      },
    });
  }

  if (topic === "orders/create") {
    const { customer, total_price, order_number } = payload;
    const phone = customer?.phone || "";
    const name = `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() || "Shopify Customer";
    if (phone) await upsertShopifyContact(orgId, phone, name, "Shopify-Buyer", "Shopify Order");

    // Create WappFlow order record
    const totalPaise = Math.round(parseFloat(total_price || "0") * 100);
    let contact = await prisma.contact.findFirst({ where: { phone, organizationId: orgId } });
    if (!contact && phone) {
      contact = await prisma.contact.create({
        data: {
          name,
          phone,
          email: customer?.email || "",
          source: "Shopify Order",
          tags: ["Shopify-Buyer"],
          status: "Active",
          organizationId: orgId,
        },
      });
    }

    if (contact) {
      await prisma.order.upsert({
        where: { orderId: `shopify-${order_number}` },
        update: { status: "confirmed", paymentStatus: "paid" },
        create: {
          orderId: `shopify-${order_number}`,
          contactId: contact.id,
          total: totalPaise,
          status: "confirmed",
          paymentStatus: "paid",
          phone,
          organizationId: orgId,
        },
      });
    }

    await prisma.systemLog.create({
      data: {
        timestamp: logTime(),
        type: "integration",
        message: `Shopify order #${order_number} confirmed: ${name} — ₹${(totalPaise / 100).toFixed(2)}.`,
        organizationId: orgId,
      },
    });
  }

  if (topic === "orders/fulfilled") {
    const { order_number } = payload;
    await prisma.order.updateMany({
      where: { orderId: `shopify-${order_number}` },
      data: { status: "shipped" },
    });
    await prisma.systemLog.create({
      data: {
        timestamp: logTime(),
        type: "integration",
        message: `Shopify order #${order_number} fulfilled — status updated to shipped.`,
        organizationId: orgId,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

// GET ?action=sync&orgId=... — pull catalog from Shopify and upsert products
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const orgId = searchParams.get("orgId");
  const action = searchParams.get("action");

  if (!orgId || action !== "sync") {
    return NextResponse.json({ error: "orgId and action=sync required" }, { status: 400 });
  }

  const creds = await getShopifyCredentials(orgId);
  if (!creds) {
    return NextResponse.json({ error: "Shopify not connected for this org" }, { status: 400 });
  }

  const productsRes = await fetch(
    `https://${creds.shopDomain}/admin/api/2024-04/products.json?limit=250`,
    { headers: { "X-Shopify-Access-Token": creds.accessToken } }
  );

  if (!productsRes.ok) {
    return NextResponse.json({ error: "Failed to fetch products from Shopify" }, { status: 502 });
  }

  const { products: shopifyProducts } = await productsRes.json();

  let synced = 0;
  for (const sp of shopifyProducts) {
    const variant = sp.variants?.[0];
    const priceStr = variant?.price || "0";
    const pricePaise = Math.round(parseFloat(priceStr) * 100);
    const stock = variant?.inventory_quantity ?? 0;
    const images = (sp.images || []).map((img: { src: string }) => img.src);
    const category = sp.product_type || sp.vendor || "Shopify";

    await prisma.product.upsert({
      where: { id: `shopify-${sp.id}` },
      update: {
        name: sp.title,
        description: sp.body_html?.replace(/<[^>]*>/g, "") || "",
        price: pricePaise,
        images,
        category,
        stock: Math.max(0, stock),
        isActive: sp.status === "active",
      },
      create: {
        id: `shopify-${sp.id}`,
        name: sp.title,
        description: sp.body_html?.replace(/<[^>]*>/g, "") || "",
        price: pricePaise,
        images,
        category,
        stock: Math.max(0, stock),
        isActive: sp.status === "active",
        organizationId: orgId,
      },
    });
    synced++;
  }

  await prisma.systemLog.create({
    data: {
      timestamp: logTime(),
      type: "integration",
      message: `Shopify catalog sync complete — ${synced} product(s) imported from ${creds.shopDomain}.`,
      organizationId: orgId,
    },
  });

  return NextResponse.json({ synced, total: shopifyProducts.length });
}
