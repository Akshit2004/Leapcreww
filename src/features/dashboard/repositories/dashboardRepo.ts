/** dashboardRepo.ts — Prisma access for dashboard hydration, sandbox tooling, and org-level toggles. */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

const TEMPLATE_SELECT = {
  id: true,
  name: true,
  body: true,
  category: true,
  buttons: true,
  mediaType: true,
  mediaUrl: true,
  metaStatus: true,
  metaId: true,
  isShared: true,
  organizationId: true,
  createdAt: true,
} satisfies Prisma.TemplateSelect;

const ORGANIZATION_SELECT = {
  id: true,
  name: true,
  slug: true,
  whatsappConnected: true,
  whatsappBusinessAccountId: true,
  whatsappPhoneNumberId: true,
  metaBusinessId: true,
  walletBalance: true,
  onboardingDismissed: true,
  marketplaceBotEnabled: true,
  activeUseCase: true,
  appointmentPreset: true,
  businessVertical: true,
  useCaseOnboarded: true,
  navShowAllTabs: true,
  chatbotBuilderEnabled: true,
  brandProfile: true,
  aiKnowledgeBase: true,
  aiPersona: true,
  aiTemperature: true,
} satisfies Prisma.OrganizationSelect;

export function findOrganization(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: ORGANIZATION_SELECT,
  });
}

export function findOrganizationName(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });
}

export function findMembers(orgId: string) {
  return prisma.membership.findMany({
    where: { organizationId: orgId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export function findContacts(orgId: string) {
  return prisma.contact.findMany({
    where: { organizationId: orgId },
    orderBy: { updatedAt: "desc" },
  });
}

export function findCampaigns(orgId: string) {
  return prisma.campaign.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    include: { segment: true },
  });
}

export function findOwnTemplates(orgId: string) {
  return prisma.template.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: TEMPLATE_SELECT,
  });
}

export function findSharedTemplates(orgId: string) {
  return prisma.template.findMany({
    where: { isShared: true, organizationId: { not: orgId } },
    orderBy: { createdAt: "desc" },
    select: TEMPLATE_SELECT,
  });
}

export function findChatbotNodes(orgId: string) {
  return prisma.chatbotNode.findMany({
    where: { organizationId: orgId },
    orderBy: { id: "asc" },
  });
}

export function findIntegrations(orgId: string) {
  return prisma.integration.findMany({
    where: { organizationId: orgId },
    orderBy: { id: "asc" },
  });
}

export function findSystemLogs(orgId: string) {
  return prisma.systemLog.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export function findMessages(orgId: string) {
  return prisma.message.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "asc" },
  });
}

export function findOrders(orgId: string) {
  return prisma.order.findMany({
    where: { organizationId: orgId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}

export function updateBrandProfile(orgId: string, brandProfile: { name: string; industry: string; toneOfVoice: string }) {
  return prisma.organization.update({
    where: { id: orgId },
    data: { brandProfile },
    select: { id: true, brandProfile: true },
  });
}

export function updateOnboardingDismissed(orgId: string, dismissed: boolean) {
  return prisma.organization.update({
    where: { id: orgId },
    data: { onboardingDismissed: dismissed },
  });
}

/** Wipe sandbox data for an org and reset contacts to their onboarding baseline. */
export function resetSandboxData(orgId: string) {
  return prisma.$transaction([
    prisma.message.deleteMany({
      where: { organizationId: orgId },
    }),
    prisma.template.deleteMany({
      where: { organizationId: orgId },
    }),
    prisma.campaign.deleteMany({
      where: { organizationId: orgId },
    }),
    prisma.systemLog.deleteMany({
      where: { organizationId: orgId },
    }),
    prisma.contact.updateMany({
      where: { organizationId: orgId },
      data: {
        lastMessage: null,
        lastMessageTime: null,
        unreadCount: 0,
        assignedAgent: "None",
        currentNodeId: null,
      },
    }),
  ]);
}

export function createSystemLog(orgId: string, type: string, message: string) {
  return prisma.systemLog.create({
    data: { type, message, organizationId: orgId },
  });
}

export function countSandboxMetrics(orgId: string) {
  return Promise.all([
    prisma.message.count({ where: { organizationId: orgId } }),
    prisma.template.count({ where: { organizationId: orgId } }),
    prisma.campaign.count({ where: { organizationId: orgId } }),
  ]);
}
