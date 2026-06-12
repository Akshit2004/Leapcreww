/**
 * campaignRepo.ts — All Prisma access for the campaigns feature.
 * Services call these; routes never touch prisma directly.
 */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function findTargetContacts(
  organizationId: string,
  targetTag: string,
  excludeTag?: string,
  segmentId?: string | null
) {
  return findTargetContactsPaged(organizationId, targetTag, excludeTag, segmentId);
}

/** Paginated version used by the queue engine. skip/take undefined = load all. */
export async function findTargetContactsPaged(
  organizationId: string,
  targetTag: string,
  excludeTag?: string,
  segmentId?: string | null,
  skip?: number,
  take?: number
) {
  if (segmentId) {
    const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
    if (segment) {
      const { buildSegmentWhere } = await import("@/features/segments/services/segmentRules");
      const where = buildSegmentWhere(organizationId, segment.rules as any);
      return prisma.contact.findMany({ where, orderBy: { createdAt: "asc" }, skip, take });
    }
  }

  const where: Prisma.ContactWhereInput =
    targetTag === "all" ? { organizationId } : { organizationId, tags: { has: targetTag } };

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: "asc" },
    skip,
    take,
  });
  return excludeTag ? contacts.filter((c) => !c.tags.includes(excludeTag)) : contacts;
}

export function countTargetContacts(
  organizationId: string,
  targetTag: string,
  segmentId?: string | null
) {
  if (segmentId) {
    // For segments, load+count is fine at launch — segments are bounded
    return findTargetContactsPaged(organizationId, targetTag, undefined, segmentId).then(
      (c) => c.length
    );
  }
  const where: Prisma.ContactWhereInput =
    targetTag === "all" ? { organizationId } : { organizationId, tags: { has: targetTag } };
  return prisma.contact.count({ where });
}

/** Find all campaigns that are currently mid-send (queue engine). */
export function findSendingCampaigns() {
  return prisma.campaign.findMany({ where: { status: "Sending" } });
}

/**
 * Atomically advance currentOffset by `by` contacts and increment `delivered`
 * by the number that succeeded.  Uses `updateMany` with an equality check on
 * currentOffset so two concurrent cron ticks cannot process the same chunk.
 * Returns the count of rows updated (1 = claimed, 0 = already claimed).
 */
export function advanceCampaignChunk(
  id: string,
  expectedOffset: number,
  newOffset: number,
  deliveredDelta: number,
  isComplete: boolean
) {
  return prisma.campaign.updateMany({
    where: { id, currentOffset: expectedOffset, status: "Sending" },
    data: {
      currentOffset: newOffset,
      ...(deliveredDelta > 0 ? { delivered: { increment: deliveredDelta } } : {}),
      ...(isComplete ? { status: "Completed" } : {}),
    },
  });
}

export function createCampaign(data: Prisma.CampaignUncheckedCreateInput) {
  return prisma.campaign.create({ data });
}

export function updateCampaign(id: string, data: Prisma.CampaignUncheckedUpdateInput) {
  return prisma.campaign.update({ where: { id }, data });
}

export function findCampaign(id: string) {
  return prisma.campaign.findUnique({ where: { id } });
}

export function deleteCampaign(id: string) {
  return prisma.campaign.delete({ where: { id } });
}

export function findScheduledDue(now: Date) {
  return prisma.campaign.findMany({
    where: { status: "Scheduled", scheduledAt: { lte: now } },
  });
}

export function logCampaignEvent(
  organizationId: string,
  campaignId: string,
  message: string
) {
  return prisma.systemLog.create({
    data: { type: "campaign", message, organizationId, campaignId },
  });
}

export function recordOutboundMessage(params: {
  organizationId: string;
  campaignId: string;
  contactId: string;
  text: string;
  waMessageId?: string;
}) {
  return prisma.message.create({
    data: {
      sender: "agent",
      text: params.text,
      contactId: params.contactId,
      organizationId: params.organizationId,
      waMessageId: params.waMessageId,
      campaignId: params.campaignId,
    },
  });
}

/** Confirm the user (by email) is a member of the campaign's org. */
export function userIsOrgMember(email: string, organizationId: string) {
  return prisma.membership
    .findFirst({ where: { user: { email }, organizationId } })
    .then((m) => !!m);
}
