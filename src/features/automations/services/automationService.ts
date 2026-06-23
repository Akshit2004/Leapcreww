import type { Prisma } from "@prisma/client";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import { prisma } from "@/shared/lib/prisma";
import * as repo from "../repositories/automationRepo";
import type { AutomationStep } from "../repositories/automationRepo";

export type { AutomationCreate } from "../repositories/automationRepo";

export const listAutomations = (orgId: string) => repo.listByOrg(orgId);
export const getAutomation = (id: string, orgId: string) => repo.findById(id, orgId);
export const createAutomation = (data: Parameters<typeof repo.create>[0]) => repo.create(data);
export const deleteAutomation = (id: string, orgId: string) => repo.remove(id, orgId);

export function updateAutomation(
  id: string,
  orgId: string,
  data: {
    name?: string;
    triggerType?: string;
    triggerConfig?: Prisma.InputJsonValue;
    steps?: Prisma.InputJsonValue;
    templateName?: string;
    templateParams?: string[];
    isActive?: boolean;
  }
) {
  return repo.update(id, orgId, data);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactInfo = { id?: string; name: string; phone: string };

type DbAutomation = {
  id: string;
  steps: unknown;
  templateName: string;
  templateParams: unknown;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function interpolate(params: string[], contact: ContactInfo): string[] {
  return params.map((p) =>
    p
      .replace(/\{\{contact\.name\}\}/g, contact.name)
      .replace(/\{\{contact\.phone\}\}/g, contact.phone)
  );
}

function getSteps(automation: DbAutomation): AutomationStep[] {
  const arr = Array.isArray(automation.steps) ? (automation.steps as AutomationStep[]) : [];
  if (arr.length > 0) return arr;
  if (automation.templateName) {
    return [
      {
        type: "send_template",
        templateName: automation.templateName,
        templateParams: Array.isArray(automation.templateParams)
          ? (automation.templateParams as string[])
          : [],
        delayMinutes: 0,
      },
    ];
  }
  return [];
}

export async function fireStep(
  step: AutomationStep,
  contact: ContactInfo,
  orgId: string
): Promise<void> {
  if (step.type === "send_template" && step.templateName) {
    const params = interpolate(step.templateParams ?? [], contact);
    const components: Record<string, unknown>[] = [];
    if (params.length > 0) {
      components.push({
        type: "body",
        parameters: params.map((v) => ({ type: "text", text: v })),
      });
    }
    await sendWhatsAppMessage(
      {
        to: formatPhoneNumber(contact.phone),
        template: {
          name: step.templateName,
          language: { code: "en_US" },
          components,
        },
      },
      orgId
    );
  } else if (step.type === "add_tag" && step.tag) {
    const contactId = contact.id || (await lookupContactId(contact.phone, orgId));
    if (contactId) {
      const c = await prisma.contact.findUnique({ where: { id: contactId }, select: { tags: true } });
      if (c && !c.tags.includes(step.tag)) {
        await prisma.contact.update({ where: { id: contactId }, data: { tags: { push: step.tag } } });
      }
    }
  } else if (step.type === "remove_tag" && step.tag) {
    const contactId = contact.id || (await lookupContactId(contact.phone, orgId));
    if (contactId) {
      const c = await prisma.contact.findUnique({ where: { id: contactId }, select: { tags: true } });
      if (c) {
        await prisma.contact.update({
          where: { id: contactId },
          data: { tags: c.tags.filter((t) => t !== step.tag) },
        });
      }
    }
  }
}

async function lookupContactId(phone: string, orgId: string): Promise<string | null> {
  const c = await prisma.contact.findFirst({
    where: { organizationId: orgId, phone },
    select: { id: true },
  });
  return c?.id ?? null;
}

async function executeSteps(
  automation: DbAutomation,
  contact: ContactInfo,
  orgId: string
): Promise<void> {
  const steps = getSteps(automation);
  if (steps.length === 0) return;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.delayMinutes === 0) {
      await fireStep(step, contact, orgId);
    } else {
      await repo.enqueueStep({
        automationId: automation.id,
        contactId: contact.id ?? "",
        contactPhone: contact.phone,
        contactName: contact.name,
        stepIndex: i,
        stepData: step as unknown as Prisma.InputJsonValue,
        scheduledAt: new Date(Date.now() + step.delayMinutes * 60 * 1000),
        organizationId: orgId,
      });
    }
  }

  await repo.bumpRunCount(automation.id);
}

// ─── Trigger: keyword ─────────────────────────────────────────────────────────

export async function runKeywordAutomations(
  orgId: string,
  text: string,
  contact: ContactInfo
): Promise<boolean> {
  const automations = await repo.findActiveByTrigger(orgId, "keyword");
  const lower = text.toLowerCase().trim();

  for (const a of automations) {
    const cfg = a.triggerConfig as { keywords?: string[]; matchType?: string };
    const keywords: string[] = cfg.keywords ?? [];
    const matchType = cfg.matchType ?? "exact";

    const hit = keywords.some((kw) => {
      const k = kw.toLowerCase().trim();
      if (matchType === "contains") return lower.includes(k);
      if (matchType === "starts_with") return lower.startsWith(k);
      return lower === k;
    });

    if (hit) {
      await executeSteps(a, contact, orgId).catch((e) =>
        console.error(`[Automation] keyword fire failed for ${a.id}:`, e)
      );
      return true;
    }
  }
  return false;
}

// ─── Trigger: welcome ─────────────────────────────────────────────────────────

export async function runWelcomeAutomations(
  orgId: string,
  contact: ContactInfo
): Promise<void> {
  const automations = await repo.findActiveByTrigger(orgId, "welcome");
  for (const a of automations) {
    await executeSteps(a, contact, orgId).catch((e) =>
      console.error(`[Automation] welcome fire failed for ${a.id}:`, e)
    );
  }
}

// ─── Trigger: button_reply ────────────────────────────────────────────────────

export async function runButtonReplyAutomations(
  orgId: string,
  payloadId: string,
  contact: ContactInfo
): Promise<boolean> {
  const automations = await repo.findActiveByTrigger(orgId, "button_reply");
  const lower = payloadId.toLowerCase().trim();

  for (const a of automations) {
    const cfg = a.triggerConfig as { payloadId?: string };
    if ((cfg.payloadId ?? "").toLowerCase().trim() === lower) {
      await executeSteps(a, contact, orgId).catch((e) =>
        console.error(`[Automation] button_reply fire failed for ${a.id}:`, e)
      );
      return true;
    }
  }
  return false;
}

// ─── Trigger: tag_added ───────────────────────────────────────────────────────

export async function runTagAutomations(
  orgId: string,
  tag: string,
  contact: ContactInfo
): Promise<void> {
  const automations = await repo.findActiveByTrigger(orgId, "tag_added");
  for (const a of automations) {
    const cfg = a.triggerConfig as { tag?: string };
    if ((cfg.tag ?? "").toLowerCase().trim() === tag.toLowerCase().trim()) {
      await executeSteps(a, contact, orgId).catch((e) =>
        console.error(`[Automation] tag_added fire failed for ${a.id}:`, e)
      );
    }
  }
}

// ─── Contact tag helper (called from customers API) ───────────────────────────

export async function triggerTagAutomationsForContact(
  orgId: string,
  contactId: string,
  newTags: string[],
  previousTags: string[]
): Promise<void> {
  const addedTags = newTags.filter((t) => !previousTags.includes(t));
  if (addedTags.length === 0) return;

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, name: true, phone: true },
  });
  if (!contact) return;

  for (const tag of addedTags) {
    await runTagAutomations(orgId, tag, contact);
  }
}
