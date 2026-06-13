/**
 * shopifyProductRepo.ts — Prisma access for the Product catalog rows touched
 * by the Shopify sync. All queries are scoped by `organizationId`.
 */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function findByName(name: string | undefined, organizationId: string) {
  return prisma.product.findFirst({
    where: { name, organizationId },
  });
}

export function update(id: string, data: Prisma.ProductUncheckedUpdateInput) {
  return prisma.product.update({ where: { id }, data });
}

export function create(organizationId: string, data: Omit<Prisma.ProductUncheckedCreateInput, "organizationId">) {
  return prisma.product.create({ data: { ...data, organizationId } });
}
