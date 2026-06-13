/** dashboardService.ts — Dashboard hydration payload, brand profile, onboarding, and sandbox tooling. */
import { ApiError } from "@/shared/lib/api";
import * as repo from "../repositories/dashboardRepo";

const IST_TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
};

/** Assemble the full dashboard hydration payload for an organization. */
export async function getDashboardData(orgId: string) {
  const organization = await repo.findOrganization(orgId);
  if (!organization) {
    throw new ApiError("Organization not found.", 404);
  }

  const [
    memberships,
    contacts,
    campaigns,
    ownTemplates,
    sharedTemplates,
    chatbotNodes,
    integrations,
    systemLogs,
    messages,
    orders,
  ] = await Promise.all([
    repo.findMembers(orgId),
    repo.findContacts(orgId),
    repo.findCampaigns(orgId),
    repo.findOwnTemplates(orgId),
    repo.findSharedTemplates(orgId),
    repo.findChatbotNodes(orgId),
    repo.findIntegrations(orgId),
    repo.findSystemLogs(orgId),
    repo.findMessages(orgId),
    repo.findOrders(orgId),
  ]);

  const members = memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name || m.user.email.split("@")[0],
    email: m.user.email,
    role: m.role,
  }));

  const allTemplates = [...ownTemplates, ...sharedTemplates];

  // Assemble relational Message rows into dynamic ChatHistory map structure
  const chatHistory: Record<string, unknown[]> = {};

  contacts.forEach((c) => {
    chatHistory[c.id] = [];
  });

  messages.forEach((m) => {
    if (!chatHistory[m.contactId]) {
      chatHistory[m.contactId] = [];
    }
    chatHistory[m.contactId].push({
      id: m.id,
      sender: m.sender as "user" | "agent" | "system",
      text: m.text,
      timestamp: m.createdAt.toLocaleTimeString("en-IN", IST_TIME_OPTS),
      createdAt: m.createdAt.toISOString(),
      status: m.status as "sent" | "delivered" | "read" | undefined,
      buttons: m.buttons as string[],
    });
  });

  const formattedLogs = systemLogs.map((log) => ({
    ...log,
    timestamp: log.createdAt.toLocaleTimeString("en-IN", IST_TIME_OPTS),
  }));

  return {
    organization,
    contacts,
    campaigns,
    templates: allTemplates,
    chatbotNodes,
    integrations,
    systemLogs: formattedLogs,
    chatHistory,
    members,
    orders,
  };
}

export interface BrandProfileInput {
  name?: unknown;
  industry?: unknown;
  toneOfVoice?: unknown;
}

/** Update the org's brand profile (name, industry, tone of voice). */
export async function updateBrandProfile(orgId: string, input: BrandProfileInput) {
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const industry = typeof input?.industry === "string" ? input.industry.trim() : "";
  const toneOfVoice = typeof input?.toneOfVoice === "string" ? input.toneOfVoice.trim() : "";

  if (!name) {
    throw new ApiError("Brand name is required.", 400);
  }

  const organization = await repo.updateBrandProfile(orgId, { name, industry, toneOfVoice });
  return { organization };
}

/** Toggle the dismissed state of the onboarding checklist for an org. */
export async function setOnboardingDismissed(orgId: string, dismissed: boolean) {
  const organization = await repo.updateOnboardingDismissed(orgId, dismissed);
  return { organization };
}

/** Wipe sandbox data (messages, templates, campaigns, logs) and reset contacts to baseline. */
export async function resetSandbox(orgId: string) {
  await repo.resetSandboxData(orgId);

  await repo.createSystemLog(
    orgId,
    "crm",
    "Sandbox sandbox environment successfully flushed and re-initialized."
  );

  return {
    ok: true,
    message: "Sandbox successfully reset! Your local inbox, campaigns, and templates are clean.",
  };
}

/** Fetch sandbox usage counters for an org. */
export async function getSandboxMetrics(orgId: string) {
  const org = await repo.findOrganizationName(orgId);
  if (!org) {
    throw new ApiError("Organization not found", 404);
  }

  const [totalMessages, totalTemplates, totalCampaigns] = await repo.countSandboxMetrics(orgId);

  return {
    orgName: org.name,
    totalMessages,
    totalTemplates,
    totalCampaigns,
  };
}
