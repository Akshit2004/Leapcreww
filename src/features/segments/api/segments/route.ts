import { route, ok, requireOrg, requireFields, body } from "@/shared/lib/api";
import { listSegments, createSegment, previewCount } from "@/features/segments/services/segmentService";
import type { SegmentInput } from "@/features/segments/types";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  return ok({ segments: await listSegments(orgId) });
});

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const input = await body<SegmentInput & { preview?: boolean }>(req);
  input.organizationId = orgId;
  requireFields(input, ["name", "rules"]);

  // ?preview returns a live audience count without persisting (segment builder UI).
  if (input.preview) {
    return ok({ count: await previewCount(orgId, input.rules) });
  }
  return ok({ segment: await createSegment(input) }, { status: 201 });
});
