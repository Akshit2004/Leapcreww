import { route, ok, fail, requireSession, body } from "@/shared/lib/api";
import { importContacts } from "../../../services/inboxService";
import type { ImportContactRow } from "../../../types";

export const POST = route(async (req, { params }) => {
  const session = await requireSession();
  const orgId = params?.orgId as string;
  const { contacts } = await body<{ contacts?: ImportContactRow[] }>(req);

  if (!contacts || !Array.isArray(contacts)) {
    return fail("Invalid contacts payload.", 400);
  }

  try {
    const count = await importContacts(session.user.id, orgId, contacts);
    return ok({ message: "Import successful", count }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Import failed";
    if (msg === "Forbidden") return fail("Access forbidden. You do not belong to this workspace.", 403);
    if (msg === "No valid contacts to import") return fail(msg, 400);
    throw err;
  }
});
