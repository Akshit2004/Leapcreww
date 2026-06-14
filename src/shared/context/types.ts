import type { Dispatch, SetStateAction } from "react";
import type { LeadQualifierConfig } from "@/features/campaigns/lib/leadQualifier";

export interface BrandProfile {
  name: string;
  industry: string;
  toneOfVoice: string;
  websiteUrl?: string;
}

export interface Organization {
  id: string;
  name?: string;
  onboardingDismissed?: boolean;
  walletBalance?: number;
  brandProfile?: BrandProfile | null;
  marketplaceBotEnabled?: boolean;
  activeUseCase?: "NONE" | "MARKETPLACE" | "APPOINTMENT";
  appointmentPreset?: "HEALTHCARE" | "HOSPITALITY" | "EDUCATION" | "CORPORATE";
  chatbotBuilderEnabled?: boolean;
  aiKnowledgeBase?: string | null;
  aiPersona?: string | null;
  aiTemperature?: number | null;
  [key: string]: unknown;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  source: string;
  tags: string[];
  status: "Active" | "Inactive";
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  assignedAgent?: string;
  attributes?: Record<string, any> | null;
  lastActiveAt?: string | null;
}

export interface Message {
  id: string;
  sender: "user" | "agent" | "system";
  text: string;
  timestamp: string;
  createdAt?: string;
  status?: "sent" | "delivered" | "read";
  buttons?: string[];
}

export interface ChatHistory {
  [contactId: string]: Message[];
}

export interface Campaign {
  id: string;
  name: string;
  targetTag: string;
  templateName: string;
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  status: "Completed" | "Active" | "Scheduled" | "Sending" | "Failed" | "PendingTemplate";
  date: string;
  scheduledAt?: string;
  excludeTag?: string;
  mediaType?: string;
  mediaUrl?: string;
  variables?: Array<{ key: string; type: "contact_field" | "static"; value: string }>;
  delay?: number;
  organizationId?: string;
  createdAt?: string;
  segmentId?: string | null;
  segment?: { id: string; name: string; rules: any } | null;
}

export interface Template {
  id: string;
  name: string;
  body: string;
  category: "Marketing" | "Utility" | "Authentication";
  buttons: string[];
  mediaType?: "none" | "image" | "video" | "document";
  mediaUrl?: string | null;
  metaStatus?: "pending" | "approved" | "rejected";
  metaId?: string;
  isShared?: boolean;
  organizationId?: string;
}

export interface ChatbotNode {
  id: string;
  type: "trigger" | "message" | "question" | "delay";
  title: string;
  content: string;
  options?: string[]; // for questions
  delayTime?: number; // for delay in seconds
  nextId?: string;
  routes?: { [option: string]: string }; // routes for question options
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  status: "connected" | "disconnected";
  icon: string;
  apiKey?: string;
  webhookUrl?: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  type: "campaign" | "chat" | "integration" | "crm";
  message: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AppContextType {
  organization: Organization | null;
  contacts: Contact[];
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  campaigns: Campaign[];
  templates: Template[];
  chatHistory: ChatHistory;
  chatbotNodes: ChatbotNode[];
  integrations: Integration[];
  systemLogs: SystemLog[];
  members: Member[];
  orders: any[];
  activeContactId: string | null;
  setActiveContactId: (id: string | null) => void;
  // Actions
  addContact: (contact: Omit<Contact, "id">) => Promise<Contact | undefined>;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  deleteCampaign: (id: string) => Promise<void>;
  sendBroadcast: (campaign: {
    name: string;
    targetTag: string;
    templateName: string;
    organizationId: string;
    variables?: Array<{ key: string; type: "contact_field" | "static"; value: string }>;
    delay?: number;
    scheduledAt?: string;
    excludeTag?: string;
    mediaType?: string;
    mediaUrl?: string;
    segmentId?: string;
    leadQualifier?: LeadQualifierConfig;
  }) => Promise<void>;
  sendLiveChatMessage: (contactId: string, text: string, sender?: "user" | "agent" | "system", buttons?: string[]) => void;
  updateChatbotNodes: (nodes: ChatbotNode[], organizationId: string) => Promise<void>;
  toggleIntegration: (id: string, config?: { apiKey?: string; webhookUrl?: string }) => void;
  addSystemLog: (type: SystemLog["type"], message: string) => void;
  clearSystemLogs: (orgId?: string) => void;
  submitMetaTemplate: (templateData: {
    name: string;
    category: string;
    body: string;
    buttons: string[];
    mediaType: string;
    mediaUrl?: string;
    organizationId: string;
  }) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  lockSync: () => void;
  unlockSync: () => void;
  refreshWorkspace: (orgId: string) => Promise<void>;
  dismissOnboarding: (orgId: string) => Promise<void>;
  updateBrandProfile: (orgId: string, profile: BrandProfile) => Promise<void>;
  initializeWorkspace: (data: {
    organization: Organization | null;
    contacts: Contact[];
    campaigns: Campaign[];
    templates: Template[];
    chatHistory: ChatHistory;
    chatbotNodes: ChatbotNode[];
    integrations: Integration[];
    systemLogs: SystemLog[];
    members: Member[];
    orders?: any[];
  }) => void;
}
