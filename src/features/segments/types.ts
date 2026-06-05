/** Segments feature types (T-04 — smart audience segmentation). */

export type SegmentOp = "eq" | "neq" | "contains" | "in" | "active_within_days";

export interface SegmentRule {
  field: "tags" | "status" | "source" | "attribute" | "lastActive";
  op: SegmentOp;
  value: string | string[] | number;
  key?: string; // when field === "attribute", the attribute key
}

/** A segment matches a contact when ALL of `all` and ANY of `any` rules pass. */
export interface SegmentRules {
  all?: SegmentRule[];
  any?: SegmentRule[];
}

export interface SegmentInput {
  name: string;
  rules: SegmentRules;
  organizationId: string;
}
