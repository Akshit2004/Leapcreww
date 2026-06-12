import { route, ok, requireOrg, requireFields, body } from "@/shared/lib/api";
import { createLaunch, getLaunches } from "../../services/launchService";
import type { LaunchInput } from "../../types";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  return ok({ launches: await getLaunches(orgId) });
});

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const input = await body<LaunchInput>(req);
  requireFields(input, ["name", "launchAt"]);
  return ok({ launch: await createLaunch(orgId, input) }, { status: 201 });
});
