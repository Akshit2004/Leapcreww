import { route, ok, requireSession, body } from "@/shared/lib/api";
import { deleteContact, updateContactFields } from "../../../services/inboxService";

export const DELETE = route(async (_req, { params }) => {
  await requireSession();
  await deleteContact(params?.contactId as string);
  return ok({ status: "ok" });
});

export const PATCH = route(async (req, { params }) => {
  await requireSession();
  const payload = await body<Record<string, unknown>>(req);
  const contact = await updateContactFields(params?.contactId as string, payload);
  return ok({ status: "ok", contact });
});
