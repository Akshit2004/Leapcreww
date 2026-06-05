import { route, ok, requireOrg } from "@/shared/lib/api";
import { getUsageLedger } from "../../services/billingService";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  return ok(await getUsageLedger(orgId));
});
