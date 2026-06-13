import { ok, route, requireOrg, body, requireFields } from "@/shared/lib/api";
import { disconnectWhatsapp } from "../../services/whatsappConnectionService";

export const POST = route(async (req) => {
  const input = await body<{ orgId: string }>(req);
  requireFields(input, ["orgId"]);
  await requireOrg(input.orgId, "ADMIN");

  await disconnectWhatsapp(input.orgId);
  return ok({ ok: true });
});
