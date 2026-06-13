/** launchRepo.ts — Prisma access for launches and launch steps. */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

// ─── Reads ───────────────────────────────────────────────────────────────────

export function listLaunches(organizationId: string) {
  return prisma.launch.findMany({
    where: { organizationId },
    include: { steps: { orderBy: { sendAt: "asc" } } },
    orderBy: { launchAt: "desc" },
  });
}

export function getLaunch(id: string, organizationId: string) {
  return prisma.launch.findFirst({
    where: { id, organizationId },
    include: { steps: { orderBy: { sendAt: "asc" } } },
  });
}

/**
 * Find all pending launch steps whose sendAt has arrived.
 * Includes the parent launch so the cron worker can check status and
 * resolve the organizationId without a second query.
 */
export function findDueLaunchSteps(now: Date) {
  return prisma.launchStep.findMany({
    where: { status: "pending", sendAt: { lte: now } },
    include: { launch: true },
    orderBy: { sendAt: "asc" },
  });
}

/**
 * Look up a launch by id without an organizationId filter. Used by the cron
 * worker to resolve which org a finished launch belongs to before flipping
 * its status — the id itself comes from a previously org-scoped query.
 */
export function findLaunchById(id: string) {
  return prisma.launch.findUnique({
    where: { id },
    select: { id: true, organizationId: true, status: true },
  });
}

// ─── Writes ──────────────────────────────────────────────────────────────────

export function createLaunch(data: Prisma.LaunchUncheckedCreateInput) {
  return prisma.launch.create({ data });
}

export function createLaunchSteps(steps: Prisma.LaunchStepUncheckedCreateInput[]) {
  return prisma.launchStep.createMany({ data: steps });
}

export function updateLaunch(
  id: string,
  organizationId: string,
  data: Prisma.LaunchUncheckedUpdateInput
) {
  return prisma.launch.update({ where: { id }, data });
}

export function deleteLaunch(id: string, organizationId: string) {
  return prisma.launch.delete({ where: { id } });
}

/**
 * Recompute all step sendAt values for a launch in a single transaction.
 * Used when launchAt is changed on an edit, or when activating a launch.
 */
export async function recomputeStepSendAts(
  launchId: string,
  launchAt: Date,
  steps: Array<{ id: string; offsetMinutes: number }>
) {
  await prisma.$transaction(
    steps.map((s) =>
      prisma.launchStep.update({
        where: { id: s.id },
        data: { sendAt: new Date(launchAt.getTime() + s.offsetMinutes * 60_000) },
      })
    )
  );
}

export function updateLaunchStep(
  id: string,
  data: Prisma.LaunchStepUncheckedUpdateInput
) {
  return prisma.launchStep.update({ where: { id }, data });
}

/** Check whether every step for a launch has been sent or skipped. */
export async function allStepsFinished(launchId: string): Promise<boolean> {
  const pending = await prisma.launchStep.count({
    where: { launchId, status: "pending" },
  });
  return pending === 0;
}
