/** adRepo.ts — Prisma access for ads + ad campaigns (T-01). */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function listAds(organizationId: string) {
  return prisma.ad.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
}

export function createAd(data: Prisma.AdUncheckedCreateInput) {
  return prisma.ad.create({ data });
}

export function incrementLeads(adId: string) {
  return prisma.ad.update({ where: { id: adId }, data: { leads: { increment: 1 } } });
}

/** Match an inbound Click-to-WhatsApp referral back to its ad. */
export function findByCtwaClid(organizationId: string, ctwaClid: string) {
  return prisma.ad.findFirst({ where: { organizationId, ctwaClid } });
}

/** Get the organization's brand profile for AI copywriting. */
export function getOrganizationBrandProfile(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { brandProfile: true },
  });
}

export function listAdCampaigns(organizationId: string) {
  return prisma.adCampaign.findMany({
    where: { organizationId },
    include: { ads: true },
    orderBy: { createdAt: "desc" },
  });
}

export function findAdCampaign(organizationId: string, campaignId: string) {
  return prisma.adCampaign.findFirst({
    where: { id: campaignId, organizationId },
    include: { ads: true },
  });
}

export function createAdCampaign(
  campaignData: Omit<Prisma.AdCampaignUncheckedCreateInput, "ads">,
  adData: Omit<Prisma.AdUncheckedCreateInput, "organizationId" | "adCampaignId">
) {
  return prisma.adCampaign.create({
    data: { ...campaignData, ads: { create: { ...adData, organizationId: campaignData.organizationId } } },
    include: { ads: true },
  });
}

/** Returns the number of rows deleted (0 if the campaign doesn't belong to this org). */
export async function deleteAdCampaign(organizationId: string, campaignId: string): Promise<number> {
  const { count } = await prisma.adCampaign.deleteMany({ where: { id: campaignId, organizationId } });
  return count;
}
