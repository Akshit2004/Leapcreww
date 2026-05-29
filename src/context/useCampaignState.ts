"use client";

import { useState, useCallback } from "react";
import { Campaign, SystemLog } from "./types";

interface UseCampaignStateProps {
  addSystemLog: (type: SystemLog["type"], message: string) => void;
  lockSync: () => void;
  unlockSync: () => void;
}

export const useCampaignState = ({
  addSystemLog,
  lockSync,
  unlockSync,
}: UseCampaignStateProps) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const sendBroadcast = useCallback(async (campaignData: { 
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
  }) => {
    try {
      const isScheduled = !!campaignData.scheduledAt;
      addSystemLog(
        "campaign", 
        isScheduled 
          ? `Scheduling broadcast '${campaignData.name}' for ${campaignData.scheduledAt}...` 
          : `Launching broadcast '${campaignData.name}' asynchronously to CRM segment...`
      );
      
      const res = await fetch("/api/whatsapp/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignData),
      });

      if (!res.ok) {
        const err = await res.json();
        addSystemLog("campaign", `Broadcast action failed: ${err.error}`);
        return;
      }

      const data = await res.json();
      setCampaigns((prev) => [data.campaign, ...prev]);
      
      addSystemLog(
        "campaign", 
        isScheduled 
          ? `Broadcast successfully scheduled! Active date: ${new Date(campaignData.scheduledAt!).toLocaleString()}`
          : `Broadcast launched successfully! Queueing dispatch to ${data.campaign.sent} matching leads.`
      );
    } catch (err: unknown) {
      addSystemLog("campaign", `Broadcast action error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [addSystemLog]);

  const deleteCampaign = useCallback(async (id: string) => {
    lockSync();
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/whatsapp/campaign/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        addSystemLog("campaign", `Failed to delete campaign ID ${id} from sandbox database.`);
      } else {
        addSystemLog("campaign", `Permanently deleted campaign ID ${id}`);
      }
    } catch (err: unknown) {
      addSystemLog("campaign", `Error permanently deleting campaign ID ${id}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      unlockSync();
    }
  }, [lockSync, unlockSync, addSystemLog]);

  return {
    campaigns,
    setCampaigns,
    sendBroadcast,
    deleteCampaign,
  };
};
