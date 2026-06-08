"use client";

import React, { useState } from "react";
import { Users, Send, FileText, Zap, Wifi, WifiOff, Wallet, UploadCloud, Plus, Bot } from "lucide-react";
import { useApp } from "@/shared/context/AppContext";
import { CSVImporterModal } from "@/features/inbox/components/CSVImporterModal";
import { ChecklistWizard } from "./ChecklistWizard";
import { WalletTopupModal } from "@/features/wallet/components/WalletTopupModal";

interface OverviewTabProps {
  onNavigate?: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ onNavigate }) => {
  const {
    organization,
    contacts,
    campaigns,
    templates,
    systemLogs,
    dismissOnboarding,
    refreshWorkspace,
  } = useApp();

  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [isTopupOpen, setIsTopupOpen] = useState(false);

  const totalContacts = contacts.length;
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === "Active" || c.status === "Sending").length;
  const totalMessages = campaigns.reduce((sum, c) => sum + (c.sent || 0), 0);

  const fbConnected = !!(organization?.whatsappConnected || organization?.whatsappBusinessAccountId);
  const templatesApproved = templates.some(t => t.metaStatus === "approved");
  const contactsImported = contacts.length > 0;
  const campaignSent = campaigns.length > 0;
  const allStepsDone = fbConnected && templatesApproved && contactsImported && campaignSent;
  const showChecklist = !!(organization && !organization.onboardingDismissed && !allStepsDone);

  const rawBalance = (organization?.walletBalance as number) ?? 0;
  const formattedBalance = rawBalance.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });

  const recentLogs = systemLogs.slice(0, 8);

  const stats = [
    { label: "Contacts", value: totalContacts.toLocaleString(), icon: Users, sub: null, tab: "customers" },
    { label: "Campaigns", value: totalCampaigns.toLocaleString(), icon: Send, sub: activeCampaigns > 0 ? `${activeCampaigns} active` : null, tab: "campaigns" },
    { label: "Messages Sent", value: totalMessages.toLocaleString(), icon: Zap, sub: null, tab: "campaigns" },
    { label: "Templates", value: templates.length.toLocaleString(), icon: FileText, sub: null, tab: "templates" },
  ];

  const quickActions = [
    { label: "Import Contacts", icon: UploadCloud, action: () => setIsCSVModalOpen(true) },
    { label: "New Campaign", icon: Plus, action: () => onNavigate?.("campaigns") },
    { label: "Create Template", icon: FileText, action: () => onNavigate?.("templates") },
    { label: "Build Chatbot", icon: Bot, action: () => onNavigate?.("chatbot") },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#fafaf9] space-y-5 custom-scrollbar pb-12">

      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900">{organization?.name || "Your Workspace"}</h1>
          <div className="flex items-center gap-1.5 mt-1">
            {fbConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs text-emerald-700 font-semibold">WhatsApp Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-xs text-stone-400 font-semibold">Not connected</span>
                <button
                  onClick={() => onNavigate?.("settings")}
                  className="text-xs text-stone-500 underline ml-1 cursor-pointer"
                >
                  Connect now
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-stone-200 px-3 py-2">
            <Wallet className="w-4 h-4 text-stone-400" />
            <span className="text-sm font-bold text-stone-900">{formattedBalance}</span>
          </div>
          <button
            onClick={() => setIsTopupOpen(true)}
            className="bg-stone-950 text-white text-xs font-bold px-4 py-2 hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Top Up
          </button>
        </div>
      </div>

      {/* Onboarding Checklist */}
      {organization && (
        <ChecklistWizard
          organizationId={organization.id}
          fbConnected={fbConnected}
          templatesApproved={templatesApproved}
          contactsImported={contactsImported}
          campaignSent={campaignSent}
          onNavigate={onNavigate}
          onImportClick={() => setIsCSVModalOpen(true)}
          dismissOnboarding={dismissOnboarding}
          showChecklist={showChecklist}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, sub, tab }) => (
          <button
            key={label}
            onClick={() => onNavigate?.(tab)}
            className="bg-white border border-stone-200 p-4 text-left hover:border-stone-400 transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-stone-500">{label}</span>
              <Icon className="w-4 h-4 text-stone-300 group-hover:text-stone-600 transition-colors" />
            </div>
            <div className="text-2xl font-bold text-stone-900">{value}</div>
            {sub && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[11px] text-emerald-600 font-semibold">{sub}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white border border-stone-200 p-5">
          <h3 className="text-sm font-bold text-stone-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {quickActions.map(({ label, icon: Icon, action }) => (
              <button
                key={label}
                onClick={action}
                className="w-full flex items-center gap-3 p-3 border border-stone-100 hover:border-stone-300 hover:bg-stone-50 transition-colors text-left cursor-pointer"
              >
                <Icon className="w-4 h-4 text-stone-500" />
                <span className="text-sm font-semibold text-stone-700">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-3 bg-white border border-stone-200 p-5">
          <h3 className="text-sm font-bold text-stone-900 mb-4">Recent Activity</h3>
          {recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-sm text-stone-400">No activity yet.</p>
              <p className="text-xs text-stone-400 mt-1">Actions will appear here as you use WappFlow.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3">
                  <span className="text-[10px] text-stone-400 mt-0.5 shrink-0 font-mono w-14">{log.timestamp}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 shrink-0 mt-0.5 ${
                    log.type === "campaign" ? "bg-blue-50 text-blue-600" :
                    log.type === "chat" ? "bg-emerald-50 text-emerald-600" :
                    log.type === "integration" ? "bg-purple-50 text-purple-600" :
                    "bg-stone-100 text-stone-500"
                  }`}>{log.type}</span>
                  <p className="text-xs text-stone-600 leading-relaxed flex-1">{log.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {organization && (
        <>
          <CSVImporterModal
            orgId={organization.id}
            isOpen={isCSVModalOpen}
            onClose={() => setIsCSVModalOpen(false)}
            onSuccess={() => refreshWorkspace(organization.id)}
          />
          <WalletTopupModal
            isOpen={isTopupOpen}
            onClose={() => setIsTopupOpen(false)}
            organizationId={organization.id}
            refreshWorkspace={refreshWorkspace}
          />
        </>
      )}
    </div>
  );
};
