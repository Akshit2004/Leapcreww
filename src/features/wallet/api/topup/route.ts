import { ok, route, requireOrg, body, requireFields } from "@/shared/lib/api";
import { createTopupOrder } from "../../services/walletService";

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  const input = await body<{ amount: number }>(req);
  requireFields(input, ["amount"]);
  await requireOrg(orgId, "ADMIN");

  const result = await createTopupOrder({
    organizationId: orgId,
    amount: input.amount,
  });

  return ok(result);
});
