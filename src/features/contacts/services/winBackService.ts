import { prisma } from "@/shared/lib/prisma";
import { enrollOnTrigger } from "@/features/sequences/services/sequenceService";

export async function bulkTagContacts(
  orgId: string,
  input: {
    tag: string;
    contactIds?: string[];
    dormantDays?: number;
  }
): Promise<{ tagged: number; enrolled: number }> {
  const { tag, contactIds, dormantDays } = input;

  let contacts: { id: string; tags: string[]; name: string }[];

  if (contactIds && contactIds.length > 0) {
    contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, organizationId: orgId },
      select: { id: true, tags: true, name: true },
    });
  } else if (dormantDays !== undefined && dormantDays > 0) {
    const cutoff = new Date(Date.now() - dormantDays * 24 * 60 * 60 * 1000);
    contacts = await prisma.contact.findMany({
      where: {
        organizationId: orgId,
        NOT: { tags: { has: tag } },
        OR: [{ lastActiveAt: { lt: cutoff } }, { lastActiveAt: null }],
      },
      select: { id: true, tags: true, name: true },
    });
  } else {
    return { tagged: 0, enrolled: 0 };
  }

  let tagged = 0;
  let enrolled = 0;

  for (const contact of contacts) {
    if (contact.tags.includes(tag)) continue;

    await prisma.contact.update({
      where: { id: contact.id },
      data: { tags: { set: [...contact.tags, tag] } },
    });
    tagged++;

    try {
      await enrollOnTrigger(orgId, "tag_added", contact.id, { tag });
      enrolled++;
    } catch {
      // enrollment errors are non-fatal — contact is still tagged
    }
  }

  if (tagged > 0) {
    await prisma.systemLog.create({
      data: {
        type: "crm",
        message: `Win-Back: tagged ${tagged} contact${tagged === 1 ? "" : "s"} as "${tag}"${dormantDays ? ` (inactive ${dormantDays}+ days)` : ""}. ${enrolled} enrolled in sequence.`,
        organizationId: orgId,
      },
    });
  }

  return { tagged, enrolled };
}
