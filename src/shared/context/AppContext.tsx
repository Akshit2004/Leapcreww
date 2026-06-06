"use client";

import React, { createContext, useContext, useCallback, ReactNode } from "react";
import {
  Organization,
  Contact,
  ChatHistory,
  Campaign,
  Template,
  ChatbotNode,
  Integration,
  SystemLog,
  Member,
  AppContextType
} from "./types";
import { useSystemState } from "../../features/dashboard/context/useSystemState";
import { useContactState } from "../../features/inbox/context/useContactState";
import { useCampaignState } from "../../features/campaigns/context/useCampaignState";
import { useTemplateState } from "../../features/templates/context/useTemplateState";
import { useChatState } from "../../features/inbox/context/useChatState";

// Re-export all types to maintain complete backward compatibility
export * from "./types";

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const lastSyncTimeRef = React.useRef<number>(0);
  const [orders, setOrders] = React.useState<any[]>([]);
  const {
    organization,
    setOrganization,
    integrations,
    setIntegrations,
    chatbotNodes,
    setChatbotNodes,
    systemLogs,
    setSystemLogs,
    members,
    setMembers,
    syncLockedRef,
    lockSync,
    unlockSync,
    addSystemLog,
    clearSystemLogs,
    toggleIntegration,
    dismissOnboarding,
    updateBrandProfile,
    updateChatbotNodes,
  } = useSystemState();

  const {
    contacts,
    setContacts,
    activeContactId,
    setActiveContactId,
    addContact,
    updateContact,
    deleteContact,
  } = useContactState({
    addSystemLog,
    lockSync,
    unlockSync,
    setChatHistory: (val) => setChatHistory(val),
  });

  const {
    chatHistory,
    setChatHistory,
    sendLiveChatMessage,
  } = useChatState({
    addSystemLog,
    setContacts,
  });

  const {
    campaigns,
    setCampaigns,
    sendBroadcast,
    deleteCampaign,
  } = useCampaignState({
    addSystemLog,
    lockSync,
    unlockSync,
  });

  const {
    templates,
    setTemplates,
    submitMetaTemplate,
    deleteTemplate,
  } = useTemplateState({
    addSystemLog,
    lockSync,
    unlockSync,
  });

  const initializeWorkspace = useCallback((data: {
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
  }) => {
    if (syncLockedRef.current) {
      return;
    }
    setOrganization(data.organization);
    setContacts(data.contacts);
    setCampaigns(data.campaigns);
    setTemplates(data.templates);
    setChatHistory(data.chatHistory);
    setChatbotNodes(data.chatbotNodes);
    setIntegrations(data.integrations);
    setSystemLogs(data.systemLogs);
    setMembers(data.members);
    setOrders(data.orders || []);
    if (data.contacts.length > 0) {
      setActiveContactId(data.contacts[0].id);
    } else {
      setActiveContactId(null);
    }
  }, [
    syncLockedRef,
    setOrganization,
    setContacts,
    setCampaigns,
    setTemplates,
    setChatHistory,
    setChatbotNodes,
    setIntegrations,
    setSystemLogs,
    setMembers,
    setActiveContactId,
    setOrders,
  ]);

  const refreshWorkspace = useCallback(async (orgId: string) => {
    try {
      const res = await fetch(`/api/org/${orgId}/data`);
      if (res.ok) {
        const data = await res.json();
        initializeWorkspace(data);

        // Throttled Background Template Sync (Max once per 60 seconds)
        const now = Date.now();
        if (now - lastSyncTimeRef.current > 60000) {
          lastSyncTimeRef.current = now;
          fetch(`/api/org/${orgId}/templates/sync`, { method: "POST" })
            .then(async (syncRes) => {
              if (syncRes.ok) {
                const syncData = await syncRes.json();
                if (syncData.success && syncData.count > 0) {
                  // Fetch updated templates state
                  const freshRes = await fetch(`/api/org/${orgId}/data`);
                  if (freshRes.ok) {
                    initializeWorkspace(await freshRes.json());
                  }
                }
              }
            })
            .catch((err) => console.error("⚠️ Background template sync failed:", err));
        }
      }
    } catch (err) {
      console.error("Refresh Workspace Error", err);
    }
  }, [initializeWorkspace]);

  return (
    <AppContext.Provider
      value={{
        organization,
        contacts,
        campaigns,
        templates,
        chatHistory,
        chatbotNodes,
        integrations,
        systemLogs,
        members,
        orders,
        activeContactId,
        setActiveContactId,
        addContact,
        updateContact,
        deleteContact,
        deleteCampaign,
        sendBroadcast,
        sendLiveChatMessage,
        updateChatbotNodes,
        toggleIntegration,
        addSystemLog,
        clearSystemLogs,
        submitMetaTemplate,
        deleteTemplate,
        lockSync,
        unlockSync,
        refreshWorkspace,
        dismissOnboarding,
        updateBrandProfile,
        initializeWorkspace,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
