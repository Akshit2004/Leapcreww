/** templateRepo.ts — Prisma access for templates. */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function findOrgWaba(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { whatsappBusinessAccountId: true, whatsappConnected: true },
  });
}

export function findWabaIdForOrg(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { whatsappBusinessAccountId: true },
  });
}

export function findTemplateById(id: string) {
  return prisma.template.findUnique({ where: { id } });
}

export function findTemplateForShare(id: string) {
  return prisma.template.findUnique({
    where: { id },
    select: { id: true, name: true, organizationId: true },
  });
}

export function deleteTemplateById(id: string) {
  return prisma.template.delete({ where: { id } });
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

/** Delete local templates for an org whose metaId is not in `keepMetaIds` (or has no metaId at all). */
export function deleteUnsyncedTemplates(organizationId: string, keepMetaIds: string[]) {
  return prisma.template.deleteMany({
    where: {
      organizationId,
      OR: [
        { metaId: { notIn: keepMetaIds.length > 0 ? keepMetaIds : ["dummy_to_prevent_error"] } },
        { metaId: null },
      ],
    },
  });
}

/** Find existing templates for an org matching either by name or by Meta template id. */
export function findByNameOrMetaId(organizationId: string, name: string, metaId: string) {
  return prisma.template.findMany({
    where: {
      organizationId,
      OR: [{ name }, { metaId }],
    },
  });
}

export function deleteTemplatesByIds(ids: string[]) {
  if (ids.length === 0) return Promise.resolve();
  return prisma.template.deleteMany({ where: { id: { in: ids } } });
}
