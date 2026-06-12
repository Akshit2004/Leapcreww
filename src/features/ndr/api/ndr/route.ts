/**
 * GET /api/org/[orgId]/ndr
 *
 * List NDR events for the authenticated org. Supports an optional `?status=`
 * query parameter to filter by status (e.g. `?status=pending`).
 *
 * Auth: session + AGENT role minimum (reads only).
 */
import { route, ok, requireOrg } from "@/shared/lib/api";
import { listNdrEvents } from "../../services/ndrService";

export const GET = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "AGENT");

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const events = await listNdrEvents(orgId, status ? { status } : undefined);
  return ok({ events });
});
