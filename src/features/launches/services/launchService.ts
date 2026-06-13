/**
 * launchService.ts — Flash Sale / Launch Countdown engine.
 *
 * A Launch is a time-boxed broadcast with five auto-generated countdown steps
 * (D-3, D-1, 5-min warning, Go Live, Last Chance). The cron worker
 * processDueLaunchSteps() fires each step at its computed sendAt time.
 *
 * Status lifecycle:
 *   draft → scheduled (via activateLaunch) → ended (after all steps fire)
 */
import { ApiError } from "@/shared/lib/api";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import * as contactRepo from "@/features/contacts/repositories/contactRepo";
import * as repo from "../repositories/launchRepo";
import type { LaunchInput, LaunchUpdateInput } from "../types";

// ─── Default step definitions ─────────────────────────────────────────────────

interface StepTemplate {
  label: string;
  offsetMinutes: number;
  buildMessage: (name: string, url: string) => string;
}

const DEFAULT_STEPS: StepTemplate[] = [
  {
    label: "D-3 Teaser",
    offsetMinutes: -4320,
    buildMessage: (name) =>
      `🚀 Something big is coming! We're dropping *${name}* — reply EARLY for first access. 🔥`,
  },
  {
    label: "D-1 Reminder",
    offsetMinutes: -1440,
    buildMessage: (name) =>
      `⏰ Tomorrow! *${name}* drops tomorrow. Limited stock — stay tuned! 👀`,
  },
  {
    label: "5-Min Warning",
    offsetMinutes: -5,
    buildMessage: (name, url) =>
      `🔴 5 MINUTES! *${name}* goes LIVE right now!\n\n${url}`,
  },
  {
    label: "Go Live",
    offsetMinutes: 0,
    buildMessage: (name, url) =>
      `🛒 *IT'S LIVE!*\n\n*${name}* is available NOW!\n\n${url}`,
  },
  {
    label: "Last Chance",
    offsetMinutes: 120,
    buildMessage: (name, url) =>
      `⚡ Last few pieces of *${name}* remaining!\n\n${url}`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeSendAt(launchAt: Date, offsetMinutes: number): Date {
  return new Date(launchAt.getTime() + offsetMinutes * 60_000);
}

function buildDefaultSteps(
  launchId: string,
  organizationId: string,
  launchAt: Date,
  name: string,
  productUrl: string | null | undefined
) {
  const url = productUrl || "our store";
  return DEFAULT_STEPS.map((t) => ({
    launchId,
    organizationId,
    label: t.label,
    offsetMinutes: t.offsetMinutes,
    message: t.buildMessage(name, url),
    sendAt: computeSendAt(launchAt, t.offsetMinutes),
    status: "pending",
    sentCount: 0,
  }));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createLaunch(orgId: string, input: LaunchInput) {
  const launchAt = new Date(input.launchAt);
  if (isNaN(launchAt.getTime())) {
    throw new ApiError("launchAt must be a valid ISO-8601 date string", 400);
  }

  const launch = await repo.createLaunch({
    name: input.name,
    description: input.description ?? null,
    productUrl: input.productUrl ?? null,
    launchAt,
    targetTag: input.targetTag ?? null,
    organizationId: orgId,
    status: "draft",
  });

  const steps = buildDefaultSteps(
    launch.id,
    orgId,
    launchAt,
    launch.name,
    launch.productUrl
  );
  await repo.createLaunchSteps(steps);

  return repo.getLaunch(launch.id, orgId);
}

export function getLaunches(orgId: string) {
  return repo.listLaunches(orgId);
}

export async function getLaunch(id: string, orgId: string) {
  const launch = await repo.getLaunch(id, orgId);
  if (!launch) throw new ApiError("Launch not found", 404);
  return launch;
}

export async function updateLaunch(
  id: string,
  orgId: string,
  input: LaunchUpdateInput
) {
  const existing = await repo.getLaunch(id, orgId);
  if (!existing) throw new ApiError("Launch not found", 404);
  if (existing.status !== "draft") {
    throw new ApiError(
      "Only draft launches can be edited. Cancel and recreate to change a scheduled launch.",
      409
    );
  }

  const newLaunchAt = input.launchAt ? new Date(input.launchAt) : null;
  if (newLaunchAt && isNaN(newLaunchAt.getTime())) {
    throw new ApiError("launchAt must be a valid ISO-8601 date string", 400);
  }

  await repo.updateLaunch(id, orgId, {
    name: input.name ?? existing.name,
    description: input.description !== undefined ? input.description : existing.description,
    productUrl: input.productUrl !== undefined ? input.productUrl : existing.productUrl,
    launchAt: newLaunchAt ?? existing.launchAt,
    targetTag: input.targetTag !== undefined ? input.targetTag : existing.targetTag,
  });

  // If launchAt changed, recompute every step's sendAt accordingly.
  if (newLaunchAt) {
    await repo.recomputeStepSendAts(
      id,
      newLaunchAt,
      existing.steps.map((s) => ({ id: s.id, offsetMinutes: s.offsetMinutes }))
    );
  }

  return repo.getLaunch(id, orgId);
}

export async function activateLaunch(id: string, orgId: string) {
  const launch = await repo.getLaunch(id, orgId);
  if (!launch) throw new ApiError("Launch not found", 404);

  if (launch.launchAt <= new Date()) {
    throw new ApiError(
      "Cannot activate a launch whose launchAt is in the past. Update launchAt first.",
      400
    );
  }

  // Recompute sendAt for all steps so any drift from edits is resolved.
  await repo.recomputeStepSendAts(
    id,
    launch.launchAt,
    launch.steps.map((s) => ({ id: s.id, offsetMinutes: s.offsetMinutes }))
  );

  await repo.updateLaunch(id, orgId, { status: "scheduled" });

  return repo.getLaunch(id, orgId);
}

export async function deleteLaunch(id: string, orgId: string) {
  const launch = await repo.getLaunch(id, orgId);
  if (!launch) throw new ApiError("Launch not found", 404);
  if (launch.status !== "draft") {
    throw new ApiError(
      "Only draft launches can be deleted. A scheduled or ended launch is immutable for audit purposes.",
      409
    );
  }
  await repo.deleteLaunch(id, orgId);
}

// ─── Cron worker ──────────────────────────────────────────────────────────────

/**
 * processDueLaunchSteps — called by the cron route every minute (or similar).
 *
 * For each pending LaunchStep whose sendAt has arrived:
 *   1. Skip (mark "skipped") if the parent launch is still a draft.
 *   2. Resolve the target contact set: all contacts in the org, optionally
 *      narrowed by launch.targetTag.
 *   3. Send to each contact; tally successes.
 *   4. Mark the step "sent" with the actual sentCount.
 *   5. After all steps for a launch have finished, mark the launch "ended".
 *
 * Per-contact send errors are caught and logged individually so a single bad
 * phone number cannot abort the rest of the blast.
 */
export async function processDueLaunchSteps(): Promise<{ processed: number }> {
  const due = await repo.findDueLaunchSteps(new Date());
  let processed = 0;

  // Track which launches may have finished so we can flip them to "ended".
  const launchIds = new Set<string>();

  for (const step of due) {
    const { launch } = step;
    const orgId = launch.organizationId;

    // Draft launches are not yet activated — skip every step that fires.
    if (launch.status === "draft") {
      await repo.updateLaunchStep(step.id, { status: "skipped" });
      launchIds.add(launch.id);
      processed++;
      continue;
    }

    // Resolve the contact list, optionally filtered by tag.
    const contacts = await contactRepo.findByOrgAndTag(orgId, launch.targetTag);

    let sent = 0;
    for (const contact of contacts) {
      try {
        const result = await sendWhatsAppMessage(
          { to: formatPhoneNumber(contact.phone), text: step.message },
          orgId
        );
        if (result.ok) sent++;
      } catch (err) {
        // One bad phone must not abort the whole blast — log and continue.
        console.error(
          `[Launches] Failed to send step "${step.label}" to contact ${contact.id}:`,
          err
        );
      }
    }

    await repo.updateLaunchStep(step.id, { status: "sent", sentCount: sent });
    launchIds.add(launch.id);
    processed++;
  }

  // Flip each touched launch to "ended" once all its steps are done.
  for (const launchId of launchIds) {
    const finished = await repo.allStepsFinished(launchId);
    if (finished) {
      // Retrieve organizationId without reloading the full steps list.
      const launch = await repo.findLaunchById(launchId);
      if (launch && launch.status !== "ended") {
        await repo.updateLaunch(launchId, launch.organizationId, {
          status: "ended",
        });
      }
    }
  }

  return { processed };
}
