/** Sequences feature types (T-03 — drip / journey automation). */

export type SequenceTrigger =
  | "tag_added"
  | "form_submit"
  | "ad_click"
  | "cart_abandoned"
  | "signup";

export type StepAction = "send_template" | "send_message" | "add_tag" | "branch";

export interface SequenceStepInput {
  order: number;
  delayMinutes: number;
  actionType: StepAction;
  templateName?: string;
  message?: string;
  conditions?: Record<string, unknown>;
}

export interface SequenceInput {
  name: string;
  trigger: SequenceTrigger;
  triggerConfig?: Record<string, unknown>;
  organizationId: string;
  steps: SequenceStepInput[];
  segmentId?: string;
}
