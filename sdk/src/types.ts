// ─── Shared primitives ───────────────────────────────────────────────────────

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  tags: string[];
  attributes: Record<string, string | number | boolean>;
  status: string;
  source: string;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  category: "Marketing" | "Utility" | "Authentication";
  body: string;
  metaStatus: "pending" | "approved" | "rejected";
  createdAt: string;
}

export type EventType =
  | "message.received"
  | "message.status"
  | "order.placed"
  | "contact.created";

export interface Event {
  id: string;
  type: EventType;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface Me {
  organizationId: string;
  name: string;
  scopes: string[];
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface TemplateParams {
  name: string;
  language?: string;
  variables?: string[];
}

export interface MediaParams {
  type: "image" | "video" | "document";
  url: string;
  caption?: string;
}

export interface SendMessageParams {
  /** Destination phone in E.164 format, e.g. "+919876543210". */
  to: string;
  /** Free-form text. Requires an active 24-hour customer session. */
  text?: string;
  /** Template name (shorthand, uses en_US with no variables) or full template object. */
  template?: string | TemplateParams;
  /** Attach an image, video, or document. */
  media?: MediaParams;
  /** Pass a unique string to make sends idempotent (safe to retry). Max 255 chars. */
  idempotencyKey?: string;
}

export interface SendMessageResult {
  ok: boolean;
  waMessageId: string | null;
  error: string | null;
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export interface UpsertContactParams {
  phone: string;
  name?: string;
  email?: string;
  /** Merged (not replaced) with existing tags. */
  tags?: string[];
  /** Shallow-merged with existing attributes. */
  attributes?: Record<string, string | number | boolean>;
  source?: string;
}

export interface UpsertContactResult {
  contact: Contact;
  /** true if the contact was newly created, false if updated. */
  created: boolean;
}

export interface ListContactsParams {
  phone?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface ListContactsResult {
  contacts: Contact[];
}

// ─── Events ──────────────────────────────────────────────────────────────────

export interface ListEventsParams {
  type?: EventType;
  /** ISO 8601 timestamp — return events strictly after this time. */
  after?: string;
  limit?: number;
}

export interface ListEventsResult {
  events: Event[];
  /** Pass as `after` on the next call to fetch only newer events. */
  nextAfter: string | null;
}

// ─── SDK options ─────────────────────────────────────────────────────────────

export interface LeapCrewwOptions {
  apiKey: string;
  /** Override the base URL. Defaults to "https://app.leapcreww.com". */
  baseUrl?: string;
  /** Fetch timeout in milliseconds. Defaults to 30 000. */
  timeout?: number;
}
