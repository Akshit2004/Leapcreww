import { NextRequest } from "next/server";
import { requireOrg, ok, route } from "@/shared/lib/api";
import { setupFlowsEncryption } from "@/features/flows/services/flowService";

export const POST = route(async (req, { params }) => {
  const orgId = params!.orgId;
  await requireOrg(orgId, "ADMIN"); // Only admins can setup encryption keys

  const result = await setupFlowsEncryption(orgId);
  return ok(result);
});
