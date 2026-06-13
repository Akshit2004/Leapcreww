/** adCampaignService.ts — Click-to-WhatsApp ad campaign CRUD + live metrics (T-01, T-07). */
import { ApiError } from "@/shared/lib/api";
import { getCampaignInsights, publishMetaAdCampaign } from "@/shared/lib/meta-ads";
import * as repo from "../repositories/adRepo";
import type { AdCampaignMetrics, PublishAdCampaignInput } from "../types";

const ZERO_METRICS: Omit<AdCampaignMetrics, "leads" | "live"> = {
  impressions: 0,
  clicks: 0,
  ctr: 0,
  spent: 0,
};

/**
 * List ad campaigns with real performance metrics: live spend/impressions/clicks
 * from the Meta Marketing API when the campaign has a `metaCampaignId`, plus the
 * real lead count tracked locally via CTWA referral attribution. Campaigns that
 * aren't connected to a live Meta campaign report zeroed Meta metrics.
 */
export async function listCampaignsWithMetrics(organizationId: string) {
  const campaigns = await repo.listAdCampaigns(organizationId);

  return Promise.all(
    campaigns.map(async (campaign) => {
      const leads = campaign.ads.reduce((sum, ad) => sum + ad.leads, 0);
      const insights = campaign.metaCampaignId
        ? await getCampaignInsights(organizationId, campaign.metaCampaignId)
        : null;

      const metrics: AdCampaignMetrics = {
        ...(insights ?? ZERO_METRICS),
        leads,
        live: !!insights,
      };

      return { ...campaign, metrics };
    })
  );
}

/** Publish a campaign to Meta (or simulate) and persist it with its primary ad. */
export async function publishCampaign(input: PublishAdCampaignInput) {
  if (!input.name?.trim() || !input.budget || !input.creative?.headline || !input.creative?.primaryText) {
    throw new ApiError("Missing required fields", 400);
  }

  const publishRes = await publishMetaAdCampaign(input.organizationId, {
    name: input.name,
    budget: input.budget,
    objective: input.objective,
    pageId: input.pageId || "mock_page_id",
    adAccountId: input.adAccountId || "mock_ad_account_id",
    creative: input.creative,
    linkedTemplate: input.linkedTemplate,
  });

  const campaign = await repo.createAdCampaign(
    {
      name: input.name,
      objective: input.objective,
      budget: input.budget,
      status: "ACTIVE",
      metaCampaignId: publishRes.campaignId,
      organizationId: input.organizationId,
    },
    {
      name: `${input.name} - Ad`,
      status: "ACTIVE",
      creative: {
        headline: input.creative.headline,
        primaryText: input.creative.primaryText,
        imagePrompt: input.creative.imagePrompt,
        imageUrl: input.creative.imageUrl || "",
      },
      linkedTemplate: input.linkedTemplate || null,
      metaAdId: publishRes.adId,
      ctwaClid: publishRes.simulated ? "simulated_click_id" : null,
    }
  );

  return { campaign, simulated: publishRes.simulated };
}

/** Delete a campaign, scoped to the org. Throws if it doesn't exist for this org. */
export async function removeCampaign(organizationId: string, campaignId: string) {
  const count = await repo.deleteAdCampaign(organizationId, campaignId);
  if (count === 0) throw new ApiError("Campaign not found", 404);
}
