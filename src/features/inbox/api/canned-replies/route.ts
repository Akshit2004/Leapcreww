import { route, ok, requireOrg, body } from "@/shared/lib/api";
import { listCannedReplies, createCannedReply } from "../../services/cannedReplyService";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  return ok({ cannedReplies: await listCannedReplies(orgId) });
});

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  const payload = await body<{ shortcut: string; title?: string; body: string }>(req);
  const reply = await createCannedReply(orgId, payload);
  return ok({ cannedReply: reply }, { status: 201 });
});
