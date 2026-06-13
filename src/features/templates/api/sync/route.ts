import { route, ok, requireOrg } from "@/shared/lib/api";
import { syncTemplatesFromMeta } from "@/features/templates/services/templateSyncService";

/** POST /api/org/[orgId]/templates/sync — pull templates from Meta into the local table. */
export const POST = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "AGENT");
  return ok(await syncTemplatesFromMeta(orgId));
});
