import { route, ok, requireOrg, requireFields, body } from "@/shared/lib/api";
import { issueKey, listKeys } from "../../services/apiKeyService";
import type { CreateApiKeyInput } from "../../types";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  return ok({ keys: await listKeys(orgId) });
});

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const input = await body<CreateApiKeyInput>(req);
  input.organizationId = orgId;
  requireFields(input, ["name"]);
  // `key` is returned exactly once — the client must store it now.
  return ok(await issueKey(input), { status: 201 });
});
