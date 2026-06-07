import { route, ok, requirePlatformAdmin, requireFields, body } from "@/shared/lib/api";
import { createPartner } from "../../services/partnerService";
import type { PartnerInput } from "../../types";

// Provisioning a partner is a cross-tenant platform-admin action — gated by the
// PLATFORM_ADMIN_EMAILS allowlist, not any per-org role.
export const POST = route(async (req) => {
  await requirePlatformAdmin();
  const input = await body<PartnerInput>(req);
  requireFields(input, ["name", "slug"]);
  return ok({ partner: await createPartner(input) }, { status: 201 });
});
