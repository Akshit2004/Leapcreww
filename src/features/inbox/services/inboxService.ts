/** inboxService.ts — Team Inbox business logic (send, edit, import contacts). */
import { ApiError } from "@/shared/lib/api";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import * as repo from "../repositories/contactRepo";
import { CONTACT_EDITABLE_FIELDS, type ImportContactRow, type SendMessageInput } from "../types";

/**
 * Load a contact and assert it belongs to one of the caller's organizations.
 * Prevents cross-tenant IDOR on routes keyed only by `contactId` (Article III).
 */
async function requireOwnedContact(contactId: string, callerOrgIds: string[]) {
  const contact = await repo.findContact(contactId);
  if (!contact) throw new ApiError("Contact not found", 404);
  if (!callerOrgIds.includes(contact.organizationId)) {
    throw new ApiError("Forbidden: this contact belongs to another workspace", 403);
  }
  return contact;
}

const hhmm = (d = new Date()) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const preview = (text: string) => (text.length > 35 ? text.substring(0, 32) + "..." : text);

/**
 * Persist an agent message, update the contact (with bot→agent takeover),
 * then dispatch via Meta. Falls back to a sandbox result if WA isn't configured.
 */
export async function sendAgentMessage(input: SendMessageInput, agentName: string) {
  // Assert the target contact belongs to the org being billed before we write
  // any message/log rows — stops cross-tenant writes on a caller-supplied
  // contactId even when the caller is a member of input.orgId (Article III).
  const contact = await repo.findContact(input.contactId);
  if (!contact || contact.organizationId !== input.orgId) {
    throw new ApiError("Contact not found", 404);
  }

  const ts = hhmm();
  const dbMsg = await repo.createMessage({
    sender: "agent",
    text: input.text,
    contactId: input.contactId,
    organizationId: input.orgId,
  });

  if (contact.assignedAgent === "Bot") {
    await repo.updateContact(input.contactId, {
      assignedAgent: agentName,
      lastMessage: preview(input.text),
      lastMessageTime: ts,
    });
    await repo.createLog({
      type: "crm",
      message: `Agent ${agentName} took over conversation from AI Bot for contact ${contact.name}`,
      organizationId: input.orgId,
    });
  } else {
    await repo.updateContact(input.contactId, {
      lastMessage: preview(input.text),
      lastMessageTime: ts,
    });
  }

  const result = await sendWhatsAppMessage(
    { to: formatPhoneNumber(input.to), text: input.text },
    input.orgId
  );

  if (!result.ok) {
    await repo.createLog({
      type: "chat",
      message: `Agent sent sandbox message: "${input.text.slice(0, 45)}" (Meta: ${result.error})`,
      organizationId: input.orgId,
    });
    return { status: "sandbox_sent", message: dbMsg, metaStatus: "skipped", metaError: result.error };
  }

  await repo.createLog({
    type: "chat",
    message: `Agent sent WhatsApp message: "${input.text.slice(0, 50)}"`,
    organizationId: input.orgId,
  });
  return { status: "sent", message: dbMsg, waMessageId: result.data?.messages?.[0]?.id || null };
}

export async function deleteContact(contactId: string, callerOrgIds: string[]) {
  await requireOwnedContact(contactId, callerOrgIds);
  return repo.deleteContactCascade(contactId);
}

/** Apply a whitelisted partial update to a contact owned by the caller. */
export async function updateContactFields(
  contactId: string,
  callerOrgIds: string[],
  body: Record<string, unknown>
) {
  const existing = await requireOwnedContact(contactId, callerOrgIds);
  const updates: Record<string, unknown> = {};
  for (const key of CONTACT_EDITABLE_FIELDS) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  const updated = await repo.updateContact(contactId, updates);

  // Fire tag_added for each newly added tag so sequences (e.g. win_back) enroll correctly.
  if (Array.isArray(body.tags)) {
    const prevTags = new Set<string>(existing.tags ?? []);
    const addedTags = (body.tags as string[]).filter((t) => !prevTags.has(t));
    if (addedTags.length > 0) {
      const { enrollOnTrigger } = await import("@/features/sequences/services/sequenceService");
      for (const tag of addedTags) {
        await enrollOnTrigger(existing.organizationId, "tag_added", contactId, { tag });
      }
    }
  }

  return updated;
}

/** Create a single contact for an org (e.g. manual "Add Customer" entry). */
export async function createContact(
  orgId: string,
  input: { name: string; phone: string; email?: string; source?: string; tags?: string[]; status?: "Active" | "Inactive" }
) {
  if (!input.name?.trim() || !input.phone?.trim()) {
    throw new ApiError("name and phone are required", 400);
  }
  return repo.createContact({
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    source: input.source?.trim() || "Manual",
    tags: input.tags ?? [],
    status: input.status ?? "Active",
    organizationId: orgId,
  });
}

/** Bulk import contacts for an org after verifying membership. Returns inserted count. */
export async function importContacts(
  userId: string,
  orgId: string,
  rows: ImportContactRow[]
): Promise<number> {
  const membership = await repo.findMembership(userId, orgId);
  if (!membership) throw new Error("Forbidden");

  const valid = rows
    .map((c) => ({
      name: c.name || "Unknown",
      phone: c.phone,
      email: c.email || "",
      source: c.source || "Imported CSV",
      tags: c.tags || ["imported"],
      status: c.status || "Active",
      organizationId: orgId,
    }))
    .filter((c) => c.phone);

  if (valid.length === 0) throw new Error("No valid contacts to import");
  const result = await repo.bulkCreateContacts(valid);
  return result.count;
}
