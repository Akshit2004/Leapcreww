import { route, ok, requireOrg, requireSession, body } from "@/shared/lib/api";
import { listNotes, createNote } from "../../../../services/internalNoteService";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  const contactId = params?.contactId as string;
  await requireOrg(orgId);
  return ok({ notes: await listNotes(contactId, orgId) });
});

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  const contactId = params?.contactId as string;
  const session = await requireSession();
  await requireOrg(orgId);
  const payload = await body<{ body: string }>(req);
  const authorName = session.user.name || "Agent";
  const note = await createNote(orgId, contactId, payload.body, authorName);
  return ok({ note }, { status: 201 });
});
