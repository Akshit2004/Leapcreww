/** flowRepo.ts — Prisma access for WhatsApp Flows (T-02). */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function listFlows(organizationId: string) {
  return prisma.flow.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
}

export function createFlow(data: Prisma.FlowUncheckedCreateInput) {
  return prisma.flow.create({ data });
}

export function setPublished(id: string, metaFlowId: string) {
  return prisma.flow.update({ where: { id }, data: { status: "published", metaFlowId } });
}

export function getFlowById(id: string, organizationId: string) {
  return prisma.flow.findUnique({ where: { id, organizationId } });
}
