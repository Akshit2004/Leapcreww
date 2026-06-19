/** Recipes feature types — one-click installable automation bundles. */
import type { SequenceStepInput, SequenceTrigger } from "@/features/sequences/types";

export type RecipeId =
  | "abandoned_cart"
  | "welcome_flow"
  | "ad_lead_nurture"
  | "order_confirmation"
  | "review_request"
  | "win_back"
  | "cod_confirmation"
  | "launch_waitlist"
  | "flash_sale_drop"
  | "ndr_recovery"
  | "order_shipped_notification"
  | "post_delivery_review"
  | "size_finder"
  | "shade_finder"
  | "beauty_replenishment"
  | "address_verification"
  | "ofd_reminder"
  | "rto_winback"
  | "cod_risk_verification";

/** A Meta template the recipe needs; created + submitted during install. */
export interface RecipeTemplateDef {
  name: string; // exact engine-recognized name, e.g. "cart_recovery"
  category: "Marketing" | "Utility";
  body: string; // {{1}}-style Meta placeholders
  buttons: string[];
}

export interface RecipeDefinition {
  id: RecipeId;
  title: string;
  tagline: string; // one-line value pitch shown on the card
  emoji: string;
  /** What the user should know before enabling (trigger source, timing). */
  firesWhen: string;
  category: string;  // e.g. "E-Commerce", "Engagement", "Lead Generation"
  templates: RecipeTemplateDef[];
  sequence: {
    name: string;
    trigger: SequenceTrigger;
    /** Extra config merged into triggerConfig alongside the recipeId marker. */
    triggerConfig?: Record<string, unknown>;
    steps: SequenceStepInput[];
  };
}

/** Catalog entry + per-org install state, as served to the UI. */
export interface RecipeWithStatus {
  id: RecipeId;
  title: string;
  tagline: string;
  emoji: string;
  firesWhen: string;
  category: string;
  templateCount: number;
  stepCount: number;
  installed: boolean;
  sequenceId: string | null;
  firstTemplateName: string | null;
}

/** Result of a one-click install. */
export interface InstallResult {
  sequenceId: string;
  templates: { name: string; existed: boolean; submittedToMeta: boolean }[];
}
