import { route, ok, requireOrg } from "@/shared/lib/api";
import { deleteSubscription } from "../../../services/webhookDeliveryService";

/** DELETE /api/org/[orgId]/webhooks/[subscriptionId] — remove a subscription. */
export const DELETE = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  await deleteSubscription(orgId, params?.subscriptionId as string);
  return ok({ ok: true });
});
