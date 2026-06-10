import { route, ok, requireOrg, requireFields, body } from "@/shared/lib/api";
import { generateSlots } from "@/features/usecases/services/useCaseService";
import type { GenerateSlotsInput } from "@/features/usecases/types";

export const POST = route(async (req) => {
  const input = await body<GenerateSlotsInput>(req);
  requireFields(input, ["organizationId", "serviceName", "daysOfWeek", "timeRanges"]);
  await requireOrg(input.organizationId, "ADMIN");
  return ok(await generateSlots(input), { status: 201 });
});
