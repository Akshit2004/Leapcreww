import { route, ok, requireOrg } from "@/shared/lib/api";
import { deleteCannedReply } from "../../../services/cannedReplyService";

export const DELETE = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  const id = params?.id as string;
  await requireOrg(orgId, "ADMIN");
  await deleteCannedReply(orgId, id);
  return ok({ ok: true });
});
