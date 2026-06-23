import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface AutomationStep {
  type: "send_template" | "add_tag" | "remove_tag";
  templateName?: string;
  templateParams?: string[];
  tag?: string;
  delayMinutes: number;
}

export interface AutomationCreate {
  name: string;
  organizationId: string;
  triggerType: string;
  triggerConfig: Prisma.InputJsonValue;
  steps?: Prisma.InputJsonValue;
  templateName?: string;
  templateParams?: string[];
}

export function listByOrg(organizationId: string) {
  return prisma.automation.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
}

export function findById(id: string, organizationId: string) {
  return prisma.automation.findFirst({ where: { id, organizationId } });
}

export function create(data: AutomationCreate) {
  return prisma.automation.create({
    data: {
      name: data.name,
      organizationId: data.organizationId,
      triggerType: data.triggerType,
      triggerConfig: data.triggerConfig,
      steps: data.steps ?? [],
      templateName: data.templateName ?? "",
      templateParams: (data.templateParams ?? []) as Prisma.InputJsonValue,
    },
  });
}

export function update(
  id: string,
  organizationId: string,
  data: {
    name?: string;
    triggerType?: string;
    triggerConfig?: Prisma.InputJsonValue;
    steps?: Prisma.InputJsonValue;
    templateName?: string;
    templateParams?: string[];
    isActive?: boolean;
  }
) {
  return prisma.automation.update({ where: { id, organizationId }, data });
}

export function remove(id: string, organizationId: string) {
  return prisma.automation.deleteMany({ where: { id, organizationId } });
}

export function findActiveByTrigger(organizationId: string, triggerType: string) {
  return prisma.automation.findMany({
    where: { organizationId, triggerType, isActive: true },
  });
}

export function bumpRunCount(id: string) {
  return prisma.automation.update({
    where: { id },
    data: { runCount: { increment: 1 }, lastRunAt: new Date() },
  });
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export function enqueueStep(data: {
  automationId: string;
  contactId: string;
  contactPhone: string;
  contactName: string;
  stepIndex: number;
  stepData: Prisma.InputJsonValue;
  scheduledAt: Date;
  organizationId: string;
}) {
  return prisma.automationQueue.create({ data });
}

export function dequeueDue(organizationId: string) {
  return prisma.automationQueue.findMany({
    where: { organizationId, processed: false, scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });
}

export function markQueueProcessed(id: string) {
  return prisma.automationQueue.update({ where: { id }, data: { processed: true } });
}
