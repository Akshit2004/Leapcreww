import { ok, route, requireOrg, body, ApiError } from "@/shared/lib/api";
import { getProduct, updateProduct, deleteProduct, type ProductUpdateInput } from "../../../services/catalogService";

/** GET /api/marketplace/products/:id?orgId=xxx */
export const GET = route(async (req, ctx) => {
  const { id } = ctx.params!;
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) throw new ApiError("Missing orgId", 400);
  await requireOrg(orgId, "AGENT");

  const product = await getProduct(orgId, id);
  return ok({ product });
});

/** PATCH /api/marketplace/products/:id?orgId=xxx */
export const PATCH = route(async (req, ctx) => {
  const { id } = ctx.params!;
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) throw new ApiError("Missing orgId", 400);
  await requireOrg(orgId, "ADMIN");

  const input = await body<ProductUpdateInput>(req);
  const product = await updateProduct(orgId, id, input);
  return ok({ product });
});

/** DELETE /api/marketplace/products/:id?orgId=xxx */
export const DELETE = route(async (req, ctx) => {
  const { id } = ctx.params!;
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) throw new ApiError("Missing orgId", 400);
  await requireOrg(orgId, "ADMIN");

  await deleteProduct(orgId, id);
  return ok({ status: "deleted" });
});
