/**
 * sizeShadeRepo.ts — Prisma access for the size/shade finder feature.
 *
 * This is the ONLY place @/shared/lib/prisma may be imported within the
 * size-shade-finder feature.
 */
import { prisma } from "@/shared/lib/prisma";

/** Fetch a contact's stored attributes JSON (empty object if none). */
export async function getContactAttributes(contactId: string): Promise<Record<string, any>> {
  const c = await prisma.contact.findUnique({ where: { id: contactId }, select: { attributes: true } });
  return (c?.attributes as Record<string, any>) ?? {};
}

/** Overwrite a contact's attributes JSON. */
export function updateContactAttributes(contactId: string, attributes: Record<string, any>) {
  return prisma.contact.update({
    where: { id: contactId },
    data: { attributes },
  });
}
