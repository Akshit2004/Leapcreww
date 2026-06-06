/** Campaign feature types (T parity: broadcasts + scheduling). */

export interface CampaignVariable {
  key: string;
  type: "contact_field" | "static";
  value: string;
}

export interface LaunchCampaignInput {
  name: string;
  targetTag: string;
  templateName?: string;
  flowId?: string;
  organizationId: string;
  variables?: CampaignVariable[];
  delay?: number;
  scheduledAt?: string;
  excludeTag?: string;
  mediaType?: string;
  mediaUrl?: string;
  segmentId?: string; // T-04: target a saved segment instead of a single tag
}

// ─── Meta template payload shapes ─────────────────────────────────────────────

export interface WhatsAppTemplateParameter {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface WhatsAppTemplateComponent {
  type: string;
  parameters: WhatsAppTemplateParameter[];
}

export interface WhatsAppTemplatePayload {
  name: string;
  language: { code: string };
  components?: WhatsAppTemplateComponent[];
}
