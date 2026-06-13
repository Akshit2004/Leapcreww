import { route, ok, requireOrg, requireFields, body } from "@/shared/lib/api";
import { listCampaignsWithMetrics, publishCampaign } from "../../services/adCampaignService";
import type { PublishAdCampaignInput } from "../../types";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  return ok(await listCampaignsWithMetrics(orgId));
});

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const input = await body<PublishAdCampaignInput>(req);
  requireFields(input, ["name", "budget", "objective", "creative"]);
  input.organizationId = orgId;

  const { campaign, simulated } = await publishCampaign(input);
  return ok({ campaign, simulated });
});
