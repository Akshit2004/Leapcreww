"use client";

import { useState, useCallback } from "react";
import { ChatHistory, Message, Contact, SystemLog } from "./types";

interface UseChatStateProps {
  addSystemLog: (type: SystemLog["type"], message: string) => void;
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
}

export const useChatState = ({
  addSystemLog,
  setContacts,
}: UseChatStateProps) => {
  const [chatHistory, setChatHistory] = useState<ChatHistory>({});

  const getCurrentTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const sendLiveChatMessage = useCallback((
    contactId: string,
    text: string,
    sender: "user" | "agent" | "system" = "agent",
    buttons?: string[]
  ) => {
    const time = getCurrentTime();
    const newMsg: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender,
      text,
      timestamp: time,
      status: sender === "agent" ? "sent" : undefined,
      buttons,
    };

    setChatHistory((prev) => {
      const current = prev[contactId] || [];
      return {
        ...prev,
        [contactId]: [...current, newMsg],
      };
    });

    // Update last message in contact list
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === contactId) {
          const count = sender === "user" ? (c.unreadCount || 0) + 1 : c.unreadCount;
          return {
            ...c,
            lastMessage: text.length > 35 ? text.substring(0, 32) + "..." : text,
            lastMessageTime: time,
            unreadCount: count,
          };
        }
        return c;
      })
    );

    // Dynamic System Logs
    if (sender === "agent") {
      addSystemLog("chat", `Agent sent WhatsApp message to ID ${contactId}`);
      // Simulate delivered and read status updates
      setTimeout(() => {
        setChatHistory((prev) => {
          const current = prev[contactId] || [];
          return {
            ...prev,
            [contactId]: current.map((m) => (m.id === newMsg.id ? { ...m, status: "delivered" } : m)),
          };
        });
      }, 1000);

      setTimeout(() => {
        setChatHistory((prev) => {
          const current = prev[contactId] || [];
          return {
            ...prev,
            [contactId]: current.map((m) => (m.id === newMsg.id ? { ...m, status: "read" } : m)),
          };
        });
      }, 2500);
    } else if (sender === "user") {
      addSystemLog("chat", `Received WhatsApp message from ID ${contactId}`);
    }
  }, [addSystemLog, setContacts]);

  return {
    chatHistory,
    setChatHistory,
    sendLiveChatMessage,
  };
};
