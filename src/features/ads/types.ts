/** Ads feature types (T-01 — Click-to-WhatsApp Ads). */

export interface AdCreativeRequest {
  topic: string;
  orgId: string;
}

export interface AdCreative {
  headline: string;
  primaryText: string;
  imagePrompt: string;
}

export interface CreateAdInput {
  headline: string;
  primaryText: string;
  imageUrl?: string;
  welcomeTemplate?: string;
  organizationId: string;
  adCampaignId?: string;
}

export interface AdCreativeFields {
  headline: string;
  primaryText: string;
  imagePrompt: string;
  imageUrl?: string;
}

export interface PublishAdCampaignInput {
  organizationId: string;
  name: string;
  budget: number;
  objective: string;
  pageId: string;
  adAccountId: string;
  creative: AdCreativeFields;
  linkedTemplate?: string;
}

/** Per-campaign performance metrics shown in AdsTab. */
export interface AdCampaignMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  spent: number;
  leads: number;
  live: boolean;
}
