/**
 * tokenPrepayService.ts — Partial-COD token prepay for high-risk orders.
 *
 * Instead of asking "YES/NO confirm your COD order?", we ask for a small
 * ₹99 token payment upfront. This creates skin-in-the-game — a genuine
 * buyer pays ₹99; a fraudster/impulse-canceller doesn't.
 *
 * Flow:
 *   1. checkAndFlagCodRisk detects high-risk → calls sendTokenPrepayRequest
 *   2. Customer pays ₹99 Razorpay link → Razorpay webhook calls confirmTokenPayment
 *   3. Customer ignores 2h → cron calls autoExpireUnpaidTokenOrders → cancel + release hold
 *
 * The ₹99 token is deducted from the final COD amount at door.
 */
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import { createRazorpayPaymentLink } from "@/shared/lib/razorpay";
import { prisma } from "@/shared/lib/prisma";

const TOKEN_AMOUNT_RUPEES = 99;
const TOKEN_AMOUNT_PAISE  = TOKEN_AMOUNT_RUPEES * 100;
const TOKEN_EXPIRY_MS     = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Send a ₹99 token prepay request for a high-risk COD order.
 * Creates a Razorpay payment link, saves it on the Order row, and sends
 * the message. Safe to call fire-and-forget — never throws.
 */
export async function sendTokenPrepayRequest(
  contactId: string,
  contactName: string,
  contactPhone: string,
  orgId: string,
  orderId: string,         // Order.orderId (e.g. "SHPFY-4821")
  internalOrderId: string, // Order.id (UUID)
  totalPaise: number,
): Promise<void> {
  try {
    const totalRupees  = (totalPaise / 100).toFixed(0);
    const balanceRupees = Math.max(0, totalPaise / 100 - TOKEN_AMOUNT_RUPEES).toFixed(0);

    // Create Razorpay payment link for ₹99
    const link = await createRazorpayPaymentLink(
      TOKEN_AMOUNT_PAISE,
      `COD-TOKEN-${orderId}`,
      contactPhone,
      contactName,
      orgId,
    );

    // Persist link ID on the Order so the Razorpay webhook can resolve it
    await prisma.order.update({
      where: { id: internalOrderId },
      data: { razorpayOrderId: link.id },
    });

    // Stamp contact with token-prepay state
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { attributes: true },
    });
    const attrs = (contact?.attributes as Record<string, unknown>) || {};
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        attributes: {
          ...attrs,
          token_prepay_pending: true,
          token_prepay_order_id: orderId,
          token_prepay_link_id: link.id,
          token_prepay_sent_at: new Date().toISOString(),
        },
      },
    });

    const message =
      `🔒 *Confirm your COD order*\n\n` +
      `Hi ${contactName}! Your order #${orderId} (₹${totalRupees}) needs a small ₹${TOKEN_AMOUNT_RUPEES} token to confirm — this amount will be deducted from your final payment at delivery.\n\n` +
      `*Pay ₹${TOKEN_AMOUNT_RUPEES} now:*\n${link.short_url}\n\n` +
      `Balance ₹${balanceRupees} to be paid on delivery. Token expires in 2 hours.`;

    await sendWhatsAppMessage({ to: formatPhoneNumber(contactPhone), text: message }, orgId);

    await prisma.message.create({
      data: { sender: "agent", text: message, contactId, organizationId: orgId },
    });
    await prisma.systemLog.create({
      data: {
        type: "integration",
        message: `[Token Prepay] ₹${TOKEN_AMOUNT_RUPEES} token request sent for order #${orderId} (${contactName}).`,
        organizationId: orgId,
      },
    });
  } catch (err) {
    console.warn("[TokenPrepay] sendTokenPrepayRequest error:", err);
  }
}

/**
 * Called from the Razorpay webhook when a COD-TOKEN-* payment link is paid.
 * Confirms the COD order, releases the fulfillment hold, and notifies the customer.
 */
export async function confirmTokenPayment(
  orgId: string,
  internalOrderId: string,
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: internalOrderId },
    include: { contact: true },
  });
  if (!order) return;

  const contact = order.contact;
  const attrs = (contact.attributes as Record<string, unknown>) || {};
  const totalRupees  = (order.total / 100).toFixed(0);
  const balanceRupees = Math.max(0, order.total / 100 - TOKEN_AMOUNT_RUPEES).toFixed(0);

  // Confirm the COD order
  await prisma.order.update({
    where: { id: internalOrderId },
    data: { codStatus: "confirmed" },
  });
  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      attributes: {
        ...attrs,
        cod_status: "confirmed",
        token_prepay_pending: false,
        token_prepay_confirmed_at: new Date().toISOString(),
      },
      tags: { set: Array.from(new Set([...contact.tags, "cod-token-confirmed"])) },
    },
  });

  // Release fulfillment hold if one was placed
  if (order.fulfillmentHoldId) {
    try {
      const { releaseHold } = await import("./fulfillmentHoldService");
      await releaseHold(orgId, internalOrderId);
    } catch (err) {
      console.warn("[TokenPrepay] Hold release failed:", err);
    }
  }

  const message =
    `✅ *Token received! Order confirmed.*\n\n` +
    `Thank you, ${contact.name}! Your ₹${TOKEN_AMOUNT_RUPEES} token has been received and your order #${order.orderId} (₹${totalRupees}) is confirmed.\n\n` +
    `*Balance to pay at delivery: ₹${balanceRupees}*\n\nWe'll send tracking details once your order is dispatched. 🚚`;

  await sendWhatsAppMessage({ to: formatPhoneNumber(contact.phone), text: message }, orgId);

  await prisma.message.create({
    data: { sender: "agent", text: message, contactId: contact.id, organizationId: orgId },
  });
  await prisma.systemLog.create({
    data: {
      type: "integration",
      message: `[Token Prepay] Token confirmed for order #${order.orderId} (${contact.name}). COD confirmed.`,
      organizationId: orgId,
    },
  });
}

/**
 * Cron worker: find orders where token was requested but not paid in 2h.
 * Cancels the order, releases any fulfillment hold, notifies the customer.
 */
export async function autoExpireUnpaidTokenOrders(): Promise<{ expired: number }> {
  const cutoff = new Date(Date.now() - TOKEN_EXPIRY_MS);

  // Find contacts with token_prepay_pending that were sent > 2h ago
  const contacts = await prisma.contact.findMany({
    where: {
      attributes: { path: ["token_prepay_pending"], equals: true },
      updatedAt: { lt: cutoff },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      attributes: true,
      organizationId: true,
      tags: true,
    },
  });

  let expired = 0;
  for (const contact of contacts) {
    try {
      const attrs = (contact.attributes as Record<string, unknown>) || {};
      const orderId = attrs.token_prepay_order_id as string | undefined;
      if (!orderId) continue;

      // Find the pending order
      const order = await prisma.order.findFirst({
        where: { orderId, organizationId: contact.organizationId, codStatus: "pending" },
      });
      if (!order) continue;

      // Cancel the order
      await prisma.order.update({
        where: { id: order.id },
        data: { codStatus: "cancelled", status: "cancelled" },
      });
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          attributes: {
            ...attrs,
            cod_status: "cancelled",
            token_prepay_pending: false,
            token_expired_at: new Date().toISOString(),
          },
          tags: { set: Array.from(new Set([...contact.tags, "Token-Expired"])) },
        },
      });

      // Release hold if any
      if (order.fulfillmentHoldId) {
        try {
          const { releaseHold } = await import("./fulfillmentHoldService");
          await releaseHold(contact.organizationId, order.id);
        } catch { /* non-fatal */ }
      }

      await sendWhatsAppMessage(
        {
          to: formatPhoneNumber(contact.phone),
          text: `Your COD order #${orderId} has been cancelled as the token payment window expired. Feel free to place a new order — we're happy to help! 😊`,
        },
        contact.organizationId,
      );

      await prisma.systemLog.create({
        data: {
          type: "integration",
          message: `[Token Prepay] Order #${orderId} auto-cancelled — token not paid within 2h (${contact.name}).`,
          organizationId: contact.organizationId,
        },
      });

      // Feed the shared RTO fraud network — ghosting a token is a strong
      // intent-to-RTO signal (genuine buyers pay ₹99; fraudsters vanish).
      try {
        const { recordNetworkSignal } = await import("./networkSignalService");
        await recordNetworkSignal(contact.phone, "token_unpaid", contact.organizationId);
      } catch { /* non-fatal */ }

      expired++;
    } catch (err) {
      console.warn("[TokenPrepay] autoExpire error for contact:", err);
    }
  }

  return { expired };
}
