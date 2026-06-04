import { prisma } from "./prisma";
import { sendWhatsAppMessage, formatPhoneNumber } from "./whatsapp";
import { getRazorpayInstance } from "./razorpay";

const SHOP_NAME = "WappFlow Store";
const CURRENCY_SYMBOL = "₹";

function formatPrice(paise: number): string {
  return `${CURRENCY_SYMBOL}${(paise / 100).toFixed(2)}`;
}

export async function sendMainMenu(phone: string, _contactId: string, orgId: string) {
  const text = `🛍️ Welcome to *${SHOP_NAME}*!

What would you like to do?

1️⃣ *Browse Catalog* — See our products
2️⃣ *My Orders* — Check order status
3️⃣ *Help* — Get assistance

Reply with a number or just say what you need! 😊`;
  await sendWhatsAppMessage({
    to: formatPhoneNumber(phone),
    text,
    buttons: [
      { type: "reply", reply: { id: "catalog", title: "📦 Browse Catalog" } },
      { type: "reply", reply: { id: "orders", title: "📋 My Orders" } },
    ],
  }, orgId);
}

export async function sendCatalog(phone: string, orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { metaCatalogId: true },
  });

  if (!org?.metaCatalogId) {
    await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text: "Catalog is not configured. Please contact support! 😊" }, orgId);
    return;
  }

  const products = await prisma.product.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: { category: "asc" },
    take: 30, // Meta max 30 items
  });

  if (products.length === 0) {
    await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text: "Sorry, no products available right now. Please check back later! 😊" }, orgId);
    return;
  }

  const categoriesMap: Record<string, typeof products> = {};
  for (const p of products) {
    if (!categoriesMap[p.category]) categoriesMap[p.category] = [];
    if (categoriesMap[p.category].length < 10) {
      categoriesMap[p.category].push(p);
    }
  }

  // Meta max 10 sections
  const sections = Object.keys(categoriesMap).slice(0, 10).map((cat) => ({
    title: cat.substring(0, 24),
    productItems: categoriesMap[cat].map((p) => ({
      product_retailer_id: p.sku || p.id,
    })),
  }));

  await sendWhatsAppMessage({
    to: formatPhoneNumber(phone),
    catalogList: {
      headerText: SHOP_NAME,
      bodyText: "Browse our products and add them to your cart. Click the catalog button below!",
      catalogId: org.metaCatalogId,
      sections,
    }
  }, orgId);
}

export async function sendOrderStatus(phone: string, contactId: string, orgId: string) {
  const orders = await prisma.order.findMany({
    where: { contactId, organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  if (orders.length === 0) {
    await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text: "You haven't placed any orders yet. Browse our catalog! 😊" }, orgId);
    return;
  }
  let text = `📋 *Your Orders*\n\n`;
  orders.forEach((o) => {
    text += `*${o.orderId}* — ${formatPrice(o.total)}\n`;
    text += `Status: *${o.status.toUpperCase()}* | Payment: *${o.paymentStatus.toUpperCase()}*\n`;
    text += `Date: ${o.createdAt.toLocaleDateString()}\n\n`;
  });
  text += `Reply *ORDER <ID>* for details.\nE.g. *ORDER ${orders[0].orderId}*`;
  await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text }, orgId);
}

export async function sendSingleOrderStatus(phone: string, contactId: string, orderId: string, orgId: string) {
  const order = await prisma.order.findFirst({
    where: { orderId, contactId, organizationId: orgId },
    include: { items: true },
  });
  if (!order) {
    await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text: `Order *${orderId}* not found.` }, orgId);
    return;
  }
  let text = `📋 *Order ${order.orderId}*\n\n`;
  order.items.forEach((item) => {
    text += `• ${item.name} x${item.quantity} — ${formatPrice(item.price * item.quantity)}\n`;
  });
  text += `\n*Total:* ${formatPrice(order.total)}`;
  text += `\n*Status:* ${order.status.toUpperCase()}`;
  text += `\n*Payment:* ${order.paymentStatus.toUpperCase()}`;
  if (order.address && typeof order.address === "object" && "address" in order.address) {
    text += `\n*Address:* ${(order.address as { address: string }).address}`;
  }
  text += `\n*Date:* ${order.createdAt.toLocaleDateString()}`;
  await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text }, orgId);
}

export async function handleMarketplaceMessage(
  text: string,
  phone: string,
  contactId: string,
  orgId: string
): Promise<boolean> {
  const lower = text.trim().toLowerCase();

  if (lower === "1" || lower === "2" || lower === "3") {
    const map: Record<string, string> = { "1": "catalog", "2": "orders", "3": "menu" };
    const action = map[lower];
    if (action === "catalog") { await sendCatalog(phone, orgId); return true; }
    if (action === "orders") { await sendOrderStatus(phone, contactId, orgId); return true; }
    if (action === "menu") { await sendMainMenu(phone, contactId, orgId); return true; }
  }
  if (["menu", "hi", "hello", "start", "help"].includes(lower) || lower.includes("main menu")) {
    await sendMainMenu(phone, contactId, orgId);
    return true;
  }
  if (["catalog", "products", "shop", "browse"].includes(lower) || lower.includes("browse")) {
    await sendCatalog(phone, orgId);
    return true;
  }
  if (["orders", "my orders"].includes(lower)) {
    await sendOrderStatus(phone, contactId, orgId);
    return true;
  }
  if (lower.startsWith("order ")) {
    const orderId = lower.replace("order ", "").trim().toUpperCase();
    if (orderId.startsWith("ORD-")) {
      await sendSingleOrderStatus(phone, contactId, orderId, orgId);
      return true;
    }
  }
  if (lower === "confirm_order" || lower === "confirm" || lower.includes("paid")) {
    const latestOrder = await prisma.order.findFirst({
      where: { contactId, organizationId: orgId },
      orderBy: { createdAt: "desc" }
    });

    if (!latestOrder) {
      await sendWhatsAppMessage({
        to: formatPhoneNumber(phone),
        text: "You don't have any pending orders. Reply *CATALOG* to browse products.",
      }, orgId);
      return true;
    }

    if (latestOrder.paymentStatus === "paid") {
      await sendWhatsAppMessage({
        to: formatPhoneNumber(phone),
        text: `✅ Payment verified! Your order *${latestOrder.orderId}* is confirmed.\n\nReply *ORDERS* to check status anytime.`,
      }, orgId);
    } else {
      let linkStr = "";
      if (latestOrder.razorpayOrderId && latestOrder.razorpayOrderId.startsWith("plink_")) {
        try {
          const rzp = getRazorpayInstance();
          if (rzp) {
            const plink = await (rzp.paymentLink as unknown as Record<string, (id: string) => Promise<{ short_url?: string }>>).fetch(latestOrder.razorpayOrderId);
            if (plink && plink.short_url) {
              linkStr = `\n\n💳 *Pay here:* ${plink.short_url}`;
            }
          }
        } catch (err) {
          console.error("Failed to fetch payment link for confirmation", err);
        }
      }

      await sendWhatsAppMessage({
        to: formatPhoneNumber(phone),
        text: `⚠️ Your payment for order *${latestOrder.orderId}* has not been cleared yet.${linkStr}\n\nOnce paid, please reply *CONFIRM* again.`,
        buttons: linkStr ? [{ type: "reply", reply: { id: "confirm_order", title: "✅ Paid" } }] : undefined
      }, orgId);
    }
    return true;
  }
  return false;
}
