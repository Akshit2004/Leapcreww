/**
 * sequenceService.ts — Drip / journey engine (T-03).
 *
 * enrollOnTrigger() is called from trigger points (tag added, ad click,
 * cart abandoned, signup, form submit). processDueEnrollments() is the cron
 * worker that advances each enrollment step-by-step over time.
 */
import type { SequenceStep, Contact } from "@prisma/client";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import { recordTouch } from "@/features/analytics/services/attribution";
import { recordUsage } from "@/features/billing/services/billingService";
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
 * `triggerMeta.tag` narrows tag_added sequences: only sequences whose
 * triggerConfig.tag matches are enrolled.
 */
export async function enrollOnTrigger(
  organizationId: string,
  trigger: SequenceTrigger,
  contactId: string,
  triggerMeta?: { tag?: string }
) {
  const sequences = await repo.findActiveSequencesByTrigger(organizationId, trigger);
  for (const seq of sequences) {
    if (!seq.steps.length) continue;

    // For tag_added sequences that specify a tag filter, enforce it.
    if (trigger === "tag_added" && triggerMeta?.tag) {
      const config = seq.triggerConfig as Record<string, unknown> | null;
      if (config?.tag && config.tag !== triggerMeta.tag) continue;
    }

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

function resolveMessageVariables(text: string, contact: Contact): string {
  const attrs = (contact.attributes as Record<string, any>) || {};
  return text
    .replace(/\{\{contact\.name\}\}/g, contact.name || "")
    .replace(/\{\{contact\.phone\}\}/g, contact.phone || "")
    .replace(/\{\{cart\.total\}\}/g, attrs.cart_total ? `₹${attrs.cart_total}` : "")
    .replace(/\{\{cart\.checkout_url\}\}/g, attrs.cart_checkout_url || attrs.shopify_checkout_url || "")
    .replace(/\{\{cart\.items_list\}\}/g, attrs.cart_items || "");
}

async function executeStep(step: SequenceStep, contact: Contact, organizationId: string) {
  const phone = formatPhoneNumber(contact.phone);
  
  // 1. Session check: active if contact interacted within last 24h
  const lastActive = contact.lastActiveAt ? new Date(contact.lastActiveAt).getTime() : 0;
  const isSessionActive = (Date.now() - lastActive) <= 24 * 60 * 60 * 1000;

  const attrs = (contact.attributes as Record<string, any>) || {};

  // Resolve text variable placeholders
  const resolvedMessage = step.message ? resolveMessageVariables(step.message, contact) : "";

  // Track what actually went out so we can log it to chat history + record an
  // attribution touch (D-04). Sequence sends were previously invisible in the
  // Message table, breaking both live-chat history and revenue attribution.
  let sentOk = false;
  let sentPreview = "";

  if (step.actionType === "send_message") {
    if (isSessionActive) {
      // Session is active: safe to send free-form message
      const r = await sendWhatsAppMessage({ to: phone, text: resolvedMessage }, organizationId);
      sentOk = r.ok;
      if (r.ok) sentPreview = resolvedMessage;
    } else {
      // Session is expired: promote to cart_recovery template
      console.log(`[Sequence Fallback] Contact ${contact.name} out of 24h window. Promoting message step to 'cart_recovery' template.`);
      
      const { prisma } = await import("@/shared/lib/prisma");
      const dbTemplate = await prisma.template.findFirst({
        where: { name: "cart_recovery", organizationId, metaStatus: "approved" },
      });

      const templateName = dbTemplate?.name || "cart_recovery";

      const r = await sendWhatsAppMessage(
        {
          to: phone,
          template: {
            name: templateName,
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: contact.name },
                  { type: "text", text: attrs.cart_checkout_url || attrs.shopify_checkout_url || "https://wappflow.com" },
                ],
              },
            ],
          },
        },
        organizationId
      );

      sentOk = r.ok;
      if (r.ok) {
        sentPreview = `[Template: ${templateName}]`;
      } else {
        // Log warning in DB system logs
        await prisma.systemLog.create({
          data: {
            type: "campaign",
            message: `⚠️ Skipped sequence step for ${contact.name}: Contact is outside the 24h window and no approved 'cart_recovery' template was successfully sent.`,
            organizationId,
          },
        });
      }
    }
  } else if (step.actionType === "send_template" && step.templateName) {
    const templateName = step.templateName;
    const bodyParameters = [];

    if (templateName === "cart_recovery") {
      bodyParameters.push({ type: "text" as const, text: contact.name });
      bodyParameters.push({ type: "text" as const, text: attrs.cart_checkout_url || attrs.shopify_checkout_url || "https://wappflow.com" });
    } else if (templateName === "order_confirmation") {
      bodyParameters.push({ type: "text" as const, text: contact.name });
      bodyParameters.push({ type: "text" as const, text: attrs.cart_total ? `₹${attrs.cart_total}` : "" });
    } else if (templateName === "order_shipped") {
      bodyParameters.push({ type: "text" as const, text: contact.name });
      bodyParameters.push({ type: "text" as const, text: attrs.last_tracking_carrier || "DHL" });
      bodyParameters.push({ type: "text" as const, text: attrs.last_tracking_url || "" });
    } else if (templateName === "review_request") {
      bodyParameters.push({ type: "text" as const, text: contact.name });
    } else if (templateName === "win_back") {
      bodyParameters.push({ type: "text" as const, text: contact.name });
    } else {
      // Default fallback parameter mappings
      bodyParameters.push({ type: "text" as const, text: contact.name });
      bodyParameters.push({ type: "text" as const, text: attrs.cart_checkout_url || attrs.shopify_checkout_url || attrs.last_tracking_url || "" });
    }

    const r = await sendWhatsAppMessage(
      {
        to: phone,
        template: {
          name: templateName,
          language: { code: "en_US" },
          components: [
            {
              type: "body",
              parameters: bodyParameters,
            },
          ],
        },
      },
      organizationId
    );
    sentOk = r.ok;
    if (r.ok) sentPreview = `[Template: ${templateName}]`;
  }

  // Log the sequence send to chat history + record a sequence attribution touch.
  if (sentOk && sentPreview) {
    const { prisma } = await import("@/shared/lib/prisma");
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const preview = sentPreview.length > 50 ? sentPreview.slice(0, 47) + "..." : sentPreview;

    await prisma.message.create({
      data: {
        sender: "agent",
        text: preview,
        contactId: contact.id,
        organizationId,
      },
    });
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastMessage: preview, lastMessageTime: timeStr },
    });

    // Debit wallet for the successful send (service for free-form, marketing for templates).
    const billingCategory = step.actionType === "send_template" ? "marketing" : "service";
    await recordUsage({ type: "message", category: billingCategory, organizationId }).catch(() => {});

    await recordTouch({
      organizationId,
      contactId: contact.id,
      channel: "sequence",
      sequenceId: step.sequenceId,
    });
  }
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
      await executeStep(step, enrollment.contact, enrollment.organizationId);
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

/**
 * Cron sweep: WhatsApp marketplace abandoned-cart detection.
 *
 * Unlike Shopify (which fires a `checkouts/create` webhook before an order),
 * a native WhatsApp catalog cart immediately becomes a pending/unpaid Order.
 * We therefore treat an Order that is still `pending` / unpaid past a threshold
 * (default 60 min) as an abandoned cart and enroll the contact into any active
 * `cart_abandoned` recovery sequence. Paying the order flips `cart_recovered`
 * (see markCartRecovered) which excludes it from future sweeps.
 *
 * Idempotent: a per-contact `cart_recovery_enrolled` attribute flag prevents
 * re-enrolling the same cart on every cron tick (and after the drip completes).
 */
export async function sweepAbandonedCarts(thresholdMinutes = 60) {
  const { prisma } = await import("@/shared/lib/prisma");
  const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  const staleOrders = await prisma.order.findMany({
    where: {
      status: "pending",
      paymentStatus: "pending",
      createdAt: { lt: cutoff },
      contact: { tags: { has: "WhatsApp-Cart" } },
    },
    include: { contact: true },
    orderBy: { createdAt: "desc" },
  });

  let enrolled = 0;
  const handledContacts = new Set<string>();

  for (const order of staleOrders) {
    if (handledContacts.has(order.contactId)) continue;
    handledContacts.add(order.contactId);

    const attrs = (order.contact.attributes as Record<string, any>) || {};
    if (attrs.cart_recovered === true || attrs.cart_recovery_enrolled === true) continue;

    const d = new Date();
    const timestampStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;

    attrs.cart_abandoned_at = attrs.cart_abandoned_at || timestampStr;
    attrs.cart_recovery_enrolled = true;
    await prisma.contact.update({
      where: { id: order.contactId },
      data: { attributes: attrs },
    });

    await enrollOnTrigger(order.organizationId, "cart_abandoned", order.contactId);

    await prisma.systemLog.create({
      data: {
        type: "integration",
        message: `WhatsApp Marketplace: Cart abandoned by ${order.contact.name} (₹${attrs.cart_total || "0.00"}). Scheduling drip recovery sequence.`,
        organizationId: order.organizationId,
      },
    });

    await prisma.message.create({
      data: {
        sender: "system",
        text: `[Marketplace Automations] Cart abandoned (₹${attrs.cart_total || "0.00"}). Enrolled ${order.contact.name} into the Cart Recovery sequence.`,
        contactId: order.contactId,
        organizationId: order.organizationId,
      },
    });

    enrolled++;
  }

  return { enrolled, scanned: staleOrders.length };
}

/**
 * Mark a contact's cart as recovered and stop any active abandoned-cart drip.
 * Safe to call on any successful payment (Shopify, marketplace, reorder) — it
 * is idempotent and a no-op when there is nothing to recover.
 */
export async function markCartRecovered(organizationId: string, contactId: string) {
  const { prisma } = await import("@/shared/lib/prisma");

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return;

  const attrs = (contact.attributes as Record<string, any>) || {};
  if (attrs.cart_recovered !== true) {
    attrs.cart_recovered = true;
    await prisma.contact.update({
      where: { id: contactId },
      data: { attributes: attrs },
    });
  }

  const activeEnrollments = await prisma.sequenceEnrollment.findMany({
    where: {
      contactId,
      organizationId,
      status: "active",
      sequence: { trigger: "cart_abandoned" },
    },
  });
  for (const enrollment of activeEnrollments) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: { status: "completed", nextRunAt: null },
    });
  }
}
