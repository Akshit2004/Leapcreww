import { prisma } from "./prisma";
import { sendWhatsAppMessage, formatPhoneNumber } from "./whatsapp";
import { createRazorpayPaymentLink, getRazorpayInstance } from "./razorpay";

const SHOP_NAME = "WappFlow Store";
const CURRENCY_SYMBOL = "₹";

function formatPrice(paise: number): string {
  return `${CURRENCY_SYMBOL}${(paise / 100).toFixed(2)}`;
}

function generateOrderId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "ORD-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function sendMainMenu(phone: string, _contactId: string, orgId: string) {
  const text = `🛍️ Welcome to *${SHOP_NAME}*!

What would you like to do?

1️⃣ *Browse Catalog* — See our products
2️⃣ *My Cart* — View items in your cart
3️⃣ *My Orders* — Check order status
4️⃣ *Help* — Get assistance

Reply with a number or just say what you need! 😊`;
  await sendWhatsAppMessage({
    to: formatPhoneNumber(phone),
    text,
    buttons: [
      { type: "reply", reply: { id: "catalog", title: "📦 Browse Catalog" } },
      { type: "reply", reply: { id: "cart", title: "🛒 My Cart" } },
      { type: "reply", reply: { id: "orders", title: "📋 My Orders" } },
    ],
  }, orgId);
}

export async function sendCatalogCategories(phone: string, orgId: string) {
  const products = await prisma.product.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { category: true },
    distinct: ["category"],
  });
  const categories = [...new Set(products.map((p) => p.category))];
  if (categories.length === 0) {
    await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text: "Sorry, no products available right now. Please check back later! 😊" }, orgId);
    return;
  }
  const buttons = categories.slice(0, 3).map((cat) => ({
    type: "reply" as const,
    reply: { id: `cat_${cat}`, title: cat.length > 20 ? cat.slice(0, 18) + "…" : cat },
  }));
  await sendWhatsAppMessage({
    to: formatPhoneNumber(phone),
    text: `📂 *Categories*

Select a category to browse products:`,
    buttons,
  }, orgId);
}

export async function sendCategoryProducts(phone: string, category: string, orgId: string) {
  const products = await prisma.product.findMany({
    where: { organizationId: orgId, category: { contains: category, mode: "insensitive" }, isActive: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  if (products.length === 0) {
    await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text: `No products found in "${category}" category.` }, orgId);
    return;
  }
  let text = `📁 *${category}*\n\n`;
  products.forEach((p, i) => {
    text += `${i + 1}. *${p.name}* — ${formatPrice(p.price)}\n`;
    if (p.description) text += `   ${p.description.slice(0, 60)}\n`;
    text += "\n";
  });
  text += `Reply with product *name* to add to cart.\nOr type *MENU* to go back.`;
  await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text }, orgId);
}

export async function addToCart(phone: string, contactId: string, orgId: string, productName: string) {
  const product = await prisma.product.findFirst({
    where: {
      organizationId: orgId,
      isActive: true,
      name: { contains: productName, mode: "insensitive" },
    },
  });
  if (!product || product.stock < 1) {
    await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text: "Sorry, that product is not available or out of stock. 😔" }, orgId);
    return;
  }
  let cart = await prisma.cart.findUnique({ where: { contactId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { contactId } });
  }
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId: product.id },
  });
  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: { increment: 1 } },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId: product.id, quantity: 1 },
    });
  }
  await sendWhatsAppMessage({
    to: formatPhoneNumber(phone),
    text: `✅ *${product.name}* added to your cart! (${formatPrice(product.price)})

Reply *CART* to view your cart.
Reply *MENU* for main menu.`,
    buttons: [
      { type: "reply", reply: { id: "cart", title: "🛒 View Cart" } },
      { type: "reply", reply: { id: "menu", title: "🏠 Menu" } },
    ],
  }, orgId);
}

export async function sendCart(phone: string, contactId: string, orgId: string) {
  const cart = await prisma.cart.findUnique({
    where: { contactId },
    include: { items: { include: { product: true } } },
  });
  if (!cart || cart.items.length === 0) {
    await sendWhatsAppMessage({
      to: formatPhoneNumber(phone),
      text: "🛒 Your cart is empty.\n\nBrowse our catalog and add items!",
      buttons: [{ type: "reply", reply: { id: "catalog", title: "📦 Browse Catalog" } }],
    }, orgId);
    return;
  }
  let total = 0;
  let text = `🛒 *Your Cart*\n\n`;
  cart.items.forEach((item, i) => {
    const lineTotal = item.product.price * item.quantity;
    total += lineTotal;
    text += `${i + 1}. *${item.product.name}* x${item.quantity} — ${formatPrice(lineTotal)}\n`;
    text += `   To remove: reply *REMOVE ${i + 1}*\n\n`;
  });
  text += `━━━━━━━━━━━━\n*Total: ${formatPrice(total)}*\n\nReply *CHECKOUT* to place your order 🚀`;
  await sendWhatsAppMessage({
    to: formatPhoneNumber(phone),
    text,
    buttons: [
      { type: "reply", reply: { id: "checkout", title: "🚀 Checkout" } },
      { type: "reply", reply: { id: "menu", title: "🏠 Menu" } },
    ],
  }, orgId);
}

export async function removeCartItem(phone: string, contactId: string, index: number, orgId: string) {
  const cart = await prisma.cart.findUnique({
    where: { contactId },
    include: { items: { include: { product: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!cart || !cart.items[index]) {
    await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text: "Invalid item number. Please check your cart." }, orgId);
    return;
  }
  const item = cart.items[index];
  await prisma.cartItem.delete({ where: { id: item.id } });
  await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text: `Removed *${item.product.name}* from your cart. ✅` }, orgId);
}

export async function startCheckout(phone: string, contactId: string, orgId: string) {
  const cart = await prisma.cart.findUnique({
    where: { contactId },
    include: { items: { include: { product: true } } },
  });
  if (!cart || cart.items.length === 0) {
    await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text: "Your cart is empty! Browse our catalog first. 😊" }, orgId);
    return;
  }
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return;
  const total = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const orderId = generateOrderId();
  const razorpayPaymentLink = await createRazorpayPaymentLink(total, orderId, contact.phone, contact.name);
  await prisma.order.create({
    data: {
      orderId,
      contactId,
      total,
      status: "pending",
      paymentStatus: "pending",
      razorpayOrderId: razorpayPaymentLink.id,
      phone: contact.phone,
      organizationId: orgId,
      address: { address: "pending" },
      items: {
        create: cart.items.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
        })),
      },
    },
  });
  const paymentLink = razorpayPaymentLink.short_url;
  let text = `🧾 *Order Summary*

━━━━━━━━━━━━━━━━━━━\n`;
  cart.items.forEach((item) => {
    text += `*${item.product.name}* x${item.quantity} — ${formatPrice(item.product.price * item.quantity)}\n`;
  });
  text += `━━━━━━━━━━━━━━━━━━━\n*Total: ${formatPrice(total)}*
*Order ID:* ${orderId}

💳 *Pay online:*
${paymentLink}

Or reply *CONFIRM* after payment to verify your order.`;
  await sendWhatsAppMessage({
    to: formatPhoneNumber(phone),
    text,
    buttons: [
      { type: "reply", reply: { id: "confirm_order", title: "✅ Paid" } },
      { type: "reply", reply: { id: "menu", title: "🏠 Menu" } },
    ],
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
  await sendWhatsAppMessage({ to: formatPhoneNumber(phone), text }, orgId);}

export async function handleMarketplaceMessage(
  text: string,
  phone: string,
  contactId: string,
  orgId: string
): Promise<boolean> {
  const lower = text.trim().toLowerCase();

  // Check if user is replying with a product name
  const products = await prisma.product.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { name: true }
  });

  let matchedProduct = products.find(p => p.name.toLowerCase() === lower);
  if (!matchedProduct) {
    matchedProduct = products.find(p => p.name.length >= 3 && lower.includes(p.name.toLowerCase()));
  }

  if (matchedProduct) {
    await addToCart(phone, contactId, orgId, matchedProduct.name);
    return true;
  }

  if (lower === "1" || lower === "2" || lower === "3" || lower === "4") {
    const map: Record<string, string> = { "1": "catalog", "2": "cart", "3": "orders", "4": "menu" };
    const action = map[lower];
    if (action === "catalog") { await sendCatalogCategories(phone, orgId); return true; }
    if (action === "cart") { await sendCart(phone, contactId, orgId); return true; }
    if (action === "orders") { await sendOrderStatus(phone, contactId, orgId); return true; }
    if (action === "menu") { await sendMainMenu(phone, contactId, orgId); return true; }
  }
  if (["menu", "hi", "hello", "start", "help"].includes(lower) || lower.includes("main menu")) {
    await sendMainMenu(phone, contactId, orgId);
    return true;
  }
  if (["catalog", "products", "shop", "browse"].includes(lower) || lower.includes("browse")) {
    await sendCatalogCategories(phone, orgId);
    return true;
  }
  if (lower.startsWith("cat_")) {
    const category = text.trim().slice(4);
    await sendCategoryProducts(phone, category, orgId);
    return true;
  }
  if (["cart", "my cart"].includes(lower)) {
    await sendCart(phone, contactId, orgId);
    return true;
  }
  if (lower.startsWith("remove ")) {
    const idx = parseInt(lower.replace("remove ", "")) - 1;
    if (!isNaN(idx)) {
      await removeCartItem(phone, contactId, idx, orgId);
      return true;
    }
  }
  if (["checkout", "checkout 🛒", "buy", "order now"].includes(lower)) {
    await startCheckout(phone, contactId, orgId);
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
      });
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
      });
    }
    return true;
  }
  return false;
}
