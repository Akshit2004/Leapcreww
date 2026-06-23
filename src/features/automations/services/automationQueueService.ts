import * as repo from "../repositories/automationRepo";
import type { AutomationStep } from "../repositories/automationRepo";
import { fireStep } from "./automationService";

export async function processQueuedSteps(orgId: string): Promise<number> {
  const items = await repo.dequeueDue(orgId);

  for (const item of items) {
    const step = item.stepData as unknown as AutomationStep;
    const contact = {
      id: item.contactId || undefined,
      name: item.contactName,
      phone: item.contactPhone,
    };

    try {
      await fireStep(step, contact, orgId);
      await repo.markQueueProcessed(item.id);
    } catch (e) {
      console.error(`[Queue] Failed step ${item.stepIndex} for automation ${item.automationId}:`, e);
    }
  }

  return items.length;
}
