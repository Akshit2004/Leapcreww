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
  setOrderFulfillmentHold,
  recordAgentMessage,
  createCodSystemLog,
  findActiveCodSequenceEnrollments,
  completeSequenceEnrollment,
} from "../repositories/codRepo";
import { scoreCodOrder } from "./codRiskScorer";
import type { CodRiskItem } from "./codRiskScorer";

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

  // Record a utility-category success fee so COD confirmations appear in the
  // org's billing ledger. Best-effort — never crash the confirmation flow.
  try {
    const { recordUsage } = await import("@/features/billing/services/billingService");
    await recordUsage({ organizationId: orgId, type: "conversation", category: "utility" });
  } catch (err) {
    console.warn("[COD] Success fee recording failed:", err);
  }

  // Best-effort: offer prepaid conversion with a discount. Never throws.
  let prepaidOffered = false;
  try {
    prepaidOffered = await offerPrepaidConversion(contact, orgId, orderId, parseFloat(total));
  } catch (err) {
    console.warn(`[COD] Prepaid offer skipped for ${contact.name}:`, err);
  }

  if (prepaidOffered) {
    // Stamp so analytics can track how many confirmed COD orders receive the offer.
    await updateContactCodStatus(
      contact.id,
      { ...attrs, cod_status: "confirmed", cod_prepaid_offer_sent: true },
      Array.from(new Set([...contact.tags, "cod-confirmed"]))
    );
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

  // Feed the shared RTO fraud network — a COD cancel is a soft RTO signal.
  try {
    const { recordNetworkSignal } = await import("./networkSignalService");
    await recordNetworkSignal(contact.phone, "cod_cancel", orgId);
  } catch { /* non-fatal */ }
}

const COD_PREPAID_DISCOUNT = 50; // ₹50 flat discount for converting COD → prepaid

async function offerPrepaidConversion(
  contact: Contact,
  orgId: string,
  orderId: string,
  originalTotal: number
): Promise<boolean> {
  if (!orderId || originalTotal <= COD_PREPAID_DISCOUNT) return false;

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
  return true;
}

async function stopCodSequences(contactId: string, orgId: string) {
  const active = await findActiveCodSequenceEnrollments(contactId, orgId);
  for (const e of active) {
    await completeSequenceEnrollment(e.id);
  }
}

/**
 * Score a new COD order for fraud risk. Stamps contact attributes and sends
 * the verification template when the score crosses the high-risk threshold.
 * Safe to call fire-and-forget (never throws).
 *
 * When the order is high-risk AND the org has a connected Shopify store, a
 * Shopify fulfillment hold is placed on the order so it cannot be packed and
 * shipped until the merchant manually releases it.
 *
 * Call from the Shopify webhook and the commerce webhook after a COD order is
 * created, BEFORE enrolling the standard cod_order_placed sequence.
 *
 * @param shopifyNumericId  Raw numeric Shopify order ID (payload.id as string).
 *                          Required for fulfillment hold placement; pass `undefined`
 *                          for non-Shopify order sources.
 */
export async function checkAndFlagCodRisk(
  orgId: string,
  contactId: string,
  contactName: string,
  contactPhone: string,
  orderId: string,
  totalPaise: number,
  items?: CodRiskItem[],
  shopifyNumericId?: string,
  internalOrderId?: string,
): Promise<void> {
  try {
    const { prisma } = await import("@/shared/lib/prisma");

    const orderCount = await prisma.order.count({
      where: { contactId, organizationId: orgId, paymentStatus: "paid" },
    });

    // Shared RTO fraud network: read this brand's own prior RTO/cancel history
    // for the phone, signals reported by OTHER stores in the network, AND the
    // brand's existing operational RTO data (so it works from day one).
    const { getNetworkRiskCounts, getBrandHistoricalRtoCount } =
      await import("./networkSignalService");
    const [{ ownCount, networkCount }, brandHistorical] = await Promise.all([
      getNetworkRiskCounts(contactPhone, orgId),
      getBrandHistoricalRtoCount(orgId, contactId),
    ]);

    const result = scoreCodOrder({
      orderCount,
      totalPaise,
      customerName: contactName,
      items,
      ownRtoCount: ownCount + brandHistorical,
      networkRtoCount: networkCount,
    });

    await prisma.contact.update({
      where: { id: contactId },
      data: {
        attributes: {
          ...((
            await prisma.contact.findUnique({ where: { id: contactId }, select: { attributes: true } })
          )?.attributes as Record<string, unknown> || {}),
          cod_risk_score: result.score,
          cod_high_risk: result.highRisk,
          cod_risk_reasons: result.reasons.join(", "),
        },
        ...(result.highRisk ? { tags: { push: "COD-High-Risk" } } : {}),
      },
    });

    // Persist shopifyNumericId on the order row regardless of risk level so
    // subsequent Admin API calls (hold release, address write-back) can resolve it.
    if (shopifyNumericId) {
      await prisma.order.updateMany({
        where: { orderId, organizationId: orgId },
        data: { shopifyNumericId },
      });
    }

    if (!result.highRisk) return;

    // Place a Shopify fulfillment hold so the order cannot ship until the
    // merchant manually releases it after verification.
    if (shopifyNumericId) {
      try {
        await placeShopifyFulfillmentHold(orgId, orderId, shopifyNumericId, prisma);
      } catch (holdErr) {
        console.warn("[COD Risk] Fulfillment hold failed:", holdErr);
      }
    }

    // Token prepay: if we have an internal order ID, send a ₹99 token request
    // instead of (or in addition to) the plain YES/NO verification template.
    // Skin-in-the-game beats a simple YES/NO — fraudsters won't pay ₹1.
    if (internalOrderId) {
      const { sendTokenPrepayRequest } = await import("./tokenPrepayService");
      await sendTokenPrepayRequest(
        contactId, contactName, contactPhone, orgId, orderId, internalOrderId, totalPaise,
      );
    } else {
      // Fallback when no internal order ID: send plain verification template
      const dbTemplate = await prisma.template.findFirst({
        where: { name: "cod_risk_verify", organizationId: orgId, metaStatus: "approved" },
      });
      if (dbTemplate) {
        await sendWhatsAppMessage(
          {
            to: formatPhoneNumber(contactPhone),
            template: {
              name: "cod_risk_verify",
              language: { code: "en_US" },
              components: [{
                type: "body",
                parameters: [
                  { type: "text", text: contactName },
                  { type: "text", text: orderId },
                  { type: "text", text: (totalPaise / 100).toFixed(0) },
                ],
              }],
            },
          },
          orgId,
        );
      }
    }

    await createCodSystemLog(
      orgId,
      `[COD Risk] High-risk order #${orderId} flagged for ${contactName} — score ${result.score}/10 (${result.reasons.join(", ")}). Verification sent.`,
    );
  } catch (err) {
    console.warn("[COD Risk] checkAndFlagCodRisk error:", err);
  }
}

// ─── Shopify fulfillment hold ─────────────────────────────────────────────────
// Delegates to shopifyAdmin.ts (encrypted credentials, correct endpoint).
// The Admin API fulfillment hold ID is persisted so the cron can release it.

async function placeShopifyFulfillmentHold(
  orgId: string,
  orderId: string,
  shopifyNumericId: string,
  _prismaClient: unknown, // kept for call-site compat — unused, shopifyAdmin handles its own DB reads
): Promise<void> {
  const { getShopifyCredentials, placeFulfillmentHold } =
    await import("@/features/integrations/connectors/shopifyAdmin");

  const creds = await getShopifyCredentials(orgId);
  if (!creds) return;

  const foId = await placeFulfillmentHold(
    creds,
    shopifyNumericId,
    `LeapCreww COD Risk Scorer flagged order ${orderId} for verification.`,
  );
  if (foId) {
    await setOrderFulfillmentHold(orderId, orgId, foId);
  }
}
