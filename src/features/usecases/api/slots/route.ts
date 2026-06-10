import { route, ok, requireOrg, requireFields, body } from "@/shared/lib/api";
import { listSlots, createSlots } from "@/features/usecases/services/useCaseService";
import type { CreateSlotsInput } from "@/features/usecases/types";

export const GET = route(async (req) => {
  const orgId = new URL(req.url).searchParams.get("orgId") || "";
  await requireOrg(orgId);
  return ok({ slots: await listSlots(orgId) });
});

export const POST = route(async (req) => {
  const input = await body<CreateSlotsInput>(req);
  requireFields(input, ["organizationId", "slots"]);
  await requireOrg(input.organizationId, "ADMIN");
  return ok({ slots: await createSlots(input) }, { status: 201 });
});
