/**
 * leadCaptureService.ts — Lead capture business logic (e.g. storefront quiz).
 *
 * Capture flow (POST /v1/leads):
 *   1. Upsert the Contact by phone (reuses the shared /v1 contact merge logic).
 *   2. Persist a LeadSubmission holding the pre-compiled `result`.
 *   3. WhatsApp the approved `lead_capture_result` template, encoding the
 *      submission id on its quick-reply button payload as `lead_result:<id>`.
 *
 * Delivery flow (inbound webhook): a tap on that button arrives as the payload
 * `lead_result:<id>`, opening a 24h session. deliverLeadResult() then sends the
 * stored result text and flips `resultDelivered` (idempotent on replays).
 *
 * Billing: the conversation-opening marketing template is billed at capture
 * (canAfford guard → 402, recordUsage on success), mirroring v1 message sends.
 * The in-session result reply is not separately billed.
 */
import { ApiError } from "@/shared/lib/api";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import { canAfford, recordUsage } from "@/features/billing/services/billingService";
import { upsertV1Contact } from "@/features/public-api/services/v1Service";
import * as repo from "../repositories/leadCaptureRepo";
import type { Prisma } from "@prisma/client";

/** Approved Meta template (static body + one quick-reply button) sent on capture. */
export const LEAD_RESULT_TEMPLATE = "lead_capture_result";
/** Quick-reply button payload prefix that routes a tap back to result delivery. */
export const LEAD_RESULT_PREFIX = "lead_result:";

export interface CreateLeadInput {
  phone: string;
  name?: string;
  source: string;
  result: string;
  attributes?: Record<string, string | number | boolean>;
}

// NB: no explicit return-type annotation — the inferred anonymous object type
// satisfies Prisma.InputJsonValue, which withIdempotency() requires of its
// callback. A named interface return type would not (it lacks an index sig).
export async function createLead(
  organizationId: string,
  input: CreateLeadInput,
  isSandbox = false
) {
  // Pre-send wallet guard for the marketing template (skipped for sandbox keys).
  if (!isSandbox && !(await canAfford(organizationId, "marketing"))) {
    throw new ApiError("Insufficient wallet balance. Top up to continue sending.", 402);
  }

  // Upsert the contact (tags merged, attributes shallow-merged) — single-sources
  // the merge logic with the public /v1/contacts endpoint.
  const { contact } = await upsertV1Contact(organizationId, {
    phone: input.phone,
    name: input.name,
    source: input.source,
    tags: ["Lead"],
    attributes: input.attributes,
  });

  const submission = await repo.createSubmission({
    organizationId,
    contactId: contact.id,
    source: input.source,
    attributes: (input.attributes ?? {}) as Prisma.InputJsonValue,
    result: input.result,
  });

  // Sandbox keys never touch Meta — capture the submission and report sent=false.
  if (isSandbox) {
    return { submissionId: submission.id, contactId: contact.id, sent: false, error: null };
  }

  const result = await sendWhatsAppMessage(
    {
      to: formatPhoneNumber(contact.phone),
      template: {
        name: LEAD_RESULT_TEMPLATE,
        language: { code: "en_US" },
        // Dynamic quick-reply payload — Meta echoes it back as `button.payload`
        // when the customer taps "See My Result".
        components: [
          {
            type: "button",
            sub_type: "quick_reply",
            index: "0",
            parameters: [{ type: "payload", payload: `${LEAD_RESULT_PREFIX}${submission.id}` }],
          },
        ],
      },
    },
    organizationId
  );

  if (result.ok) {
    await recordUsage({ organizationId, type: "template", category: "marketing" });
  }

  return {
    submissionId: submission.id,
    contactId: contact.id,
    sent: result.ok,
    error: result.error ?? null,
  };
}

/**
 * Deliver a captured result after the customer taps the template's quick-reply
 * button. Idempotent: a duplicate tap (Meta retry / double-press) no-ops once
 * `resultDelivered` is set. Returns true when the submission was found.
 */
export async function deliverLeadResult(
  organizationId: string,
  submissionId: string,
  toPhone: string
): Promise<boolean> {
  const submission = await repo.findSubmissionById(submissionId, organizationId);
  if (!submission) {
    console.warn(`[LeadCapture] No submission ${submissionId} found for org ${organizationId}`);
    return false;
  }
  if (submission.resultDelivered) return true;

  const result = await sendWhatsAppMessage(
    { to: formatPhoneNumber(toPhone), text: submission.result },
    organizationId
  );
  if (result.ok) {
    await repo.markDelivered(submission.id);
  } else {
    console.warn(`[LeadCapture] Failed to deliver result for submission ${submission.id}:`, result.error);
  }
  return true;
}

/** Recent submissions for the Settings → Developer "Lead Capture" card. */
export function listRecentSubmissions(organizationId: string, limit = 10) {
  return repo.listRecentSubmissions(organizationId, Math.min(limit, 50));
}
