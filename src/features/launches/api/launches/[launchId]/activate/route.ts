import { route, ok, requireOrg } from "@/shared/lib/api";
import { activateLaunch } from "../../../../services/launchService";

export const POST = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const launchId = params?.launchId as string;
  return ok({ launch: await activateLaunch(launchId, orgId) });
});
