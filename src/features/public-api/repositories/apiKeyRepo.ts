/** apiKeyRepo.ts — Prisma access for API keys (T-08). */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function createKey(data: Prisma.ApiKeyUncheckedCreateInput) {
  return prisma.apiKey.create({ data });
}

export function listKeys(organizationId: string) {
  return prisma.apiKey.findMany({
    where: { organizationId },
    select: { id: true, name: true, prefix: true, scopes: true, isSandbox: true, lastUsedAt: true, revokedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export function findByHash(hashedKey: string) {
  return prisma.apiKey.findUnique({ where: { hashedKey } });
}

export function findById(id: string, organizationId: string) {
  return prisma.apiKey.findFirst({ where: { id, organizationId } });
}

export function touch(id: string) {
  return prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } });
}

export function revoke(id: string) {
  return prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
}
