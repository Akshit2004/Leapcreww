import { requireOrg, ok, route } from "@/shared/lib/api";
import { updatePhoneNumber, deletePhoneNumber, type UpdatePhoneNumberInput } from "../../../services/phoneNumberService";

export const PATCH = route(async (req, ctx) => {
  const { orgId, id } = ctx.params!;
  await requireOrg(orgId, "ADMIN");
  const input = (await req.json()) as UpdatePhoneNumberInput;
  const updated = await updatePhoneNumber(orgId, id, input);
  return ok(updated);
});

export const DELETE = route(async (_req, ctx) => {
  const { orgId, id } = ctx.params!;
  await requireOrg(orgId, "ADMIN");
  await deletePhoneNumber(orgId, id);
  return ok({ deleted: true });
});
