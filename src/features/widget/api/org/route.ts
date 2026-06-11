import { route, ok, requireOrg, body } from "@/shared/lib/api";
import { getOrCreateConfig, updateConfig } from "../../services/widgetService";
import type { UpdateWidgetInput } from "../../types";

/** GET /api/org/[orgId]/widget — config + embed key (created on first load). */
export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  return ok({ widget: await getOrCreateConfig(orgId) });
});

/** PUT /api/org/[orgId]/widget — update the configurator fields. */
export const PUT = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const input = await body<UpdateWidgetInput>(req);
  return ok({ widget: await updateConfig(orgId, input) });
});
