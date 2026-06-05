/**
 * flowService.ts — WhatsApp Flows & Forms (T-02).
 *
 * CRUD is live. publishToMeta() is the documented TODO: POST the flowJson to
 * /<waba>/flows, then attach via an interactive "flow" message (extend the
 * WhatsAppMessage type in shared/lib/whatsapp.ts).
 */
import * as repo from "../repositories/flowRepo";
import type { FlowInput } from "../types";

export function listFlows(organizationId: string) {
  return repo.listFlows(organizationId);
}

export function createFlow(input: FlowInput) {
  return repo.createFlow({
    name: input.name,
    category: input.category ?? "LEAD_GENERATION",
    flowJson: input.flowJson as object,
    organizationId: input.organizationId,
  });
}

/** TODO(T-02): publish to Meta Flows API and store the returned metaFlowId. */
export async function publishToMeta(): Promise<never> {
  throw new Error("publishToMeta not implemented: wire Meta Flows API (/<waba>/flows)");
}
