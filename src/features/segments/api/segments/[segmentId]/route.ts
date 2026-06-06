import { route, ok, requireOrg } from "@/shared/lib/api";
import { deleteSegment } from "@/features/segments/services/segmentService";

export const DELETE = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const segmentId = params?.segmentId as string;
  await deleteSegment(segmentId);
  return ok({ success: true });
});
