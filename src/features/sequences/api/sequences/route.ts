import { route, ok, requireOrg, requireFields, body } from "@/shared/lib/api";
import { listSequences, createSequence } from "../../services/sequenceService";
import type { SequenceInput } from "../../types";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  return ok({ sequences: await listSequences(orgId) });
});

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const input = await body<SequenceInput>(req);
  input.organizationId = orgId;
  requireFields(input, ["name", "trigger", "steps"]);
  return ok({ sequence: await createSequence(input) }, { status: 201 });
});
