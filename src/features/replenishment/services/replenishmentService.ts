import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import type { Contact } from "@prisma/client";
import { clearReplenishmentPromptedFlag } from "../repositories/replenishmentRepo";

async function send(contact: Contact, orgId: string, text: string) {
  await sendWhatsAppMessage({ to: formatPhoneNumber(contact.phone), text }, orgId);
}

async function clearFlag(contactId: string, attrs: Record<string, any>) {
  await clearReplenishmentPromptedFlag(contactId, attrs);
}

export async function handleReplenishmentReply(
  text: string,
  contact: Contact,
  orgId: string
): Promise<boolean> {
  const attrs = (contact.attributes as Record<string, any>) ?? {};
  if (!attrs.replenishment_prompted) return false;

  const up = text.trim().toUpperCase();
  const isReorder = ["REORDER", "1", "YES", "ORDER", "BUY", "SEND"].includes(up);
  const isStop    = ["STOP", "NO", "2", "SKIP", "LATER"].includes(up);

  if (isReorder) {
    const productUrl =
      attrs.last_product_url ||
      attrs.shopify_checkout_url ||
      attrs.cart_checkout_url ||
      null;

    await clearFlag(contact.id, attrs);

    if (productUrl) {
      await send(
        contact, orgId,
        `Great, ${contact.name}! 🛍️ Here's your reorder link:\n\n${productUrl}\n\nSame products, straight to your door. Let us know if you'd like to change anything!`
      );
    } else {
      await send(
        contact, orgId,
        `Awesome, ${contact.name}! 🛍️ Our team will process your reorder shortly. You'll get a confirmation once it's placed. Thank you for being a loyal customer! 💚`
      );
    }
    return true;
  }

  if (isStop) {
    await clearFlag(contact.id, attrs);
    await send(
      contact, orgId,
      `No problem, ${contact.name}! We'll stop the reminders for now. Just message us whenever you're ready to reorder. 😊`
    );
    return true;
  }

  // Unknown reply while in prompted state — don't consume so autoresponder can answer
  return false;
}
