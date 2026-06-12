import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { createRazorpayOrder } from "@/shared/lib/razorpay";
import { resolveAttribution } from "@/features/analytics/services/attribution";
import { enrollOnTrigger } from "@/features/sequences/services/sequenceService";

function generateOrderId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "ORD-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { contactId, orgId, address } = await req.json();

    if (!contactId || !orgId) {
      return NextResponse.json({ error: "contactId and orgId required" }, { status: 400 });
    }

    const cart = await prisma.cart.findUnique({
      where: { contactId },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const total = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const orderId = generateOrderId();

    const razorpayOrder = await createRazorpayOrder(total, orderId, orgId);

    const attribution = await resolveAttribution(orgId, contact);

    const order = await prisma.order.create({
      data: {
        orderId,
        contactId,
        total,
        status: "pending",
        paymentStatus: "pending",
        razorpayOrderId: razorpayOrder.id,
        phone: contact.phone,
        organizationId: orgId,
        address: { address: address || "pending" },
        ...attribution,
        items: {
          create: cart.items.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    // Sequence trigger: enroll into order_placed sequences.
    await enrollOnTrigger(orgId, "order_placed", contact.id);

    // Outbound webhook (T-08): notify subscribers of the new order.
    const { emitEvent } = await import("@/features/webhooks/services/webhookDeliveryService");
    await emitEvent(orgId, "order.placed", {
      orderId: order.orderId,
      total,
      currency: "INR",
      source: "marketplace",
      contact: { id: contact.id, name: contact.name, phone: contact.phone },
      items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
    });

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return NextResponse.json({
      order,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      keyId: razorpayOrder.keyId,
    });
  } catch (err: unknown) {
    console.error("Create order error:", err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}