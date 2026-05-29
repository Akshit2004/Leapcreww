"use client";

import React, { useState } from "react";
import { Users, Send, FileCode2, Wallet, Coins, UploadCloud } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CSVImporterModal } from "../contacts/CSVImporterModal";
import { ChecklistWizard } from "./ChecklistWizard";
import { LiveLogsTerminal } from "./LiveLogsTerminal";
import { WalletTopupModal } from "./WalletTopupModal";

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
    clearSystemLogs, 
    dismissOnboarding, 
    refreshWorkspace 
  } = useApp();
  
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [isTopupOpen, setIsTopupOpen] = useState(false);

  // Aggregate stats
  const totalContacts = contacts.length;
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "Active" || c.status === "Sending").length;

  const fbConnected = !!(organization?.whatsappConnected || organization?.whatsappBusinessAccountId);
  const templatesApproved = templates.some(t => t.metaStatus === "approved");
  const contactsImported = contacts.length > 0;
  const campaignSent = campaigns.length > 0;
  
  const allStepsDone = fbConnected && templatesApproved && contactsImported && campaignSent;
  const showChecklist = !!(organization && !organization.onboardingDismissed && !allStepsDone);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up bg-[#f4f6f5]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard Overview</h2>
          <p className="text-stone-500 text-sm mt-1 font-medium">Real-time statistics, delivery analysis, and webhook audit logs.</p>
        </div>
        <div className="flex items-center gap-2.5 self-start md:self-center">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-250/20 shadow-sm shadow-emerald-500/5">
            System Live & Syncing
          </span>
        </div>
      </div>

      {/* Getting Started Checklist */}
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 select-none">
        {/* Wallet Balance Card */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-sm card-hover-premium duration-300 bg-white">
          <div className="space-y-3 flex-1 min-w-0 pr-2">
            <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
              <Wallet className="w-4 h-4 text-emerald-600 animate-pulse-soft" />
              Wallet Balance
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              ₹{((organization?.walletBalance as number) ?? 0.0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
            <button 
              onClick={() => setIsTopupOpen(true)}
              className="text-[9px] font-extrabold uppercase tracking-wide text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-250/20 transition-colors flex items-center gap-1 cursor-pointer shrink-0 mt-2.5 w-fit"
            >
              <Coins className="w-3 h-3" />
              Top Up
            </button>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* KPI 1: CRM Leads */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-sm card-hover-premium duration-300 bg-white">
          <div className="space-y-3 flex-1 min-w-0 pr-2">
            <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest flex items-center justify-between gap-2">
              Total CRM Leads
              <button 
                onClick={() => setIsCSVModalOpen(true)}
                className="text-[9px] font-extrabold uppercase tracking-wide text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-250/20 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <UploadCloud className="w-3 h-3" />
                Import
              </button>
            </span>
            <h3 className="text-3xl font-extrabold text-stone-900 tracking-tight">{totalContacts}</h3>
            <span className="text-[10px] text-stone-400 font-semibold block truncate">Synchronized Shopify/Woo webhooks</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-600 flex items-center justify-center shadow-sm shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Broadcast Campaigns */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-sm card-hover-premium duration-300 bg-white">
          <div className="space-y-3 flex-1 min-w-0">
            <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest">Broadcast Campaigns</span>
            <h3 className="text-3xl font-extrabold text-stone-900 tracking-tight">{totalCampaigns}</h3>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-bold inline-block">
              {activeCampaigns} processing
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
            <Send className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* KPI 3: Verified Templates */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-sm card-hover-premium duration-300 bg-white">
          <div className="space-y-3 flex-1 min-w-0">
            <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest">Verified Templates</span>
            <h3 className="text-3xl font-extrabold text-stone-900 tracking-tight">{templates.length}</h3>
            <span className="text-[10px] text-stone-400 font-semibold block">Pre-approved by Meta API</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shadow-sm shrink-0">
            <FileCode2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Live System Logs terminal */}
      <LiveLogsTerminal
        systemLogs={systemLogs}
        clearSystemLogs={clearSystemLogs}
      />

      {/* Leads CSV Importer Modal */}
      {organization && (
        <CSVImporterModal 
          orgId={organization.id} 
          isOpen={isCSVModalOpen} 
          onClose={() => setIsCSVModalOpen(false)} 
          onSuccess={() => {
            refreshWorkspace(organization.id);
          }}
        />
      )}

      {/* Secure Credits Top-Up Modal */}
      {organization && (
        <WalletTopupModal
          isOpen={isTopupOpen}
          onClose={() => setIsTopupOpen(false)}
          organizationId={organization.id}
          refreshWorkspace={refreshWorkspace}
        />
      )}
    </div>
  );
};
