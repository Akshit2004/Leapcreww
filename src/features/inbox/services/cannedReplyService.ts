import { ApiError } from "@/shared/lib/api";
import * as repo from "../repositories/cannedReplyRepo";

export function listCannedReplies(orgId: string) {
  return repo.listByOrg(orgId);
}

export async function createCannedReply(
  orgId: string,
  input: { shortcut: string; title?: string; body: string }
) {
  if (!input.shortcut.trim()) throw new ApiError("Shortcut is required", 400);
  if (!input.body.trim()) throw new ApiError("Body is required", 400);
  const shortcut = input.shortcut.replace(/^\//, "").toLowerCase().trim();
  const title = (input.title || shortcut).trim();
  return repo.create({ shortcut, title, body: input.body.trim(), organizationId: orgId });
}

export async function deleteCannedReply(orgId: string, id: string) {
  const result = await repo.remove(id, orgId);
  if (result.count === 0) throw new ApiError("Canned reply not found", 404);
}
