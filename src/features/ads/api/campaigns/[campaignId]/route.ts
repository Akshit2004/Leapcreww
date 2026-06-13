import { route, ok, requireOrg } from "@/shared/lib/api";
import { removeCampaign } from "../../../services/adCampaignService";

export const DELETE = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  const campaignId = params?.campaignId as string;
  await requireOrg(orgId, "ADMIN");
  await removeCampaign(orgId, campaignId);
  return ok({ success: true });
});
