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

export function setMetaFlowId(id: string, metaFlowId: string) {
  return prisma.flow.update({ where: { id }, data: { metaFlowId } });
}

export function getFlowById(id: string, organizationId: string) {
  return prisma.flow.findUnique({ where: { id, organizationId } });
}

export function getFlowsEncryptionStatus(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { flowsPublicKeyUploaded: true },
  });
}

export function updateFlow(id: string, organizationId: string, data: Prisma.FlowUpdateInput) {
  return prisma.flow.updateMany({ where: { id, organizationId }, data });
}

export function deleteFlow(id: string, organizationId: string) {
  return prisma.flow.deleteMany({ where: { id, organizationId } });
}

export function setFlowsEncryptionUploaded(organizationId: string, privateKey: string) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: { flowsPrivateKey: privateKey, flowsPublicKeyUploaded: true },
  });
}

/** Find a flow's responses with the submitting contact's basic details. */
export function findFlowResponses(flowId: string, organizationId: string) {
  return prisma.flowResponse.findMany({
    where: { flowId, organizationId },
    include: {
      contact: {
        select: {
          name: true,
          phone: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
