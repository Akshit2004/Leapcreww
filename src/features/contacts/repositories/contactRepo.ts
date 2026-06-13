import { prisma } from "@/shared/lib/prisma";

export function findByIds(organizationId: string, contactIds: string[]) {
  return prisma.contact.findMany({
    where: { id: { in: contactIds }, organizationId },
    select: { id: true, tags: true, name: true },
  });
}

/** Find all contacts for an org, optionally narrowed to those carrying `tag`. */
export function findByOrgAndTag(organizationId: string, tag?: string | null) {
  return prisma.contact.findMany({
    where: {
      organizationId,
      ...(tag ? { tags: { has: tag } } : {}),
    },
    select: { id: true, phone: true },
  });
}

export function findDormant(organizationId: string, tag: string, cutoff: Date) {
  return prisma.contact.findMany({
    where: {
      organizationId,
      NOT: { tags: { has: tag } },
      OR: [{ lastActiveAt: { lt: cutoff } }, { lastActiveAt: null }],
    },
    select: { id: true, tags: true, name: true },
  });
}

export function setTags(contactId: string, tags: string[]) {
  return prisma.contact.update({
    where: { id: contactId },
    data: { tags: { set: tags } },
  });
}

export function writeLog(organizationId: string, message: string) {
  return prisma.systemLog.create({
    data: { type: "crm", message, organizationId },
  });
}

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
