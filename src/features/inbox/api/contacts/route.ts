import { route, ok, requireOrg, body, requireFields } from "@/shared/lib/api";
import { createContact } from "../../services/inboxService";

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "AGENT");

  const payload = await body<{
    name: string;
    phone: string;
    email?: string;
    source?: string;
    tags?: string[];
    status?: "Active" | "Inactive";
  }>(req);

  requireFields(payload, ["name", "phone"]);

  const contact = await createContact(orgId, payload);
  return ok({ contact }, { status: 201 });
});
