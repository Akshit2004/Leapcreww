"use client";

import { useState, useCallback } from "react";
import { Template, SystemLog } from "@/shared/context/types";

interface UseTemplateStateProps {
  addSystemLog: (type: SystemLog["type"], message: string) => void;
  lockSync: () => void;
  unlockSync: () => void;
}

export const useTemplateState = ({
  addSystemLog,
  lockSync,
  unlockSync,
}: UseTemplateStateProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);

  const submitMetaTemplate = useCallback(async (newTmpl: {
    name: string;
    category: string;
    body: string;
    buttons: string[];
    mediaType: string;
    mediaUrl?: string;
    organizationId: string;
  }) => {
    try {
      addSystemLog("crm", `Submitting template "${newTmpl.name}" for Meta approval...`);
      const res = await fetch("/api/whatsapp/create-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTmpl),
      });

      if (!res.ok) {
        const err = await res.json();
        addSystemLog("crm", `Template approval submission failed: ${err.error}`);
        return;
      }

      const data = await res.json();
      setTemplates((prev) => [...prev, data.template]);
      addSystemLog("crm", `Template "${data.template.name}" submitted successfully! Status: ${data.template.metaStatus}`);
    } catch (err: unknown) {
      addSystemLog("crm", `Template creation error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [addSystemLog]);

  const deleteTemplate = useCallback(async (id: string) => {
    lockSync();
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    try {
      addSystemLog("crm", `Permanently deleting template ID ${id} from WappFlow and Meta...`);
      const res = await fetch(`/api/whatsapp/delete-template/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        addSystemLog("crm", `Failed to delete template ID ${id} completely: ${err.error}`);
      } else {
        addSystemLog("crm", `Successfully deleted template ID ${id} from WappFlow and Meta.`);
      }
    } catch (err: unknown) {
      addSystemLog("crm", `Error deleting template ID ${id}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      unlockSync();
    }
  }, [lockSync, unlockSync, addSystemLog]);

  return {
    templates,
    setTemplates,
    submitMetaTemplate,
    deleteTemplate,
  };
};
