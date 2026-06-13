/** aiRepo.ts — Prisma access for AI-assisted features (analytics narration,
 * reply suggestions, campaign strategist). All tenant queries are scoped by
 * `organizationId`. */
import { prisma } from "@/shared/lib/prisma";

/** Most recent campaigns for an org, used as telemetry input for the narrator. */
export function findRecentCampaigns(organizationId: string, take = 10) {
  return prisma.campaign.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/** Paid orders for an org, used to compute revenue/ROI telemetry. */
export function findPaidOrders(organizationId: string) {
  return prisma.order.findMany({
    where: { organizationId, paymentStatus: "paid" },
  });
}

export function countContacts(organizationId: string) {
  return prisma.contact.count({ where: { organizationId } });
}

/** Org brand profile, shared by the narrator, strategist and reply-suggestions prompts. */
export function findBrandProfile(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { brandProfile: true },
  });
}

/** Recent contact tags/source, used to ground the strategist's segment choices. */
export function findContactsForStrategist(organizationId: string, take = 20) {
  return prisma.contact.findMany({
    where: { organizationId },
    select: { tags: true, source: true },
    take,
  });
}

/** Approved templates (own org or shared) usable by the strategist. */
export function findApprovedTemplates(organizationId: string) {
  return prisma.template.findMany({
    where: {
      OR: [{ organizationId }, { isShared: true }],
      metaStatus: "approved",
    },
    select: {
      name: true,
      category: true,
      body: true,
      buttons: true,
      mediaType: true,
      mediaUrl: true,
    },
  });
}

/** Existing template (approved or pending) for an org by name — avoids duplicate Meta submissions. */
export function findReusableTemplate(organizationId: string, name: string) {
  return prisma.template.findFirst({
    where: {
      OR: [{ organizationId }, { isShared: true }],
      name,
      metaStatus: { in: ["approved", "pending"] },
    },
  });
}

export function deleteCampaign(id: string) {
  return prisma.campaign.delete({ where: { id } });
}

export function deleteSequence(id: string) {
  return prisma.sequence.delete({ where: { id } });
}

export function deleteSegment(id: string) {
  return prisma.segment.delete({ where: { id } });
}

/** Recent chat messages for a contact, oldest-first, for the reply-suggestions prompt. */
export async function findRecentMessages(contactId: string, take = 8) {
  const messages = await prisma.message.findMany({
    where: { contactId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return messages.reverse();
}

/** Active product catalog for an org, used by the reply-suggestions prompt. */
export function findActiveProducts(organizationId: string, take = 12) {
  return prisma.product.findMany({
    where: { organizationId, isActive: true },
    select: { sku: true, name: true, description: true, price: true },
    take,
  });
}
