import { ApiError } from "@/shared/lib/api";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/shared/lib/razorpay";
import { resolveAttribution } from "@/features/analytics/services/attribution";
import { enrollOnTrigger, markCartRecovered } from "@/features/sequences/services/sequenceService";
import { emitEvent } from "@/features/webhooks/services/webhookDeliveryService";
import * as orderRepo from "../repositories/orderRepo";

function generateOrderId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "ORD-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Create a Razorpay order from a contact's cart, then clear the cart. */
export async function createOrderFromCart(contactId: string, orgId: string, address?: string) {
  const cart = await orderRepo.findCartWithItems(contactId);
  if (!cart || cart.items.length === 0) {
    throw new ApiError("Cart is empty", 400);
  }

  const contact = await orderRepo.findContactById(contactId);
  if (!contact) throw new ApiError("Contact not found", 404);

  const total = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const orderId = generateOrderId();

  const razorpayOrder = await createRazorpayOrder(total, orderId, orgId);
  const attribution = await resolveAttribution(orgId, contact);

  const order = await orderRepo.createOrderAndClearCart(
    {
      orderId,
      contactId,
      total,
      razorpayOrderId: razorpayOrder.id,
      phone: contact.phone,
      organizationId: orgId,
      address: { address: address || "pending" },
      attribution,
      items: cart.items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      })),
    },
    cart.id
  );

  // Sequence trigger: enroll into order_placed sequences.
  await enrollOnTrigger(orgId, "order_placed", contact.id);

  // Outbound webhook (T-08): notify subscribers of the new order.
  await emitEvent(orgId, "order.placed", {
    orderId: order.orderId,
    total,
    currency: "INR",
    source: "marketplace",
    contact: { id: contact.id, name: contact.name, phone: contact.phone },
    items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
  });

  return {
    order,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    keyId: razorpayOrder.keyId,
  };
}

/** Verify a Razorpay payment signature and mark the order as paid. */
export async function verifyOrderPayment(razorpayOrderId: string, paymentId: string, signature: string) {
  const order = await orderRepo.findOrderByRazorpayOrderId(razorpayOrderId);
  if (!order) throw new ApiError("Order not found", 404);

  const isValid = await verifyRazorpayPayment(razorpayOrderId, paymentId, signature, order.organizationId);
  if (!isValid) throw new ApiError("Invalid payment signature", 400);

  await orderRepo.markOrderPaid(order.id, paymentId, signature);

  // Cart paid → mark recovered and stop any active abandoned-cart drip.
  await markCartRecovered(order.organizationId, order.contactId);

  return { orderId: order.orderId };
}
