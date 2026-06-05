/**
 * Connector contract (T-07 — Integrations Hub).
 *
 * Each third-party integration (Zapier, Google Sheets, WooCommerce, HubSpot,
 * Salesforce) implements this interface. The registry exposes them uniformly
 * to the Integrations UI and to the connect/disconnect routes.
 */

export interface ConnectorContext {
  organizationId: string;
  apiKey?: string;
  webhookUrl?: string;
}

export interface InboundLead {
  name?: string;
  phone: string;
  email?: string;
  tags?: string[];
  source: string;
}

export interface Connector {
  /** Stable id stored on Integration.id (e.g. "woocommerce"). */
  id: string;
  name: string;
  description: string;
  /** Validate credentials / establish the connection. */
  connect(ctx: ConnectorContext): Promise<{ ok: boolean; error?: string }>;
  /** Optional: normalize an inbound webhook payload into leads. */
  parseWebhook?(payload: unknown): InboundLead[];
}
