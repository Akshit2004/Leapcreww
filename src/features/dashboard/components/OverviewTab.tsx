"use client";

import React, { useState, useEffect } from "react";
import { Users, Send, FileText, Zap, Wifi, WifiOff, UploadCloud, Plus, Bot, CheckCircle2, CreditCard, ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { useApp } from "@/shared/context/AppContext";
import { CSVImporterModal } from "@/features/inbox/components/CSVImporterModal";
import { ChecklistWizard } from "./ChecklistWizard";
import { DoneForYouCopilot } from "./DoneForYouCopilot";
import { PromoVideo } from "./PromoVideo";
import { MetaBillingModal } from "@/features/wallet/components/MetaBillingModal";
import { RecipesSection } from "@/features/recipes/components/RecipesSection";

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
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("dashboard_collapsed_sections");
        if (saved) {
          setCollapsedSections(JSON.parse(saved));
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const updated = { ...prev, [sectionId]: !prev[sectionId] };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("dashboard_collapsed_sections", JSON.stringify(updated));
        } catch (e) {
          // ignore
        }
      }
      return updated;
    });
  };

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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-5">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Workspace Overview</span>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">{organization?.name || "Your Workspace"}</h1>
          <div className="flex items-center gap-1.5">
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
          {fbConnected ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Payment Connected</span>
            </div>
          ) : (
            <button
              onClick={() => setIsBillingModalOpen(true)}
              className="bg-stone-950 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 hover:bg-stone-800 transition-colors cursor-pointer flex items-center gap-2 border border-stone-950"
            >
              <CreditCard className="w-4 h-4" />
              Link Payment
            </button>
          )}
        </div>
      </div>

      {/* Hero — Done-For-You AI Copilot + Promo video */}
      <div>
        <div className="flex items-center justify-between mb-3 border-b border-stone-200 pb-1.5 select-none">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">AI Campaign Planner</h3>
          <button
            onClick={() => toggleSection("hero")}
            className="text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1 cursor-pointer select-none"
          >
            {collapsedSections["hero"] ? (
              <>
                Expand <ChevronDown className="w-3 h-3" />
              </>
            ) : (
              <>
                Collapse <ChevronUp className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
        {!collapsedSections["hero"] && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
            <div className="lg:col-span-3">
              <DoneForYouCopilot />
            </div>
            <div className="lg:col-span-2">
              <PromoVideo />
            </div>
          </div>
        )}
      </div>

      {/* Onboarding Checklist */}
      {organization && showChecklist && (
        <div>
          <div className="flex items-center justify-between mb-3 border-b border-stone-200 pb-1.5 select-none">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Onboarding Checklist</h3>
            <button
              onClick={() => toggleSection("checklist")}
              className="text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1 cursor-pointer select-none"
            >
              {collapsedSections["checklist"] ? (
                <>
                  Expand <ChevronDown className="w-3 h-3" />
                </>
              ) : (
                <>
                  Collapse <ChevronUp className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
          {!collapsedSections["checklist"] && (
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
        </div>
      )}

      {/* Stats */}
      <div>
        <div className="flex items-center justify-between mb-3 border-b border-stone-200 pb-1.5 select-none">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">At a glance</h3>
          <button
            onClick={() => toggleSection("stats")}
            className="text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1 cursor-pointer select-none"
          >
            {collapsedSections["stats"] ? (
              <>
                Expand <ChevronDown className="w-3 h-3" />
              </>
            ) : (
              <>
                Collapse <ChevronUp className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
        {!collapsedSections["stats"] && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map(({ label, value, icon: Icon, sub, tab }) => (
              <button
                key={label}
                onClick={() => onNavigate?.(tab)}
                className="bg-white border border-stone-200 p-4 text-left hover:border-stone-400 transition-colors group cursor-pointer relative"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-stone-300 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-colors" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</span>
                </div>
                <div className="text-3xl font-bold text-stone-900 tracking-tight">{value}</div>
                {sub && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[11px] text-emerald-600 font-semibold">{sub}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* One-Click Automation Recipes */}
      <div>
        <div className="flex items-center justify-between mb-3 border-b border-stone-200 pb-1.5 select-none">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">One-Click Automations</h3>
          <button
            onClick={() => toggleSection("recipes")}
            className="text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1 cursor-pointer select-none"
          >
            {collapsedSections["recipes"] ? (
              <>
                Expand <ChevronDown className="w-3 h-3" />
              </>
            ) : (
              <>
                Collapse <ChevronUp className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
        {!collapsedSections["recipes"] && <RecipesSection hideHeader />}
      </div>

      {/* Quick Actions + Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3 border-b border-stone-200 pb-1.5 select-none">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Quick Actions & Activity</h3>
          <button
            onClick={() => toggleSection("actions_activity")}
            className="text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1 cursor-pointer select-none"
          >
            {collapsedSections["actions_activity"] ? (
              <>
                Expand <ChevronDown className="w-3 h-3" />
              </>
            ) : (
              <>
                Collapse <ChevronUp className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
        {!collapsedSections["actions_activity"] && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Quick Actions */}
            <div className="lg:col-span-2 bg-white border border-stone-200 p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {quickActions.map(({ label, icon: Icon, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="w-full flex items-center gap-3 p-3 border border-stone-100 hover:border-stone-300 hover:bg-stone-50 transition-colors text-left cursor-pointer group"
                  >
                    <Icon className="w-4 h-4 text-stone-500" />
                    <span className="text-sm font-semibold text-stone-700 flex-1">{label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-3 bg-white border border-stone-200 p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-4">Recent Activity</h3>
              {recentLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <p className="text-sm text-stone-400">No activity yet.</p>
                  <p className="text-xs text-stone-400 mt-1">Actions will appear here as you use LeapCreww.</p>
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
        )}
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
          <MetaBillingModal
            isOpen={isBillingModalOpen}
            onClose={() => setIsBillingModalOpen(false)}
            organizationId={organization.id}
          />
        </>
      )}
    </div>
  );
};
