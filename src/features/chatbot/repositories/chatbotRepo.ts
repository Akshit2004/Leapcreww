/** chatbotRepo.ts — Prisma access for the visual chatbot builder's nodes and
 * org-level chatbot/AI-agent settings. All queries are scoped by `organizationId`. */
import { prisma } from "@/shared/lib/prisma";

export interface ChatbotNodeInput {
  id: string;
  type: string;
  title: string;
  content: string;
  options?: string[];
  delayTime?: string | number | null;
  nextId?: string | null;
  routes?: Record<string, string> | null;
}

/** Atomically replace an org's chatbot node layout: purge then recreate. */
export function replaceNodes(organizationId: string, nodes: ChatbotNodeInput[]) {
  return prisma.$transaction([
    prisma.chatbotNode.deleteMany({
      where: { organizationId },
    }),
    prisma.chatbotNode.createMany({
      data: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        title: node.title,
        content: node.content,
        options: Array.isArray(node.options) ? node.options : [],
        delayTime: node.delayTime !== undefined ? parseInt(String(node.delayTime)) : null,
        nextId: node.nextId || null,
        routes: node.routes ? node.routes : {},
        organizationId,
      })),
    }),
  ]);
}

export function logNodesSaved(organizationId: string, count: number) {
  return prisma.systemLog.create({
    data: {
      type: "crm",
      message: `Chatbot Builder visual nodes layout updated: ${count} nodes saved successfully.`,
      organizationId,
    },
  });
}

/** Toggle the visual builder vs. Pure AI Mode for an org. */
export function updateChatbotBuilderEnabled(organizationId: string, enabled: boolean) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: { chatbotBuilderEnabled: enabled },
    select: { id: true, chatbotBuilderEnabled: true },
  });
}

export interface AiAgentSettingsInput {
  aiKnowledgeBase?: string | null;
  aiPersona?: string | null;
  aiTemperature?: number;
}

/** Update the free-form AI autoresponder's knowledge base, persona and temperature. */
export function updateAiAgentSettings(organizationId: string, data: AiAgentSettingsInput) {
  return prisma.organization.update({
    where: { id: organizationId },
    data,
    select: { id: true, aiKnowledgeBase: true, aiPersona: true, aiTemperature: true },
  });
}
