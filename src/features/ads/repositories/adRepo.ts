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
