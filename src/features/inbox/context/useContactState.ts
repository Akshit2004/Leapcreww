"use client";

import { useState, useCallback } from "react";
import { Contact, ChatHistory, SystemLog } from "@/shared/context/types";

interface UseContactStateProps {
  addSystemLog: (type: SystemLog["type"], message: string) => void;
  lockSync: () => void;
  unlockSync: () => void;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatHistory>>;
  organizationId?: string;
}

export const useContactState = ({
  addSystemLog,
  lockSync,
  unlockSync,
  setChatHistory,
  organizationId,
}: UseContactStateProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);

  const addContact = useCallback(async (newContact: Omit<Contact, "id">) => {
    if (!organizationId) {
      addSystemLog("crm", `Failed to add contact ${newContact.name}: no active workspace.`);
      return undefined;
    }

    lockSync();
    try {
      const res = await fetch(`/api/org/${organizationId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        addSystemLog("crm", `Failed to add contact ${newContact.name}: ${data?.error || "request failed"}`);
        return undefined;
      }
      const { contact } = (await res.json()) as { contact: Contact };
      setContacts((prev) => [contact, ...prev]);
      // Pre-populate empty chat history
      setChatHistory((prev) => ({ ...prev, [contact.id]: [] }));
      addSystemLog("crm", `Added new contact: ${contact.name} (${contact.phone})`);
      return contact;
    } catch (err: unknown) {
      addSystemLog("crm", `Error adding contact ${newContact.name}: ${err instanceof Error ? err.message : String(err)}`);
      return undefined;
    } finally {
      unlockSync();
    }
  }, [addSystemLog, setChatHistory, organizationId, lockSync, unlockSync]);

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    lockSync();
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    if (updates.tags) {
      addSystemLog("crm", `Updated tags for contact ID ${id}`);
    }
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        addSystemLog("crm", `Failed to save contact updates for ID ${id} to sandbox database.`);
      }
    } catch (err: unknown) {
      addSystemLog("crm", `Error updating contact ID ${id}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      unlockSync();
    }
  }, [lockSync, unlockSync, addSystemLog]);

  const deleteContact = useCallback(async (id: string) => {
    lockSync();
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setActiveContactId((currentActive) => {
      if (currentActive === id) return null;
      return currentActive;
    });
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        addSystemLog("crm", `Failed to delete contact ID ${id} from sandbox database.`);
      } else {
        addSystemLog("crm", `Permanently deleted contact ID ${id}`);
      }
    } catch (err: unknown) {
      addSystemLog("crm", `Error permanently deleting contact ID ${id}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      unlockSync();
    }
  }, [lockSync, unlockSync, addSystemLog]);

  return {
    contacts,
    setContacts,
    activeContactId,
    setActiveContactId,
    addContact,
    updateContact,
    deleteContact,
  };
};
