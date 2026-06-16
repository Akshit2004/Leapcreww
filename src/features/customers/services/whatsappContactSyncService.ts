/**
 * whatsappContactSyncService.ts — WhatsApp conversation history → CRM sync.
 *
 * The Meta Cloud API is webhook-only (no "list conversations" pull endpoint),
 * so we source contacts from our own Message table: every inbound message
 * (sender="user") already has a Contact record created by the webhook handler.
 *
 * This service:
 *   1. Finds all contacts in the org that have at least one inbound message.
 *   2. Tags them with "whatsapp" if not already tagged.
 *   3. Updates lastActiveAt to the most recent message timestamp.
 *
 * Safe to run repeatedly — upsert-style.
 */

import { prisma } from "@/shared/lib/prisma";

export async function syncWhatsappContacts(orgId: string): Promise<{ refreshed: number }> {
  // Find contacts with at least one user-sent message, grab their latest timestamp
  const rows = await prisma.message.groupBy({
    by: ["contactId"],
    where: { organizationId: orgId, sender: "user" },
    _max: { createdAt: true },
  });

  if (rows.length === 0) return { refreshed: 0 };

  // For each contact: add "whatsapp" tag (if missing) and update lastActiveAt
  let refreshed = 0;
  for (const row of rows) {
    const contact = await prisma.contact.findUnique({
      where: { id: row.contactId },
      select: { id: true, tags: true },
    });
    if (!contact) continue;

    const updatedTags = contact.tags.includes("whatsapp")
      ? contact.tags
      : [...contact.tags, "whatsapp"];

    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        tags: updatedTags,
        lastActiveAt: row._max.createdAt ?? undefined,
      },
    });
    refreshed++;
  }

  await prisma.systemLog.create({
    data: {
      type: "crm",
      message: `WhatsApp Contact Sync: refreshed ${refreshed} contacts from conversation history.`,
      organizationId: orgId,
    },
  });

  return { refreshed };
}
