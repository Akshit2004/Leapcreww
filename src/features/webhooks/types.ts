/** Webhooks feature types — inbound processing + outbound subscriptions (T-08). */

export const WEBHOOK_EVENTS = ["message.received", "message.status", "order.placed"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export function isWebhookEvent(value: string): value is WebhookEvent {
  return (WEBHOOK_EVENTS as readonly string[]).includes(value);
}

export interface CreateSubscriptionInput {
  url: string;
  events: WebhookEvent[];
  organizationId: string;
}

/** Envelope POSTed to subscriber endpoints. */
export interface WebhookEnvelope {
  id: string; // delivery id — subscribers can use it for their own dedup
  event: WebhookEvent | "test";
  createdAt: string; // ISO timestamp
  data: Record<string, unknown>;
}

export interface TestDeliveryResult {
  ok: boolean;
  status: number | null;
  durationMs: number;
  error?: string;
}
