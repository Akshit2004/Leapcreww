/** sequenceRepo.ts — Prisma access for sequences, steps and enrollments. */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export function listSequences(organizationId: string) {
  return prisma.sequence.findMany({
    where: { organizationId },
    include: { steps: { orderBy: { order: "asc" } }, segment: true },
    orderBy: { createdAt: "desc" },
  });
}

export function createSequence(
  data: Prisma.SequenceUncheckedCreateInput,
  steps: Prisma.SequenceStepCreateWithoutSequenceInput[]
) {
  return prisma.sequence.create({
    data: { ...data, steps: { create: steps } },
    include: { steps: true },
  });
}

export function findActiveSequencesByTrigger(organizationId: string, trigger: string) {
  return prisma.sequence.findMany({
    where: { organizationId, trigger, status: "active" },
    include: { steps: { orderBy: { order: "asc" } } },
  });
}

export function findSequenceWithSteps(id: string) {
  return prisma.sequence.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: "asc" } } },
  });
}

export function createEnrollment(data: Prisma.SequenceEnrollmentUncheckedCreateInput) {
  return prisma.sequenceEnrollment.create({ data });
}

export function findExistingEnrollment(sequenceId: string, contactId: string) {
  return prisma.sequenceEnrollment.findFirst({
    where: { sequenceId, contactId, status: "active" },
  });
}

export function findDueEnrollments(now: Date) {
  return prisma.sequenceEnrollment.findMany({
    where: { status: "active", nextRunAt: { lte: now } },
    include: { sequence: { include: { steps: { orderBy: { order: "asc" } } } }, contact: true },
    take: 50,
  });
}

export function updateEnrollment(id: string, data: Prisma.SequenceEnrollmentUncheckedUpdateInput) {
  return prisma.sequenceEnrollment.update({ where: { id }, data });
}
