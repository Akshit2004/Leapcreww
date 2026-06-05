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
