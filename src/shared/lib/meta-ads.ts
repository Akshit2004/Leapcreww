import { prisma } from "./prisma";

export interface MetaAdsConfig {
  accessToken: string;
  businessAccountId: string;
  metaBusinessId: string;
}

/**
 * Get Meta Ads configuration for an organization.
 * Uses the platform-level System User Token (from env) combined with
 * the tenant's Meta Business ID (from database).
 */
export async function getMetaAdsConfig(orgId: string): Promise<MetaAdsConfig | null> {
  const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  if (!systemToken) {
    console.warn("[Meta Ads] WHATSAPP_SYSTEM_USER_TOKEN not configured");
    return null;
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      whatsappBusinessAccountId: true,
      metaBusinessId: true,
    },
  });

  if (!org || !org.whatsappBusinessAccountId) {
    return null;
  }

  return {
    accessToken: systemToken,
    businessAccountId: org.whatsappBusinessAccountId,
    metaBusinessId: org.metaBusinessId || org.whatsappBusinessAccountId,
  };
}

/**
 * Helper to call the Meta Graph API.
 */
async function callMetaApi(path: string, method: string, payload: any, token: string) {
  const url = `https://graph.facebook.com/v20.0/${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `Meta API error (${response.status})`);
  }
  return data;
}

export interface AdCampaignInsights {
  impressions: number;
  clicks: number;
  ctr: number;
  spent: number;
}

/**
 * Fetch live spend/reach metrics for a campaign from the Meta Marketing API.
 * Returns null if Meta isn't configured or the campaign has no live metaCampaignId
 * (e.g. simulated campaigns) — callers should fall back to zeroed metrics.
 */
export async function getCampaignInsights(orgId: string, metaCampaignId: string): Promise<AdCampaignInsights | null> {
  const config = await getMetaAdsConfig(orgId);
  if (!config || !metaCampaignId || metaCampaignId.startsWith("sim_")) return null;

  try {
    const url =
      `https://graph.facebook.com/v20.0/${metaCampaignId}/insights` +
      `?fields=impressions,clicks,ctr,spend&access_token=${config.accessToken}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      console.warn(`[Meta Ads] Insights fetch failed for ${metaCampaignId}:`, data.error?.message);
      return null;
    }
    const row = data.data?.[0];
    if (!row) return { impressions: 0, clicks: 0, ctr: 0, spent: 0 };
    return {
      impressions: parseInt(row.impressions || "0", 10),
      clicks: parseInt(row.clicks || "0", 10),
      ctr: parseFloat(row.ctr || "0"),
      spent: parseFloat(row.spend || "0"),
    };
  } catch (err) {
    console.error(`[Meta Ads] Insights request error for ${metaCampaignId}:`, err);
    return null;
  }
}

/**
 * Publishes a Click-to-WhatsApp Campaign, Ad Set, Creative, and Ad to Meta.
 * Requires valid Meta token and permissions.
 */
export async function publishMetaAdCampaign(orgId: string, details: {
  name: string;
  budget: number;
  objective: string;
  pageId: string;
  adAccountId: string;
  creative: {
    headline: string;
    primaryText: string;
    imagePrompt: string;
    imageUrl?: string;
  };
  linkedTemplate?: string;
}) {
  const config = await getMetaAdsConfig(orgId);
  if (!config) {
    throw new Error("Meta Ads configuration is missing or incomplete for this organization.");
  }
  if (!details.adAccountId || details.adAccountId.startsWith("mock")) {
    throw new Error("A valid Live Meta Ad Account ID is required.");
  }

  const token = config.accessToken;
  const cleanAdAccountId = details.adAccountId.replace("act_", "");

  try {
    // 1. Create Campaign
    console.log("[Meta Ads] Creating Live Campaign on Meta...");
    const campaignRes = await callMetaApi(`act_${cleanAdAccountId}/campaigns`, "POST", {
      name: details.name,
      objective: "OUTCOME_ENGAGEMENT",
      special_ad_categories: "NONE",
      status: "PAUSED",
    }, token);

    const metaCampaignId = campaignRes.id;

    // 2. Create Ad Set
    console.log("[Meta Ads] Creating Live Ad Set on Meta...");
    const adsetRes = await callMetaApi(`act_${cleanAdAccountId}/adsets`, "POST", {
      name: `${details.name} - Ad Set`,
      campaign_id: metaCampaignId,
      daily_budget: Math.round(details.budget * 100), // Budget in cents
      billing_event: "IMPRESSIONS",
      optimization_goal: "REPLIES",
      destination_type: "WHATSAPP",
      targeting: {
        geo_locations: { countries: ["IN"] },
      },
      promoted_object: {
        page_id: details.pageId,
      },
      status: "PAUSED",
    }, token);

    const metaAdSetId = adsetRes.id;

    // 3. Create Ad Creative
    console.log("[Meta Ads] Creating Live Ad Creative on Meta...");
    const creativeRes = await callMetaApi(`act_${cleanAdAccountId}/adcreatives`, "POST", {
      name: `${details.name} - Creative`,
      object_story_spec: {
        page_id: details.pageId,
        link_data: {
          message: details.creative.primaryText,
          link: `https://wa.me/${process.env.NEXT_PUBLIC_SYSTEM_WHATSAPP_NUMBER || ""}`,
          name: details.creative.headline,
          picture: details.creative.imageUrl || "https://images.unsplash.com/photo-1596524430615-b46475ddff6e?w=800",
          call_to_action: {
            type: "MESSAGE_PAGE",
            value: {
              app_destination: "WHATSAPP",
            },
          },
        },
      },
    }, token);

    const metaCreativeId = creativeRes.id;

    // 4. Create Ad
    console.log("[Meta Ads] Creating Live Ad on Meta...");
    const adRes = await callMetaApi(`act_${cleanAdAccountId}/ads`, "POST", {
      name: `${details.name} - Ad`,
      adset_id: metaAdSetId,
      creative: { creative_id: metaCreativeId },
      status: "PAUSED",
    }, token);

    return {
      campaignId: metaCampaignId,
      adId: adRes.id,
      simulated: false,
    };
  } catch (err: any) {
    console.error("[Meta Ads] Live publishing failed. Error:", err.message);
    throw new Error(`Live Meta API publishing failed: ${err.message}`);
  }
}
