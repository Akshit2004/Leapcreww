/** segmentService.ts — Segment CRUD + audience resolution (T-04). */
import { ApiError } from "@/shared/lib/api";
import * as repo from "../repositories/segmentRepo";
import type { SegmentInput, SegmentRules } from "../types";

export function listSegments(organizationId: string) {
  return repo.listSegments(organizationId);
}

export function createSegment(input: SegmentInput) {
  return repo.createSegment({
    name: input.name,
    rules: input.rules as unknown as object,
    organizationId: input.organizationId,
  });
}

export async function deleteSegment(id: string, organizationId: string) {
  // Scope the delete to the org so a member of one workspace cannot delete
  // another tenant's segment by passing its id (IDOR — Article III).
  const result = await repo.deleteSegment(id, organizationId);
  if (result.count === 0) throw new ApiError("Segment not found", 404);
}

/** Live count for a draft ruleset (used by the segment builder UI). */
export function previewCount(organizationId: string, rules: SegmentRules) {
  return repo.countAudience(organizationId, rules);
}

/** Resolve a saved segment's contacts; used by broadcast (T-04) + sequences (T-03). */
export async function resolveSegmentContacts(segmentId: string) {
  const segment = await repo.findSegment(segmentId);
  if (!segment) throw new Error("Segment not found");
  return repo.resolveAudience(segment.organizationId, segment.rules as unknown as SegmentRules);
}
