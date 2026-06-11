import { route, ok, requireOrg, body, requireFields } from "@/shared/lib/api";
import { listSubscriptions, createSubscription } from "../../services/webhookDeliveryService";
import type { WebhookEvent } from "../../types";

/** GET /api/org/[orgId]/webhooks — list outbound webhook subscriptions. */
export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  return ok({ subscriptions: await listSubscriptions(orgId) });
});

/** POST /api/org/[orgId]/webhooks — subscribe an endpoint. Secret returned once here. */
export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const input = await body<{ url: string; events: WebhookEvent[] }>(req);
  requireFields(input, ["url", "events"]);
  const subscription = await createSubscription({ ...input, organizationId: orgId });
  return ok({ subscription }, { status: 201 });
});
