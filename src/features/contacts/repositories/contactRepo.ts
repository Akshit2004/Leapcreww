import { prisma } from "@/shared/lib/prisma";

export async function updateAttributes(contactId: string, newAttributes: Record<string, any>) {
  const contact = await prisma.contact.findUnique({ select: { attributes: true }, where: { id: contactId } });
  if (!contact) return null;

  const merged = {
    ...(typeof contact.attributes === "object" && contact.attributes !== null ? contact.attributes : {}),
    ...newAttributes,
  };

  return prisma.contact.update({
    where: { id: contactId },
    data: { attributes: merged },
  });
}
