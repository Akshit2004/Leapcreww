/** templateRepo.ts — Prisma access for templates. */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function findOrgWaba(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { whatsappBusinessAccountId: true, whatsappConnected: true },
  });
}

export function createTemplate(data: Prisma.TemplateUncheckedCreateInput) {
  return prisma.template.create({ data });
}

export function findByNameForOrg(organizationId: string, name: string) {
  return prisma.template.findFirst({ where: { organizationId, name } });
}

export function updateTemplate(id: string, data: Prisma.TemplateUncheckedUpdateInput) {
  return prisma.template.update({ where: { id }, data });
}

export function createLog(data: Prisma.SystemLogUncheckedCreateInput) {
  return prisma.systemLog.create({ data });
}
