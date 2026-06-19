/**
 * addressConfirmService.ts — handles customer replies to the pre-shipment
 * address confirmation ping (address_confirmation template).
 *
 * When we send `address_confirmation` before dispatch, we set
 * contact.attributes.address_confirm_pending = true. This intercept fires on
 * the next incoming message from that contact and resolves the state.
 *
 * YES → stamp address_confirmed = true, clear pending flag, reassure customer.
 * NO  → enter two-step: next message captures the corrected address.
 * After address captured → stamp address_updated, alert merchant in system log,
 *   and best-effort write the new address back to Shopify via the Admin API.
 */

import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import type { Contact } from "@prisma/client";

const YES_TOKENS = new Set(["YES", "Y", "1", "CONFIRM", "OK", "HA", "HAN", "CORRECT", "RIGHT"]);
const NO_TOKENS = new Set(["NO", "N", "2", "WRONG", "CHANGE", "UPDATE", "NAHI", "INCORRECT"]);

export async function handleAddressConfirmReply(
  text: string,
  contact: Contact,
  orgId: string,
): Promise<boolean> {
  const attrs = (contact.attributes as Record<string, unknown>) || {};
  const { prisma } = await import("@/shared/lib/prisma");
  const phone = formatPhoneNumber(contact.phone);

  // ── Collect updated address (second step after NO) ────────────────────────
  if (attrs.address_update_requested === true) {
    const newAddress = text.trim();

    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        attributes: {
          ...attrs,
          address_update_requested: false,
          address_confirm_pending: false,
          delivery_address_updated: newAddress,
          address_confirmed: false,
        },
      },
    });
    await sendWhatsAppMessage(
      { to: phone, text: `✅ Got it! We've updated your delivery address. Your order will be dispatched to the new address shortly. 📦` },
      orgId,
    );
    await prisma.systemLog.create({
      data: {
        type: "integration",
        message: `Address updated by ${contact.name} before dispatch: "${newAddress}"`,
        organizationId: orgId,
      },
    });

    // Best-effort: write the updated address back to Shopify so the merchant's
    // packing screen reflects the change without manual intervention.
    const pendingOrderId = attrs.pending_cod_order_id as string | undefined;
    if (pendingOrderId) {
      writeAddressToShopify(orgId, pendingOrderId, newAddress, contact.name, prisma).catch((err) => {
        console.warn("[AddressConfirm] Shopify address write-back failed:", err);
      });
    }

    return true;
  }

  // ── Initial YES/NO response ───────────────────────────────────────────────
  if (!attrs.address_confirm_pending) return false;

  const token = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const isYes = YES_TOKENS.has(token);
  const isNo = NO_TOKENS.has(token);

  if (!isYes && !isNo) return false;

  if (isYes) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        attributes: { ...attrs, address_confirm_pending: false, address_confirmed: true },
      },
    });
    await sendWhatsAppMessage(
      { to: phone, text: `✅ Address confirmed! Your order is being packed and will be dispatched soon. We'll update you when it ships. 🚚` },
      orgId,
    );
    return true;
  }

  // NO — ask for the correct address
  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      attributes: { ...attrs, address_confirm_pending: false, address_update_requested: true },
    },
  });
  await sendWhatsAppMessage(
    { to: phone, text: `No problem! Please reply with your correct delivery address and we'll update it before dispatch. 🏠` },
    orgId,
  );
  return true;
}

// ─── Shopify address write-back ───────────────────────────────────────────────
// Called fire-and-forget when a customer provides a corrected delivery address.
// Resolves the Shopify order via the orderId stored in contact attributes,
// then PUTs the new shipping address to the Admin API via shopifyAdmin.ts
// (which handles credential decryption and the correct API endpoint).

async function writeAddressToShopify(
  orgId: string,
  orderId: string,
  newAddress: string,
  _contactName: string, // kept for call-site compat
  prismaClient: import("@prisma/client").PrismaClient,
): Promise<void> {
  const order = await prismaClient.order.findFirst({
    where: { orderId, organizationId: orgId },
    select: { shopifyNumericId: true },
  });
  if (!order?.shopifyNumericId) return;

  const { getShopifyCredentials, updateOrderShippingAddress } =
    await import("@/features/integrations/connectors/shopifyAdmin");

  const creds = await getShopifyCredentials(orgId);
  if (!creds) return;

  await updateOrderShippingAddress(creds, order.shopifyNumericId, newAddress);
}
