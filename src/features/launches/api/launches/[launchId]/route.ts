import { route, ok, requireOrg, body } from "@/shared/lib/api";
import { getLaunch, updateLaunch, deleteLaunch } from "../../../services/launchService";
import type { LaunchUpdateInput } from "../../../types";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  const launchId = params?.launchId as string;
  return ok({ launch: await getLaunch(launchId, orgId) });
});

export const PATCH = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const launchId = params?.launchId as string;
  const input = await body<LaunchUpdateInput>(req);
  return ok({ launch: await updateLaunch(launchId, orgId, input) });
});

export const DELETE = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const launchId = params?.launchId as string;
  await deleteLaunch(launchId, orgId);
  return ok({ success: true });
});
