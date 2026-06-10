/**
 * botMessaging.ts — Helpers shared by the WhatsApp use-case bots
 * (marketplace + appointment): outbound message logging and price formatting.
 */
import { prisma } from "./prisma";

export const CURRENCY_SYMBOL = "₹";

export function formatPrice(paise: number): string {
  return `${CURRENCY_SYMBOL}${(paise / 100).toFixed(2)}`;
}

/** Persist an outbound bot message and refresh the contact's chat preview. */
export async function logBotMessage(
  contactId: string,
  orgId: string,
  text: string,
  waMessageId?: string | null
) {
  const d = new Date();
  const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  await prisma.message.create({
    data: {
      sender: "agent",
      text,
      timestamp: timeStr,
      contactId,
      organizationId: orgId,
      waMessageId: waMessageId || null,
    },
  });

  const preview = text.length > 35 ? text.substring(0, 32) + "..." : text;
  await prisma.contact.update({
    where: { id: contactId },
    data: { lastMessage: preview, lastMessageTime: timeStr },
  });
}
