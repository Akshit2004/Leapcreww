import { route, ok, requireOrg } from "@/shared/lib/api";
import { sendTestEvent } from "../../../../services/webhookDeliveryService";

/** POST /api/org/[orgId]/webhooks/[subscriptionId]/test — deliver a sample event now. */
export const POST = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const result = await sendTestEvent(orgId, params?.subscriptionId as string);
  return ok({ result });
});
