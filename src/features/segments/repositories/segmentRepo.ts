/** segmentRepo.ts — Prisma access for segments + audience resolution. */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";
import { buildSegmentWhere } from "../services/segmentRules";
import type { SegmentRules } from "../types";

export function listSegments(organizationId: string) {
  return prisma.segment.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
}

export function createSegment(data: Prisma.SegmentUncheckedCreateInput) {
  return prisma.segment.create({ data });
}

export function deleteSegment(id: string) {
  return prisma.segment.delete({ where: { id } });
}

export function findSegment(id: string) {
  return prisma.segment.findUnique({ where: { id } });
}

/** Resolve the contacts matched by a segment's rules. */
export function resolveAudience(organizationId: string, rules: SegmentRules) {
  return prisma.contact.findMany({ where: buildSegmentWhere(organizationId, rules) });
}

export function countAudience(organizationId: string, rules: SegmentRules) {
  return prisma.contact.count({ where: buildSegmentWhere(organizationId, rules) });
}
