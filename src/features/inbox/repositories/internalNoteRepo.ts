import { prisma } from "@/shared/lib/prisma";

export interface NoteCreate {
  body: string;
  authorName: string;
  contactId: string;
  organizationId: string;
}

export function listByContact(contactId: string, organizationId: string) {
  return prisma.internalNote.findMany({
    where: { contactId, organizationId },
    orderBy: { createdAt: "asc" },
  });
}

export function create(data: NoteCreate) {
  return prisma.internalNote.create({ data });
}
