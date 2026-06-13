import { enrollOnTrigger } from "@/features/sequences/services/sequenceService";
import * as contactRepo from "../repositories/contactRepo";

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
    contacts = await contactRepo.findByIds(orgId, contactIds);
  } else if (dormantDays !== undefined && dormantDays > 0) {
    const cutoff = new Date(Date.now() - dormantDays * 24 * 60 * 60 * 1000);
    contacts = await contactRepo.findDormant(orgId, tag, cutoff);
  } else {
    return { tagged: 0, enrolled: 0 };
  }

  let tagged = 0;
  let enrolled = 0;

  for (const contact of contacts) {
    if (contact.tags.includes(tag)) continue;

    await contactRepo.setTags(contact.id, [...contact.tags, tag]);
    tagged++;

    try {
      await enrollOnTrigger(orgId, "tag_added", contact.id, { tag });
      enrolled++;
    } catch {
      // enrollment errors are non-fatal — contact is still tagged
    }
  }

  if (tagged > 0) {
    await contactRepo.writeLog(
      orgId,
      `Win-Back: tagged ${tagged} contact${tagged === 1 ? "" : "s"} as "${tag}"${dormantDays ? ` (inactive ${dormantDays}+ days)` : ""}. ${enrolled} enrolled in sequence.`
    );
  }

  return { tagged, enrolled };
}
