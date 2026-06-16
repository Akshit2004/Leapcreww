import { route, ok, requireOrg } from "@/shared/lib/api";
import { syncWhatsappContacts } from "@/features/customers/services/whatsappContactSyncService";

// POST /api/org/[orgId]/contacts/sync-whatsapp
export const POST = route(async (_req, { params }) => {
  const orgId = params!.orgId;
  await requireOrg(orgId, "AGENT");
  const result = await syncWhatsappContacts(orgId);
  return ok({ success: true, ...result });
});
