/** Campaign feature types (T parity: broadcasts + scheduling). */

export interface CampaignVariable {
  key: string;
  type: "contact_field" | "static";
  value: string;
}

/** Sentinel `templateName` marking a free-form 24h session broadcast (no Meta template). */
export const SESSION_BROADCAST_TEMPLATE = "__session_broadcast__";

/** Shape of `Campaign.variables` for session broadcasts: free text + resolved recipient ids. */
export interface SessionBroadcastVariables {
  sessionText: string;
  contactIds: string[];
}

export interface LaunchSessionBroadcastInput {
  name: string;
  targetTag: string;
  text: string;
  organizationId: string;
  delay?: number;
  scheduledAt?: string;
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
  leadQualifier?: import("./lib/leadQualifier").LeadQualifierConfig | null; // post-CTA qualification config
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
