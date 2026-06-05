/** partnerRepo.ts — Prisma access for partners / white-label (T-09). */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function createPartner(data: Prisma.PartnerCreateInput) {
  return prisma.partner.create({ data });
}

export function findBySlug(slug: string) {
  return prisma.partner.findUnique({ where: { slug } });
}

export function findByDomain(customDomain: string) {
  return prisma.partner.findUnique({ where: { customDomain } });
}

/** Client workspaces belonging to a partner, with lightweight usage rollup. */
export function listClientOrgs(partnerId: string) {
  return prisma.organization.findMany({
    where: { partnerId },
    select: { id: true, name: true, slug: true, walletBalance: true, createdAt: true },
  });
}
