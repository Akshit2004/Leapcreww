/**
 * codService.ts — COD (Cash on Delivery) confirmation intelligence.
 *
 * Called from the WhatsApp inbound webhook before the autoresponder.
 * Returns true when it consumed the message as a COD reply so the caller
 * can skip further routing.
 */
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import type { Contact } from "@prisma/client";
import {
  updateContactCodStatus,
  updateOrderCodStatus,
  setOrderRazorpayLink,
  recordAgentMessage,
  createCodSystemLog,
  findActiveCodSequenceEnrollments,
  completeSequenceEnrollment,
} from "../repositories/codRepo";

const YES_TOKENS = new Set(["YES", "Y", "1", "CONFIRM", "OK", "HA", "HAN"]);
const NO_TOKENS = new Set(["NO", "N", "2", "CANCEL", "NAHI", "NA"]);

export async function handleCodReply(
  text: string,
  contact: Contact,
  orgId: string
): Promise<boolean> {
  const attrs = (contact.attributes as Record<string, any>) || {};
  if (attrs.cod_status !== "pending") return false;

  // Strip punctuation and upper-case for loose matching
  const token = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const isYes = YES_TOKENS.has(token);
  const isNo = NO_TOKENS.has(token);

  if (!isYes && !isNo) return false;

  if (isYes) {
    await confirmCod(contact, orgId, attrs);
  } else {
    await cancelCod(contact, orgId, attrs);
  }

  return true;
}

async function confirmCod(
  contact: Contact,
  orgId: string,
  attrs: Record<string, any>
) {
  const orderId: string = attrs.pending_cod_order_id || "";
  const total: string = attrs.pending_cod_order_total || "0";

  await updateContactCodStatus(
    contact.id,
    { ...attrs, cod_status: "confirmed" },
    Array.from(new Set([...contact.tags, "cod-confirmed"]))
  );

  if (orderId) {
    await updateOrderCodStatus(orderId, orgId, "confirmed");
  }

  await stopCodSequences(contact.id, orgId);

  const reply =
    `✅ *Order Confirmed!*\n\nThank you, ${contact.name}! Your COD order #${orderId} (₹${total}) is confirmed and will be packed for shipping shortly.\n\nWe'll send you a tracking update once dispatched. 🚚`;

  await sendWhatsAppMessage({ to: formatPhoneNumber(contact.phone), text: reply }, orgId);

  await recordAgentMessage(contact.id, orgId, reply);

  await createCodSystemLog(orgId, `COD order #${orderId} confirmed by ${contact.name} via WhatsApp.`);

  // Best-effort: offer prepaid conversion with a discount. Never throws.
  try {
    await offerPrepaidConversion(contact, orgId, orderId, parseFloat(total));
  } catch (err) {
    console.warn(`[COD] Prepaid offer skipped for ${contact.name}:`, err);
  }
}

async function cancelCod(
  contact: Contact,
  orgId: string,
  attrs: Record<string, any>
) {
  const orderId: string = attrs.pending_cod_order_id || "";

  await updateContactCodStatus(
    contact.id,
    { ...attrs, cod_status: "cancelled" },
    Array.from(new Set([...contact.tags, "cod-cancelled"]))
  );

  if (orderId) {
    await updateOrderCodStatus(orderId, orgId, "cancelled");
  }

  await stopCodSequences(contact.id, orgId);

  const reply =
    `We've cancelled your COD order #${orderId}. If this was a mistake, feel free to place a new order — we're happy to help! 😊`;

  await sendWhatsAppMessage({ to: formatPhoneNumber(contact.phone), text: reply }, orgId);

  await recordAgentMessage(contact.id, orgId, reply);

  await createCodSystemLog(orgId, `COD order #${orderId} cancelled by ${contact.name} via WhatsApp.`);
}

const COD_PREPAID_DISCOUNT = 50; // ₹50 flat discount for converting COD → prepaid

async function offerPrepaidConversion(
  contact: Contact,
  orgId: string,
  orderId: string,
  originalTotal: number
) {
  if (!orderId || originalTotal <= COD_PREPAID_DISCOUNT) return;

  const discountedPaise = Math.round((originalTotal - COD_PREPAID_DISCOUNT) * 100);

  const { createRazorpayPaymentLink } = await import("@/shared/lib/razorpay");
  const link = await createRazorpayPaymentLink(
    discountedPaise,
    `COD2PRE-${orderId}`,
    contact.phone,
    contact.name,
    orgId
  );

  // Wire the payment link ID into the order so the Razorpay webhook can resolve it.
  await setOrderRazorpayLink(orderId, orgId, link.id);

  const discounted = (originalTotal - COD_PREPAID_DISCOUNT).toFixed(0);
  const original = originalTotal.toFixed(0);
  const offerText =
    `💳 *Pay online & save ₹${COD_PREPAID_DISCOUNT}!*\n\n` +
    `Your order is confirmed ✅ Here's a limited offer — pay online in the next 2 hours and we'll knock ₹${COD_PREPAID_DISCOUNT} off your bill.\n\n` +
    `Pay ₹${discounted} instead of ₹${original}:\n${link.short_url}\n\n` +
    `_Offer expires in 2 hours. No action needed if you'd prefer to pay on delivery._`;

  await sendWhatsAppMessage({ to: formatPhoneNumber(contact.phone), text: offerText }, orgId);

  await recordAgentMessage(contact.id, orgId, offerText);
}

async function stopCodSequences(contactId: string, orgId: string) {
  const active = await findActiveCodSequenceEnrollments(contactId, orgId);
  for (const e of active) {
    await completeSequenceEnrollment(e.id);
  }
}
