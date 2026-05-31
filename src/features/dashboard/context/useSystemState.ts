"use client";

import { useState, useCallback, useRef } from "react";
import { Organization, Integration, ChatbotNode, SystemLog, Member } from "@/shared/context/types";

export const useSystemState = () => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [chatbotNodes, setChatbotNodes] = useState<ChatbotNode[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const syncLockedRef = useRef(false);

  const lockSync = useCallback(() => {
    syncLockedRef.current = true;
  }, []);

  const unlockSync = useCallback(() => {
    setTimeout(() => {
      syncLockedRef.current = false;
    }, 1500);
  }, []);

  const addSystemLog = useCallback((type: SystemLog["type"], message: string) => {
    const d = new Date();
    const ts = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    setSystemLogs((prev) => [
      { id: `log-${Date.now()}`, timestamp: ts, type, message },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const clearSystemLogs = useCallback(() => setSystemLogs([]), []);

  const toggleIntegration = useCallback((id: string, config?: { apiKey?: string; webhookUrl?: string }) => {
    setIntegrations((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const nextStatus = it.status === "connected" ? "disconnected" : "connected";
          addSystemLog("integration", `${it.name} Integration is now ${nextStatus.toUpperCase()}`);
          return {
            ...it,
            status: nextStatus,
            apiKey: config?.apiKey || it.apiKey,
            webhookUrl: config?.webhookUrl || it.webhookUrl,
          };
        }
        return it;
      })
    );
  }, [addSystemLog]);

  const dismissOnboarding = useCallback(async (orgId: string) => {
    try {
      setOrganization((prev: Organization | null) => (prev ? { ...prev, onboardingDismissed: true } : prev));
      await fetch(`/api/org/${orgId}/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed: true }),
      });
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

  const updateChatbotNodes = useCallback(async (newNodes: ChatbotNode[], organizationId: string) => {
    setChatbotNodes(newNodes);
    try {
      addSystemLog("crm", `Saving visual chatbot flow layout (${newNodes.length} nodes) to PostgreSQL...`);
      const res = await fetch(`/api/org/${organizationId}/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: newNodes }),
      });

      if (!res.ok) {
        const err = await res.json();
        addSystemLog("crm", `Failed to save chatbot flow nodes: ${err.error}`);
      } else {
        addSystemLog("crm", "Chatbot Builder nodes successfully persisted to PostgreSQL.");
      }
    } catch (err: unknown) {
      addSystemLog("crm", `Error saving chatbot layout: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [addSystemLog]);

  return {
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
    updateChatbotNodes,
  };
};
