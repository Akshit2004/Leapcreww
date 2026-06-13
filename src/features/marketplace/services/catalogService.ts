import { ApiError } from "@/shared/lib/api";
import * as productRepo from "../repositories/productRepo";
import type { ProductCreateInput, ProductUpdateInput } from "../repositories/productRepo";

export type { ProductUpdateInput };

/** Public storefront listing: active products + their categories for an org. */
export async function listCatalog(organizationId: string, category?: string) {
  const [products, categoryRows] = await Promise.all([
    productRepo.listActiveByOrg(organizationId, category),
    productRepo.listActiveCategories(organizationId),
  ]);

  return {
    products,
    categories: [...new Set(categoryRows.map((c) => c.category))],
  };
}

export interface CreateProductInput {
  sku?: string | null;
  name: string;
  description?: string;
  price: number;
  images?: string[];
  category: string;
  stock?: number;
}

export async function createProduct(organizationId: string, input: CreateProductInput) {
  const data: ProductCreateInput = {
    sku: input.sku || null,
    name: input.name,
    description: input.description || "",
    price: input.price,
    images: input.images || [],
    category: input.category,
    stock: input.stock ?? 0,
    organizationId,
  };
  const product = await productRepo.create(data);

  // Sync to Meta Catalog (best-effort, fire-and-forget).
  import("@/shared/lib/meta-catalog").then((m) => m.syncProductToMetaCatalog(product.id));

  return product;
}

export async function getProduct(organizationId: string, id: string) {
  const product = await productRepo.findByIdInOrg(id, organizationId);
  if (!product) throw new ApiError("Product not found", 404);
  return product;
}

export async function updateProduct(organizationId: string, id: string, input: ProductUpdateInput) {
  const product = await productRepo.updateInOrg(id, organizationId, {
    sku: input.sku !== undefined ? input.sku : undefined,
    name: input.name,
    description: input.description,
    price: input.price,
    images: input.images,
    category: input.category,
    stock: input.stock,
    isActive: input.isActive,
  });
  if (!product) throw new ApiError("Product not found", 404);

  // Sync to Meta Catalog (best-effort, fire-and-forget).
  import("@/shared/lib/meta-catalog").then((m) => m.syncProductToMetaCatalog(product.id));

  return product;
}

export async function deleteProduct(organizationId: string, id: string) {
  const product = await productRepo.deleteInOrg(id, organizationId);
  if (!product) throw new ApiError("Product not found", 404);

  // Remove from Meta Catalog (best-effort, fire-and-forget).
  import("@/shared/lib/meta-catalog").then((m) => m.deleteProductFromMetaCatalog(product.id, product.organizationId, product.sku));
}
