import { requireOrg, ok, route } from "@/shared/lib/api";
import { listPhoneNumbers, createPhoneNumber, type CreatePhoneNumberInput } from "../../services/phoneNumberService";

export const GET = route(async (_req, ctx) => {
  const orgId = ctx.params!.orgId;
  await requireOrg(orgId);
  const numbers = await listPhoneNumbers(orgId);
  return ok({ phoneNumbers: numbers });
});

export const POST = route(async (req, ctx) => {
  const orgId = ctx.params!.orgId;
  await requireOrg(orgId, "ADMIN");
  const input = (await req.json()) as CreatePhoneNumberInput;
  const record = await createPhoneNumber(orgId, input);
  return ok(record, { status: 201 });
});
