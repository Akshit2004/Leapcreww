import { ok, route, requireOrg } from "@/shared/lib/api";
import { revokeKey } from "../../../services/apiKeyService";

export const DELETE = route(async (_req, ctx) => {
  const { orgId, keyId } = ctx.params!;
  await requireOrg(orgId, "ADMIN");
  await revokeKey(orgId, keyId);
  return ok({ revoked: true });
});
