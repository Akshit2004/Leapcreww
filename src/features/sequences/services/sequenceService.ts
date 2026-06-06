/**
 * sequenceService.ts — Drip / journey engine (T-03).
 *
 * enrollOnTrigger() is called from trigger points (tag added, ad click,
 * cart abandoned, signup, form submit). processDueEnrollments() is the cron
 * worker that advances each enrollment step-by-step over time.
 */
import type { SequenceStep } from "@prisma/client";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import * as repo from "../repositories/sequenceRepo";
import type { SequenceInput, SequenceTrigger } from "../types";

const minutesFromNow = (m: number) => new Date(Date.now() + m * 60 * 1000);

export function listSequences(organizationId: string) {
  return repo.listSequences(organizationId);
}

export function createSequence(input: SequenceInput) {
  return repo.createSequence(
    {
      name: input.name,
      trigger: input.trigger,
      triggerConfig: (input.triggerConfig as object) ?? undefined,
      organizationId: input.organizationId,
      segmentId: input.segmentId || null,
    },
    input.steps.map((s) => ({
      order: s.order,
      delayMinutes: s.delayMinutes,
      actionType: s.actionType,
      templateName: s.templateName,
      message: s.message,
      conditions: (s.conditions as object) ?? undefined,
    }))
  );
}

/**
 * Enroll a contact into every active sequence matching a trigger.
 * Idempotent per (sequence, contact) while an enrollment is active.
 */
export async function enrollOnTrigger(
  organizationId: string,
  trigger: SequenceTrigger,
  contactId: string
) {
  const sequences = await repo.findActiveSequencesByTrigger(organizationId, trigger);
  for (const seq of sequences) {
    if (!seq.steps.length) continue;

    // Check segment restrictions if defined
    if (seq.segmentId) {
      const { prisma } = await import("@/shared/lib/prisma");
      const segment = await prisma.segment.findUnique({
        where: { id: seq.segmentId },
      });
      if (!segment) continue;

      const { buildSegmentWhere } = await import("@/features/segments/services/segmentRules");
      const where = buildSegmentWhere(organizationId, segment.rules as any);

      const match = await prisma.contact.findFirst({
        where: {
          id: contactId,
          ...where,
        },
      });
      if (!match) continue;
    }

    const existing = await repo.findExistingEnrollment(seq.id, contactId);
    if (existing) continue;
    await repo.createEnrollment({
      sequenceId: seq.id,
      contactId,
      organizationId,
      currentStep: 0,
      status: "active",
      nextRunAt: minutesFromNow(seq.steps[0].delayMinutes),
    });
  }
}

async function executeStep(step: SequenceStep, phone: string, organizationId: string) {
  if (step.actionType === "send_template" && step.templateName) {
    await sendWhatsAppMessage(
      { to: phone, template: { name: step.templateName, language: { code: "en_US" } } },
      organizationId
    );
  } else if (step.actionType === "send_message" && step.message) {
    await sendWhatsAppMessage({ to: phone, text: step.message }, organizationId);
  }
  // "add_tag" / "branch" handled by future iterations (see docs T-03).
}

/** Cron worker: run all enrollments whose nextRunAt has arrived, one step each. */
export async function processDueEnrollments() {
  const due = await repo.findDueEnrollments(new Date());
  let advanced = 0;

  for (const enrollment of due) {
    const steps = enrollment.sequence.steps;
    const step = steps[enrollment.currentStep];
    if (!step) {
      await repo.updateEnrollment(enrollment.id, { status: "completed", nextRunAt: null });
      continue;
    }

    try {
      await executeStep(step, formatPhoneNumber(enrollment.contact.phone), enrollment.organizationId);
    } catch (err) {
      console.error(`[Sequence] step failed for enrollment ${enrollment.id}:`, err);
    }

    const nextIndex = enrollment.currentStep + 1;
    const nextStep = steps[nextIndex];
    if (nextStep) {
      await repo.updateEnrollment(enrollment.id, {
        currentStep: nextIndex,
        nextRunAt: minutesFromNow(nextStep.delayMinutes),
      });
    } else {
      await repo.updateEnrollment(enrollment.id, { status: "completed", nextRunAt: null });
    }
    advanced++;
  }

  return { advanced, scanned: due.length };
}
