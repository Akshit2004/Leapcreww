import { route, ok, requireSession, body } from "@/shared/lib/api";
import { deleteContact, updateContactFields } from "../../../services/inboxService";

export const DELETE = route(async (_req, { params }) => {
  const session = await requireSession();
  const orgIds = session.user.organizations.map((o) => o.id);
  await deleteContact(params?.contactId as string, orgIds);
  return ok({ status: "ok" });
});

export const PATCH = route(async (req, { params }) => {
  const session = await requireSession();
  const orgIds = session.user.organizations.map((o) => o.id);
  const payload = await body<Record<string, unknown>>(req);
  const contact = await updateContactFields(params?.contactId as string, orgIds, payload);
  return ok({ status: "ok", contact });
});
