import { ApiError } from "@/shared/lib/api";
import * as repo from "../repositories/internalNoteRepo";
import * as contactRepo from "../repositories/contactRepo";

async function requireOwnedContact(contactId: string, orgId: string) {
  const contact = await contactRepo.findContact(contactId);
  if (!contact) throw new ApiError("Contact not found", 404);
  if (contact.organizationId !== orgId) throw new ApiError("Forbidden", 403);
  return contact;
}

export async function listNotes(contactId: string, orgId: string) {
  await requireOwnedContact(contactId, orgId);
  return repo.listByContact(contactId, orgId);
}

export async function createNote(
  orgId: string,
  contactId: string,
  noteBody: string,
  authorName: string
) {
  if (!noteBody.trim()) throw new ApiError("Note body is required", 400);
  await requireOwnedContact(contactId, orgId);
  return repo.create({ body: noteBody.trim(), authorName, contactId, organizationId: orgId });
}
