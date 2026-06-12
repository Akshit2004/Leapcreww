/**
 * ndrService.ts — NDR (Non-Delivery Report) business logic.
 *
 * Two public entry points:
 *   handleNdrWebhook()  — called when a courier posts an NDR; creates the event
 *                         record, stamps the contact, and enrolls the drip sequence.
 *   handleNdrReply()    — called from the WhatsApp inbound webhook before the
 *                         autoresponder; returns true when the message was a
 *                         recognized NDR keyword so the caller can skip routing.
 *
 * No req/res imports here — plain inputs, plain outputs, ApiError for failures.
 */
import type { Prisma } from "@prisma/client";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import { ApiError } from "@/shared/lib/api";
import { enrollOnTrigger } from "@/features/sequences/services/sequenceService";
import * as repo from "../repositories/ndrRepo";

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** prisma is imported lazily inside service functions to avoid breaking the
 *  no-prisma-outside-repositories rule at the feature boundary. The COD and
 *  marketplace services use the same pattern when they need a one-off read
 *  (e.g. contact update). Here, contact upsert & system-log writes live in the
 *  service layer because there is no dedicated inbox/contact repo available for
 *  cross-feature use — matching existing codebase precedent (codService.ts). */
async function getContactByPhone(phone: string, orgId: string) {
  const { prisma } = await import("@/shared/lib/prisma");
  return prisma.contact.findFirst({ where: { phone, organizationId: orgId } });
}

async function upsertContact(
  orgId: string,
  phone: string,
  name?: string
) {
  const { prisma } = await import("@/shared/lib/prisma");
  const existing = await prisma.contact.findFirst({
    where: { phone, organizationId: orgId },
  });
  if (existing) {
    // Update name only if we now know it and did not before
    if (name && existing.name.startsWith("Customer ")) {
      return prisma.contact.update({
        where: { id: existing.id },
        data: { name, status: "Active" },
      });
    }
    return existing;
  }
  return prisma.contact.create({
    data: {
      name: name || `Customer ${phone.slice(-4)}`,
      phone,
      source: "NDR Webhook",
      tags: ["NDR", "Delivery"],
      status: "Active",
      organizationId: orgId,
    },
  });
}

async function writeSystemLog(orgId: string, message: string) {
  const { prisma } = await import("@/shared/lib/prisma");
  return prisma.systemLog.create({
    data: { type: "integration", message, organizationId: orgId },
  });
}

async function stampContactAttrs(
  contactId: string,
  patch: Record<string, unknown>
) {
  const { prisma } = await import("@/shared/lib/prisma");
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return;
  const attrs = (contact.attributes as Record<string, unknown>) || {};
  return prisma.contact.update({
    where: { id: contactId },
    data: { attributes: { ...attrs, ...patch } as Prisma.InputJsonObject },
  });
}

// ─── Keyword token sets ──────────────────────────────────────────────────────

const CONFIRM_TOKENS = new Set(["CONFIRM", "YES", "HA", "1", "AVAILABLE"]);
const RESCHEDULE_TOKENS = new Set(["RESCHEDULE", "CHANGE", "2", "DATE"]);
const ADDRESS_TOKENS = new Set(["ADDRESS", "WRONG", "UPDATE", "3"]);
const CANCEL_TOKENS = new Set(["CANCEL", "NO", "4", "NAHI"]);

// ─── NDR Webhook handler ─────────────────────────────────────────────────────

export interface NdrWebhookPayload {
  awb: string;
  orderId?: string;
  courier?: string;
  attempt?: number;
  reason?: string;
  customerPhone: string;
  customerName?: string;
}

/**
 * Process an inbound NDR notification from a courier or middleware.
 * Creates an NdrEvent, stamps the contact, and kicks off the drip sequence.
 */
export async function handleNdrWebhook(
  orgId: string,
  payload: NdrWebhookPayload
): Promise<{ ndrEventId: string; contactId: string }> {
  const { awb, orderId, courier, attempt = 1, reason, customerName } = payload;

  if (!awb) throw new ApiError("awb is required", 400);
  if (!payload.customerPhone) throw new ApiError("customerPhone is required", 400);

  const phone = formatPhoneNumber(payload.customerPhone);

  // 1. Upsert contact
  const contact = await upsertContact(orgId, phone, customerName);

  // 2. Check for an existing NDR event on this AWB.
  //    Skip silently if the courier already reached a terminal outcome.
  const existing = await repo.findNdrEventByAwb(awb, orgId);
  if (existing && ["confirmed", "resolved", "cancelled"].includes(existing.status)) {
    return { ndrEventId: existing.id, contactId: contact.id };
  }

  // 3. Create the NdrEvent record (always creates a fresh row per attempt).
  const ndrEvent = await repo.createNdrEvent({
    awb,
    orderId: orderId || undefined,
    courier: courier || undefined,
    attempt,
    reason: reason || undefined,
    customerPhone: phone,
    customerName: customerName || contact.name,
    contactId: contact.id,
    organizationId: orgId,
  });

  // 4. Stamp contact attributes so the reply handler and sequence templates can
  //    read them without querying the NdrEvent table directly.
  await stampContactAttrs(contact.id, {
    ndr_pending: true,
    ndr_awb: awb,
    pending_ndr_reason: reason || null,
  });

  // 5. Enroll into any active "ndr_pending" sequences.
  await enrollOnTrigger(orgId, "ndr_pending", contact.id);

  // 6. Audit log.
  await writeSystemLog(
    orgId,
    `NDR received for order ${orderId || "unknown"} (AWB: ${awb}) — customer ${customerName || contact.name} contacted on WhatsApp.`
  );

  return { ndrEventId: ndrEvent.id, contactId: contact.id };
}

// ─── Inbound reply handler ───────────────────────────────────────────────────

/**
 * Intercept a WhatsApp reply that may be a response to an NDR prompt.
 *
 * Must be called from processInboundMessage() AFTER the COD intercept. Returns
 * true when the message was consumed (caller must skip further routing).
 */
export async function handleNdrReply(
  text: string,
  contact: { id: string; name: string; phone: string; attributes: unknown },
  orgId: string
): Promise<boolean> {
  const attrs = (contact.attributes as Record<string, unknown>) || {};

  // ── Fast exit: no active NDR on this contact ─────────────────────────────
  if (!attrs.ndr_pending && !attrs.ndr_reschedule_requested && !attrs.ndr_address_update_requested) {
    return false;
  }

  const phone = formatPhoneNumber(contact.phone);
  const token = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  // ── Collect pending reschedule date ──────────────────────────────────────
  if (attrs.ndr_reschedule_requested === true) {
    // Any free-form reply after RESCHEDULE is treated as the new date.
    const ndrEvent = await repo.findPendingNdrForContact(contact.id, orgId);
    if (ndrEvent) {
      await repo.updateNdrEvent(ndrEvent.id, orgId, {
        status: "rescheduled",
        rescheduledDate: text.trim(),
      });
    }
    await stampContactAttrs(contact.id, {
      ndr_pending: false,
      ndr_reschedule_requested: false,
    });
    const reply = `✅ Got it! We've noted your preferred date: *${text.trim()}*. The courier will attempt redelivery on that day. 🚚`;
    await sendWhatsAppMessage({ to: phone, text: reply }, orgId);
    await writeSystemLog(orgId, `NDR rescheduled by ${contact.name} for "${text.trim()}" (AWB: ${attrs.ndr_awb || "unknown"}).`);
    return true;
  }

  // ── Collect pending address update ───────────────────────────────────────
  if (attrs.ndr_address_update_requested === true) {
    const ndrEvent = await repo.findPendingNdrForContact(contact.id, orgId);
    if (ndrEvent) {
      await repo.updateNdrEvent(ndrEvent.id, orgId, {
        status: "address_updated",
        updatedAddress: text.trim(),
      });
    }
    await stampContactAttrs(contact.id, {
      ndr_pending: false,
      ndr_address_update_requested: false,
    });
    const reply = `🏠 Address updated! We've passed your new address to the courier. They'll attempt redelivery shortly.`;
    await sendWhatsAppMessage({ to: phone, text: reply }, orgId);
    await writeSystemLog(orgId, `NDR address updated by ${contact.name} (AWB: ${attrs.ndr_awb || "unknown"}).`);
    return true;
  }

  // ── Keyword matching (only when ndr_pending is true) ─────────────────────
  if (!attrs.ndr_pending) return false;

  if (CONFIRM_TOKENS.has(token)) {
    await resolveNdrReply(contact.id, orgId, "confirmed", attrs);
    const reply = `✅ Perfect! We've notified the courier you're available. Expect redelivery in 24–48 hours.`;
    await sendWhatsAppMessage({ to: phone, text: reply }, orgId);
    await writeSystemLog(orgId, `NDR confirmed by ${contact.name} (AWB: ${attrs.ndr_awb || "unknown"}).`);
    return true;
  }

  if (RESCHEDULE_TOKENS.has(token)) {
    // Two-step: mark reschedule requested, then capture the next message as date.
    const ndrEvent = await repo.findPendingNdrForContact(contact.id, orgId);
    if (ndrEvent) {
      await repo.updateNdrEvent(ndrEvent.id, orgId, { status: "rescheduled" });
    }
    await stampContactAttrs(contact.id, {
      ndr_reschedule_requested: true,
    });
    const reply = `📅 Please reply with your preferred date and time (e.g. *Tomorrow 2PM*).`;
    await sendWhatsAppMessage({ to: phone, text: reply }, orgId);
    return true;
  }

  if (ADDRESS_TOKENS.has(token)) {
    // Two-step: mark address update requested, then capture next message as address.
    const ndrEvent = await repo.findPendingNdrForContact(contact.id, orgId);
    if (ndrEvent) {
      await repo.updateNdrEvent(ndrEvent.id, orgId, { status: "address_updated" });
    }
    await stampContactAttrs(contact.id, {
      ndr_address_update_requested: true,
    });
    const reply = `🏠 Please reply with your updated delivery address and we'll pass it to the courier.`;
    await sendWhatsAppMessage({ to: phone, text: reply }, orgId);
    return true;
  }

  if (CANCEL_TOKENS.has(token)) {
    await resolveNdrReply(contact.id, orgId, "cancelled", attrs);
    const reply = `Understood. Your order will be returned. We're sorry it didn't work out — reach out if you need help.`;
    await sendWhatsAppMessage({ to: phone, text: reply }, orgId);
    await writeSystemLog(orgId, `NDR cancelled by ${contact.name} (AWB: ${attrs.ndr_awb || "unknown"}).`);
    return true;
  }

  // No keyword matched; the message is not an NDR reply.
  return false;
}

/** Update the NdrEvent and clear the ndr_pending contact attribute. */
async function resolveNdrReply(
  contactId: string,
  orgId: string,
  status: string,
  attrs: Record<string, unknown>
) {
  const ndrEvent = await repo.findPendingNdrForContact(contactId, orgId);
  if (ndrEvent) {
    await repo.updateNdrEvent(ndrEvent.id, orgId, {
      status,
      resolvedAt: new Date(),
    });
  }
  // Clear the pending flag regardless of whether we found an event row.
  await stampContactAttrs(contactId, {
    ndr_pending: false,
    ndr_reschedule_requested: false,
    ndr_address_update_requested: false,
  });
  // Stop any active ndr_pending sequences for the contact.
  await stopNdrSequences(contactId, orgId);
}

async function stopNdrSequences(contactId: string, orgId: string) {
  const { prisma } = await import("@/shared/lib/prisma");
  const active = await prisma.sequenceEnrollment.findMany({
    where: {
      contactId,
      organizationId: orgId,
      status: "active",
      sequence: { trigger: "ndr_pending" },
    },
  });
  for (const enrollment of active) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: { status: "completed", nextRunAt: null },
    });
  }
}

// ─── List (thin delegation) ──────────────────────────────────────────────────

export function listNdrEvents(orgId: string, filter?: { status?: string }) {
  return repo.listNdrEvents(orgId, filter);
}
