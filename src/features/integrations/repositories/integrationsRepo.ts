/**
 * integrationsRepo.ts — the ONLY place `@/shared/lib/prisma` is imported for
 * the integrations feature. All queries are scoped by `organizationId`.
 *
 * `apiKey` is stored as an encrypted JSON blob (see `services/integrationsService.ts`
 * for encrypt/decrypt). This repository never inspects or transforms it.
 */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function findAll(organizationId: string) {
  return prisma.integration.findMany({
    where: { organizationId },
  });
}

export function findById(id: string, organizationId: string) {
  return prisma.integration.findUnique({
    where: { id_organizationId: { id, organizationId } },
  });
}

export function upsert(
  id: string,
  organizationId: string,
  data: Omit<Prisma.IntegrationUncheckedCreateInput, "id" | "organizationId">
) {
  return prisma.integration.upsert({
    where: { id_organizationId: { id, organizationId } },
    update: data,
    create: { id, organizationId, ...data },
  });
}

export function remove(id: string, organizationId: string) {
  return prisma.integration.delete({
    where: { id_organizationId: { id, organizationId } },
  });
}

export function writeLog(organizationId: string, message: string) {
  return prisma.systemLog.create({
    data: { type: "integration", message, organizationId },
  });
}
