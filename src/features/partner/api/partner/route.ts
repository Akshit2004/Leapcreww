import { route, ok, requireSession, requireFields, body } from "@/shared/lib/api";
import { createPartner } from "../../services/partnerService";
import type { PartnerInput } from "../../types";

// Provisioning a partner is a platform-admin action; tighten this guard once
// a super-admin role exists. For now it requires an authenticated session.
export const POST = route(async (req) => {
  await requireSession();
  const input = await body<PartnerInput>(req);
  requireFields(input, ["name", "slug"]);
  return ok({ partner: await createPartner(input) }, { status: 201 });
});
