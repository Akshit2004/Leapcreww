import { prisma } from "@/shared/lib/prisma";

export interface ProductCreateInput {
  sku?: string | null;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  stock: number;
  organizationId: string;
}

export interface ProductUpdateInput {
  sku?: string | null;
  name?: string;
  description?: string;
  price?: number;
  images?: string[];
  category?: string;
  stock?: number;
  isActive?: boolean;
}

/** Active products for an org, newest first. */
export function listActiveByOrg(organizationId: string, category?: string) {
  const where: { organizationId: string; isActive: boolean; category?: string } = {
    organizationId,
    isActive: true,
  };
  if (category) where.category = category;
  return prisma.product.findMany({ where, orderBy: { createdAt: "desc" } });
}

/** Distinct categories among active products for an org. */
export function listActiveCategories(organizationId: string) {
  return prisma.product.findMany({
    where: { organizationId, isActive: true },
    select: { category: true },
    distinct: ["category"],
  });
}

export function create(data: ProductCreateInput) {
  return prisma.product.create({ data });
}

/** Find a product by id, scoped to an org. */
export function findByIdInOrg(id: string, organizationId: string) {
  return prisma.product.findFirst({ where: { id, organizationId } });
}

/** Update a product, scoped to an org. Returns the updated product, or null if not found. */
export async function updateInOrg(id: string, organizationId: string, data: ProductUpdateInput) {
  const result = await prisma.product.updateMany({ where: { id, organizationId }, data });
  if (result.count === 0) return null;
  return prisma.product.findUnique({ where: { id } });
}

/** Delete a product, scoped to an org. Returns the deleted product, or null if not found. */
export async function deleteInOrg(id: string, organizationId: string) {
  const product = await prisma.product.findFirst({ where: { id, organizationId } });
  if (!product) return null;
  await prisma.product.delete({ where: { id } });
  return product;
}
