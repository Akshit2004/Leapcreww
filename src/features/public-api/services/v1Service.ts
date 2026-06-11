/**
 * v1Service.ts — Business logic behind the public /v1 REST API (T-08).
 *
 * Sends are billed (pre-send canAfford guard → 402, post-send recordUsage)
 * and logged to the Inbox so API traffic is visible alongside app traffic.
 * Idempotency: pass the request's Idempotency-Key through withIdempotency()
 * so replayed requests return the stored response instead of re-sending.
 */
import * as crypto from "crypto";
import { ApiError } from "@/shared/lib/api";
import { sendWhatsAppMessage, formatPhoneNumber, type WhatsAppMessage } from "@/shared/lib/whatsapp";
import { canAfford, recordUsage } from "@/features/billing/services/billingService";
import * as repo from "../repositories/publicApiRepo";
import type { Prisma } from "@prisma/client";

// ─── Idempotency ─────────────────────────────────────────────────────────────

/**
 * Run `fn` once per (org, key). A replay returns the stored response.
 * A missing key runs `fn` unconditionally.
 */
export async function withIdempotency<T extends Prisma.InputJsonValue>(
  organizationId: string,
  key: string | null,
  fn: () => Promise<T>
): Promise<{ response: T; replayed: boolean }> {
  if (!key) return { response: await fn(), replayed: false };
  if (key.length > 255) throw new ApiError("Idempotency-Key must be at most 255 characters", 400);

  const existing = await repo.findIdempotencyKey(organizationId, key);
  if (existing) return { response: existing.response as T, replayed: true };

  const response = await fn();
  try {
    await repo.storeIdempotencyKey(organizationId, key, response);
  } catch {
    // Lost a concurrent race for the same key — the other request stored its
    // response first; ours was equivalent, so returning it is still correct.
  }
  return { response, replayed: false };
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface SendMessageInput {
  to: string;
  text?: string;
  template?: { name: string; language?: string; variables?: string[] };
  media?: { type: "image" | "video" | "document"; url: string; caption?: string };
}

export async function sendV1Message(organizationId: string, input: SendMessageInput, isSandbox = false) {
  if (!isSandbox) {
    const category = input.template ? "marketing" : "service";
    if (!(await canAfford(organizationId, category))) {
      throw new ApiError("Insufficient wallet balance. Top up to continue sending.", 402);
    }
  }

  const to = formatPhoneNumber(input.to);
  const message: WhatsAppMessage = { to };

  if (input.template) {
    message.template = {
      name: input.template.name,
      language: { code: input.template.language || "en_US" },
      ...(input.template.variables?.length
        ? {
            components: [
              {
                type: "body",
                parameters: input.template.variables.map((text) => ({ type: "text", text })),
              },
            ],
          }
        : {}),
    };
  } else if (input.media) {
    message[input.media.type] = { link: input.media.url };
    if (input.media.caption) message.text = input.media.caption;
  } else {
    message.text = input.text || "";
  }

  if (isSandbox) {
    // Don't call Meta — log to inbox for visibility, skip billing.
    const normalizedPhone = `+${to.replace(/[^0-9]/g, "")}`;
    let contact = await repo.findContactByPhone(organizationId, normalizedPhone);
    if (!contact) {
      contact = await repo.createContact({
        name: normalizedPhone,
        phone: normalizedPhone,
        email: `${to}@whatsapp.customer`,
        source: "API",
        tags: ["API", "Sandbox"],
        status: "Active",
        organizationId,
      });
    }
    const preview = input.template
      ? `[Sandbox][Template: ${input.template.name}]`
      : input.media
        ? `[Sandbox][${input.media.type}] ${input.media.caption || input.media.url}`
        : `[Sandbox] ${input.text || ""}`;
    const sandboxMessageId = `sandbox_${crypto.randomUUID()}`;
    await repo.logOutboundMessage({
      text: preview.slice(0, 500),
      contactId: contact.id,
      organizationId,
      waMessageId: sandboxMessageId,
    });
    return { messageId: sandboxMessageId, waMessageId: null };
  }

  const result = await sendWhatsAppMessage(message, organizationId);
  const waMessageId = result.data?.messages?.[0]?.id ?? null;

  if (result.ok) {
    // Keep API sends visible in the Inbox: upsert the contact, log the message.
    const normalizedPhone = `+${to.replace(/[^0-9]/g, "")}`;
    let contact = await repo.findContactByPhone(organizationId, normalizedPhone);
    if (!contact) {
      contact = await repo.createContact({
        name: normalizedPhone,
        phone: normalizedPhone,
        email: `${to}@whatsapp.customer`,
        source: "API",
        tags: ["API"],
        status: "Active",
        organizationId,
      });
    }
    const preview = input.template
      ? `[Template: ${input.template.name}]`
      : input.media
        ? `[${input.media.type}] ${input.media.caption || input.media.url}`
        : input.text || "";
    await repo.logOutboundMessage({
      text: preview.slice(0, 500),
      contactId: contact.id,
      organizationId,
      waMessageId,
    });
    const category = input.template ? "marketing" : "service";
    await recordUsage({
      organizationId,
      type: input.template ? "template" : "message",
      category,
    });
  }

  return { ok: result.ok, waMessageId, error: result.error ?? null };
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export interface UpsertContactInput {
  phone: string;
  name?: string;
  email?: string;
  tags?: string[];
  attributes?: Record<string, string | number | boolean>;
  source?: string;
}

/** Create-or-update by phone. Tags are merged; attributes are shallow-merged. */
export async function upsertV1Contact(organizationId: string, input: UpsertContactInput) {
  const normalizedPhone = `+${formatPhoneNumber(input.phone).replace(/[^0-9]/g, "")}`;
  if (normalizedPhone.length < 9) throw new ApiError("A valid phone with country code is required", 400);

  const existing = await repo.findContactByPhone(organizationId, normalizedPhone);
  if (existing) {
    const mergedTags = input.tags ? Array.from(new Set([...existing.tags, ...input.tags])) : undefined;
    const mergedAttrs: Prisma.JsonObject | undefined = input.attributes
      ? { ...((existing.attributes as Prisma.JsonObject) || {}), ...input.attributes }
      : undefined;
    const updated = await repo.updateContact(existing.id, {
      ...(input.name ? { name: input.name } : {}),
      ...(input.email ? { email: input.email } : {}),
      ...(mergedTags ? { tags: mergedTags } : {}),
      ...(mergedAttrs ? { attributes: mergedAttrs } : {}),
    });
    return { contact: updated, created: false };
  }

  const created = await repo.createContact({
    name: input.name || normalizedPhone,
    phone: normalizedPhone,
    email: input.email || `${normalizedPhone.slice(1)}@whatsapp.customer`,
    source: input.source || "API",
    tags: input.tags?.length ? input.tags : ["API"],
    status: "Active",
    attributes: input.attributes ?? undefined,
    organizationId,
  });
  return { contact: created, created: true };
}

export function listV1Contacts(
  organizationId: string,
  filters: { phone?: string; tag?: string },
  limit: number,
  offset: number
) {
  return repo.listContacts(organizationId, filters, Math.min(limit, 100), offset);
}

// ─── Templates ───────────────────────────────────────────────────────────────

export function listV1Templates(organizationId: string) {
  return repo.listTemplates(organizationId);
}
