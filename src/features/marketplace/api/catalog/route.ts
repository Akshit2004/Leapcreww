import { ok, route, requireOrg, body, requireFields, ApiError } from "@/shared/lib/api";
import { listCatalog, createProduct, type CreateProductInput } from "../../services/catalogService";

/** GET /api/marketplace/catalog?orgId=xxx&category=yyy — public storefront listing. */
export const GET = route(async (req) => {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) throw new ApiError("Missing orgId", 400);
  const category = searchParams.get("category") || undefined;

  const result = await listCatalog(orgId, category);
  return ok(result);
});

/** POST /api/marketplace/catalog — create a product (admin only). */
export const POST = route(async (req) => {
  const input = await body<CreateProductInput & { organizationId: string }>(req);
  requireFields(input, ["name", "price", "category", "organizationId"]);
  await requireOrg(input.organizationId, "ADMIN");

  const product = await createProduct(input.organizationId, input);
  return ok({ product }, { status: 201 });
});
