import { route, ok, requireOrg, requireFields, body } from "@/shared/lib/api";
import { updateSettings } from "@/features/usecases/services/useCaseService";
import type { UseCaseSettingsInput } from "@/features/usecases/types";

export const POST = route(async (req) => {
  const input = await body<UseCaseSettingsInput>(req);
  requireFields(input, ["organizationId"]);
  await requireOrg(input.organizationId, "ADMIN");
  return ok({ success: true, organization: await updateSettings(input) });
});
