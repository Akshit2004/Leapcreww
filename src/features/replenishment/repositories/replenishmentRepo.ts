/**
 * replenishmentRepo.ts — Prisma access for the replenishment-reminder feature.
 *
 * This is the ONLY place @/shared/lib/prisma may be imported within the
 * replenishment feature.
 */
import { prisma } from "@/shared/lib/prisma";

/** Clear the "replenishment_prompted" flag on a contact's attributes. */
export function clearReplenishmentPromptedFlag(contactId: string, attrs: Record<string, any>) {
  return prisma.contact.update({
    where: { id: contactId },
    data: {
      attributes: {
        ...attrs,
        replenishment_prompted: false,
      },
    },
  });
}
