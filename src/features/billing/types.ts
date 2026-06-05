/** Billing feature types (T-06 — conversation billing & cost ledger). */

export type MessageCategory = "marketing" | "utility" | "authentication" | "service";

export interface RecordUsageInput {
  organizationId: string;
  type: "message" | "template" | "conversation";
  category?: MessageCategory;
  units?: number;
  campaignId?: string;
  /** Country code (ISO-2) to price against; defaults to "IN". */
  country?: string;
}
