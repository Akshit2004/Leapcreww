"use client";

import React, { useState } from "react";
import { 
  Users, 
  Send, 
  FileCode2, 
  Settings2, 
  Trash2,
  HelpCircle,
  Search,
  CheckCircle2,
  ChevronRight,
  UploadCloud,
  X
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { CSVImporterModal } from "./CSVImporterModal";

interface OverviewTabProps {
  onNavigate?: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ onNavigate }) => {
  const { organization, contacts, campaigns, templates, integrations, systemLogs, clearSystemLogs, dismissOnboarding, refreshWorkspace } = useApp();
  const [logFilter, setLogFilter] = useState<string>("all");
  const [logSearch, setLogSearch] = useState<string>("");
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);

  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  // Aggregate stats
  const totalContacts = contacts.length;
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "Active" || c.status === "Sending").length;

  // Filter logs
  const filteredLogs = systemLogs.filter((log) => {
    const matchesFilter = logFilter === "all" || log.type === logFilter;
    const matchesSearch = log.message.toLowerCase().includes(logSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const fbConnected = organization?.whatsappConnected || false;
  const templatesApproved = templates.some(t => t.metaStatus === "approved");
  const contactsImported = contacts.length > 0;
  const campaignSent = campaigns.length > 0;
  
  const showChecklist = organization && !organization.onboardingDismissed;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-stone-500 text-sm mt-1">Real-time statistics, delivery analysis, and webhook audit logs.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
          </span>
          <span className="text-xs font-semibold text-orange-600 bg-orange-50 dark:text-orange-400 px-3 py-1.5 rounded-full border border-orange-500/20">
            System Live & Syncing
          </span>
        </div>
      </div>

      {/* Getting Started Checklist */}
      {showChecklist && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <button 
            onClick={() => dismissOnboarding(organization.id)}
            className="absolute top-4 right-4 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="mb-4">
            <h3 className="text-xl font-bold mb-1">Welcome to AiSennsy! Let&apos;s get you set up.</h3>
            <p className="text-orange-100 text-sm">Complete these steps to start broadcasting campaigns on WhatsApp.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => onNavigate?.("settings")}
              className={`bg-white/10 rounded-xl p-4 border border-white/20 flex flex-col gap-2 text-left cursor-pointer hover:bg-white/20 transition-all ${fbConnected ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">1. Connect Meta</span>
                {fbConnected ? <CheckCircle2 className="w-5 h-5 text-green-300" /> : <ChevronRight className="w-4 h-4" />}
              </div>
              <p className="text-xs text-orange-100">Link your WhatsApp Business Account.</p>
            </button>
            
            <button
              onClick={() => onNavigate?.("templates")}
              className={`bg-white/10 rounded-xl p-4 border border-white/20 flex flex-col gap-2 text-left cursor-pointer hover:bg-white/20 transition-all ${templatesApproved ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">2. Sync Templates</span>
                {templatesApproved ? <CheckCircle2 className="w-5 h-5 text-green-300" /> : <ChevronRight className="w-4 h-4" />}
              </div>
              <p className="text-xs text-orange-100">Ensure Meta approves your templates.</p>
            </button>
            
            <button
              onClick={() => setIsCSVModalOpen(true)}
              className={`bg-white/10 rounded-xl p-4 border border-white/20 flex flex-col gap-2 text-left cursor-pointer hover:bg-white/20 transition-all ${contactsImported ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">3. Import Contacts</span>
                {contactsImported ? <CheckCircle2 className="w-5 h-5 text-green-300" /> : <ChevronRight className="w-4 h-4" />}
              </div>
              <p className="text-xs text-orange-100">Upload a CSV or sync from plugins.</p>
            </button>
            
            <button
              onClick={() => onNavigate?.("campaigns")}
              className={`bg-white/10 rounded-xl p-4 border border-white/20 flex flex-col gap-2 text-left cursor-pointer hover:bg-white/20 transition-all ${campaignSent ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">4. Send Campaign</span>
                {campaignSent ? <CheckCircle2 className="w-5 h-5 text-green-300" /> : <ChevronRight className="w-4 h-4" />}
              </div>
              <p className="text-xs text-orange-100">Launch your first test broadcast!</p>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-sm hover:-translate-y-1 transition-all duration-300">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center justify-between">
              Total CRM Leads
              <button 
                onClick={() => setIsCSVModalOpen(true)}
                className="text-orange-600 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded text-[10px] font-bold transition-colors flex items-center gap-1"
              >
                <UploadCloud className="w-3 h-3" />
                Import CSV
              </button>
            </span>
            <h3 className="text-3xl font-bold">{totalContacts}</h3>
            <span className="text-[11px] text-stone-500 block">Synched from active Shopify/Woo webhooks</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-sm hover:-translate-y-1 transition-all duration-300">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Broadcast Campaigns</span>
            <h3 className="text-3xl font-bold">{totalCampaigns}</h3>
            <span className="text-[11px] text-orange-500 font-medium block flex items-center gap-1">
              <span>{activeCampaigns} campaigns processing</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <Send className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-sm hover:-translate-y-1 transition-all duration-300">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Verified Templates</span>
            <h3 className="text-3xl font-bold">{templates.length}</h3>
            <span className="text-[11px] text-stone-500 block">Pre-approved by Meta API</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <FileCode2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-sm hover:-translate-y-1 transition-all duration-300">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Active Plugins</span>
            <h3 className="text-3xl font-bold">{connectedCount} <span className="text-xs text-stone-500">/ {integrations.length}</span></h3>
            <span className="text-[11px] text-stone-500 block">Connected webhook instances</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Settings2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Live System Logs Terminal */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col h-[400px] shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-orange-100 shrink-0">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse-soft" />
              Live CRM & Webhook Audit
            </h3>
            <p className="text-xs text-stone-500 mt-1">Real-time terminal of incoming requests & template processing</p>
          </div>
          <button 
            onClick={clearSystemLogs}
            className="text-xs text-red-500 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/15 hover:bg-red-500/10 hover:border-red-500/35 transition-colors self-start sm:self-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Logs
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 py-3 shrink-0">
          {/* Search */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search audit trail..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="w-full bg-orange-50 border border-orange-100 rounded-lg py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Type buttons */}
          <div className="flex items-center gap-1 self-start sm:self-center overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
            {["all", "crm", "campaign", "integration", "chat"].map((type) => (
              <button
                key={type}
                onClick={() => setLogFilter(type)}
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-all ${
                    logFilter === type 
                      ? "bg-orange-600 text-white" 
                      : "text-stone-500 hover:bg-orange-50"
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Log Stream Terminal */}
        <div className="flex-1 bg-stone-50 text-stone-700 font-mono text-xs rounded-xl p-4 overflow-y-auto custom-scrollbar border border-orange-100 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center space-y-2">
              <HelpCircle className="w-7 h-7 text-stone-300" />
              <p>No sync entries found matching filter criteria.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              let badgeColor = "text-blue-600 bg-blue-100";
              if (log.type === "campaign") badgeColor = "text-orange-600 bg-orange-100";
              if (log.type === "integration") badgeColor = "text-purple-600 bg-purple-100";
              if (log.type === "crm") badgeColor = "text-amber-600 bg-amber-100";

              return (
                <div key={log.id} className="flex items-start gap-3.5 border-b border-orange-100/60 pb-1.5 last:border-b-0 animate-slide-in-left leading-relaxed">
                  <span className="text-stone-400 text-[10px] select-none">{log.timestamp}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${badgeColor} select-none`}>
                    {log.type}
                  </span>
                  <span className="text-stone-700 flex-1">{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

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
    </div>
  );
};
