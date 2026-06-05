/**
 * campaignRepo.ts — All Prisma access for the campaigns feature.
 * Services call these; routes never touch prisma directly.
 */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function findTargetContacts(organizationId: string, targetTag: string, excludeTag?: string) {
  const where: Prisma.ContactWhereInput =
    targetTag === "all" ? { organizationId } : { organizationId, tags: { has: targetTag } };
  return prisma.contact.findMany({ where }).then((contacts) =>
    excludeTag ? contacts.filter((c) => !c.tags.includes(excludeTag)) : contacts
  );
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
  message: string,
  timestamp: string
) {
  return prisma.systemLog.create({
    data: { timestamp, type: "campaign", message, organizationId, campaignId },
  });
}

export function recordOutboundMessage(params: {
  organizationId: string;
  campaignId: string;
  contactId: string;
  text: string;
  timestamp: string;
  waMessageId?: string;
}) {
  return prisma.message.create({
    data: {
      sender: "agent",
      text: params.text,
      timestamp: params.timestamp,
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
