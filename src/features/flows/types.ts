/** Flows feature types (T-02 — WhatsApp Flows & Forms). */

export interface FlowInput {
  name: string;
  category?: string; // Meta flow category, e.g. LEAD_GENERATION
  flowJson: Record<string, unknown>; // Meta Flow JSON definition
  organizationId: string;
}
