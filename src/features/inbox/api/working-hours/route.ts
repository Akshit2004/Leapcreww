import { requireOrg, ok, route } from "@/shared/lib/api";
import * as workingHoursService from "@/features/inbox/services/workingHoursService";
import type { WorkingHoursConfig } from "@/features/inbox/types";

export const GET = route(async (_req, ctx) => {
  const orgId = ctx.params!.orgId;
  await requireOrg(orgId);
  const config = await workingHoursService.getWorkingHours(orgId);
  return ok(config);
});

export const PUT = route(async (req, ctx) => {
  const orgId = ctx.params!.orgId;
  await requireOrg(orgId, "ADMIN");
  const input = await req.json() as Partial<WorkingHoursConfig>;
  const config = await workingHoursService.updateWorkingHours(orgId, input);
  return ok(config);
});
