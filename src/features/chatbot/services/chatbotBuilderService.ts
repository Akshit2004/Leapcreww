/**
 * chatbotBuilderService.ts — Business logic for the visual chatbot builder:
 * saving the node layout and toggling builder vs. Pure AI Mode / AI agent settings.
 */
import { ApiError } from "@/shared/lib/api";
import * as repo from "../repositories/chatbotRepo";
import type { ChatbotNodeInput, AiAgentSettingsInput } from "../repositories/chatbotRepo";

const MAX_TEXT_LENGTH = 8000;

/** Replace an org's chatbot node layout atomically and log the save. */
export async function saveNodes(organizationId: string, nodes: ChatbotNodeInput[]) {
  if (!Array.isArray(nodes)) throw new ApiError("Invalid nodes list payload", 400);

  await repo.replaceNodes(organizationId, nodes);
  await repo.logNodesSaved(organizationId, nodes.length);

  return { count: nodes.length };
}

/** Toggle the visual builder vs. Pure AI Mode for an org. */
export async function setChatbotBuilderEnabled(organizationId: string, enabled: unknown) {
  if (typeof enabled !== "boolean") throw new ApiError("Enabled parameter must be a boolean.", 400);
  return repo.updateChatbotBuilderEnabled(organizationId, enabled);
}

interface AiAgentSettingsRequest {
  aiKnowledgeBase?: unknown;
  aiPersona?: unknown;
  aiTemperature?: unknown;
}

/** Validate and persist the free-form AI autoresponder's knowledge base, persona and temperature. */
export async function updateAiAgentSettings(organizationId: string, input: AiAgentSettingsRequest) {
  const { aiKnowledgeBase, aiPersona, aiTemperature } = input;

  if (aiKnowledgeBase !== undefined && aiKnowledgeBase !== null && typeof aiKnowledgeBase !== "string") {
    throw new ApiError("Knowledge base must be a string.", 400);
  }
  if (aiPersona !== undefined && aiPersona !== null && typeof aiPersona !== "string") {
    throw new ApiError("Persona must be a string.", 400);
  }
  if (typeof aiKnowledgeBase === "string" && aiKnowledgeBase.length > MAX_TEXT_LENGTH) {
    throw new ApiError(`Knowledge base must be under ${MAX_TEXT_LENGTH} characters.`, 400);
  }
  if (typeof aiPersona === "string" && aiPersona.length > MAX_TEXT_LENGTH) {
    throw new ApiError(`Persona must be under ${MAX_TEXT_LENGTH} characters.`, 400);
  }

  let temperature: number | undefined;
  if (aiTemperature !== undefined && aiTemperature !== null) {
    temperature = Number(aiTemperature);
    if (Number.isNaN(temperature) || temperature < 0 || temperature > 1.5) {
      throw new ApiError("Temperature must be a number between 0 and 1.5.", 400);
    }
  }

  const data: AiAgentSettingsInput = {
    ...(aiKnowledgeBase !== undefined ? { aiKnowledgeBase: (aiKnowledgeBase as string | null)?.trim() || null } : {}),
    ...(aiPersona !== undefined ? { aiPersona: (aiPersona as string | null)?.trim() || null } : {}),
    ...(temperature !== undefined ? { aiTemperature: temperature } : {}),
  };

  return repo.updateAiAgentSettings(organizationId, data);
}
