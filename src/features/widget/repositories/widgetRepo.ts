import { prisma } from "@/shared/lib/prisma";
import type { UpdateWidgetInput } from "../types";

export function findByOrg(organizationId: string) {
  return prisma.widgetConfig.findUnique({ where: { organizationId } });
}

/** Lookup for the public embed endpoints — includes the org name for branding. */
export function findByPublicKey(publicKey: string) {
  return prisma.widgetConfig.findUnique({
    where: { publicKey },
    include: { organization: { select: { name: true } } },
  });
}

export function createForOrg(organizationId: string, publicKey: string) {
  return prisma.widgetConfig.create({ data: { organizationId, publicKey } });
}

export function updateForOrg(organizationId: string, data: UpdateWidgetInput) {
  return prisma.widgetConfig.update({ where: { organizationId }, data });
}

export function incrementClicks(publicKey: string) {
  return prisma.widgetConfig.update({
    where: { publicKey },
    data: { clicks: { increment: 1 } },
  });
}
