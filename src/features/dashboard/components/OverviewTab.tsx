"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Users, Send, FileText, Zap, Wifi, WifiOff, UploadCloud, Plus,
  Bot, CheckCircle2, CreditCard, ArrowUpRight, ChevronDown, ChevronUp,
  Sparkles, Wand2, ArrowRight, AlertCircle,
} from "lucide-react";
import { useApp } from "@/shared/context/AppContext";
import { useParams, useRouter, usePathname } from "next/navigation";
import { CSVImporterModal } from "@/features/inbox/components/CSVImporterModal";
import { DoneForYouCopilot } from "./DoneForYouCopilot";
import { MetaBillingModal } from "@/features/wallet/components/MetaBillingModal";
import { RecipesSection } from "@/features/recipes/components/RecipesSection";

interface OverviewTabProps {
  onNavigate?: (tab: string) => void;
}

const EXAMPLES = [
  "Send a 20% Diwali discount to people who haven't bought in 3 months",
  "Win back leads who never replied with a free shipping offer",
  "Announce our new product launch to all VIP customers",
];

// ─── Zero-state Copilot hero ────────────────────────────────────────────────

interface ZeroStateCopilotProps {
  goal: string;
  setGoal: (v: string) => void;
  onLaunch: (text: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const ZeroStateCopilot: React.FC<ZeroStateCopilotProps> = ({ goal, setGoal, onLaunch, inputRef }) => (
  <div className="bg-stone-950 p-6 sm:p-8 space-y-5">
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-wa-green" />
        <span className="text-[10px] font-black uppercase tracking-widest text-wa-green">
          AI Copilot
        </span>
      </div>
      <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">
        What do you want to achieve?
      </h2>
      <p className="text-xs text-stone-400 leading-relaxed max-w-xl">
        Describe your goal in plain English — the AI drafts the audience, writes the template,
        and pre-fills the campaign. You just hit{" "}
        <span className="text-stone-200 font-semibold">Approve &amp; Launch</span>.
      </p>
    </div>

    <form
      onSubmit={(e) => { e.preventDefault(); onLaunch(goal); }}
      className="flex flex-col sm:flex-row gap-2"
    >
      <div className="relative flex-1">
        <Wand2 className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Re-engage customers who went quiet in the last 60 days…"
          className="w-full bg-stone-900 border border-stone-700 focus:border-wa-green py-3 pl-9 pr-4 text-sm text-white placeholder:text-stone-600 focus:outline-none transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={!goal.trim()}
        className="bg-wa-green hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-wa-green text-stone-950 font-black text-xs uppercase tracking-wider px-5 py-3 flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
      >
        Build campaign
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>

    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">Try:</span>
      {EXAMPLES.map((ex) => (
        <button
          key={ex}
          type="button"
          onClick={() => { setGoal(ex); onLaunch(ex); }}
          className="text-[11px] text-stone-400 border border-stone-700 hover:border-stone-500 hover:text-stone-200 px-2.5 py-1 transition-colors cursor-pointer text-left"
        >
          {ex}
        </button>
      ))}
    </div>
  </div>
);

// ─── Dependency strip ────────────────────────────────────────────────────────

interface DepCardProps {
  done: boolean;
  number: string;
  label: string;
  description: string;
  ctaLabel: string;
  onCta: () => void;
}

const DepCard: React.FC<DepCardProps> = ({ done, number, label, description, ctaLabel, onCta }) => (
  <div className={`border p-4 flex flex-col gap-3 transition-all ${done ? "border-wa-green/40 bg-emerald-50/40" : "border-stone-200 bg-white"}`}>
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2">
        {done ? (
          <CheckCircle2 className="w-4 h-4 text-wa-green shrink-0" />
        ) : (
          <div className="w-4 h-4 border-2 border-stone-300 shrink-0 flex items-center justify-center">
            <span className="text-[8px] font-black text-stone-400">{number}</span>
          </div>
        )}
        <span className={`text-xs font-black uppercase tracking-wider ${done ? "text-emerald-700 line-through" : "text-stone-900"}`}>
          {label}
        </span>
      </div>
      {!done && (
        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1 shrink-0 animate-pulse" />
      )}
    </div>
    <p className="text-[11px] text-stone-500 leading-relaxed">{description}</p>
    {!done && (
      <button
        onClick={onCta}
        className="self-start flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-950 border border-stone-950 px-3 py-1.5 hover:bg-stone-950 hover:text-white transition-colors cursor-pointer"
      >
        {ctaLabel}
        <ArrowRight className="w-3 h-3" />
      </button>
    )}
    {done && (
      <span className="self-start text-[10px] font-black uppercase tracking-wider text-emerald-600">
        Done
      </span>
    )}
  </div>
);

// ─── Main OverviewTab ────────────────────────────────────────────────────────

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

  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const orgId = params.orgId as string;

  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const copilotInputRef = useRef<HTMLInputElement>(null);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("dashboard_collapsed_sections");
        if (saved) setCollapsedSections(JSON.parse(saved));
      } catch { /* ignore */ }
    }
  }, []);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const updated = { ...prev, [sectionId]: !prev[sectionId] };
      try { localStorage.setItem("dashboard_collapsed_sections", JSON.stringify(updated)); } catch { /* ignore */ }
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

  // Zero state: no campaign ever sent — show Copilot-first layout
  const isZeroState = !campaignSent;

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

  const launchCopilot = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !orgId) return;
    router.push(`${pathname}?tab=campaigns&goal=${encodeURIComponent(trimmed)}`, { scroll: false });
  };

  // Auto-focus copilot input on zero state mount
  useEffect(() => {
    if (isZeroState) {
      const t = setTimeout(() => copilotInputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [isZeroState]);

  // ── Shared top bar ─────────────────────────────────────────────────────────
  const TopBar = (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-5">
      <div className="space-y-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Workspace Overview</span>
        <h1 className="text-2xl font-black tracking-tight text-stone-900">{organization?.name || "Your Workspace"}</h1>
        <div className="flex items-center gap-1.5 pt-0.5">
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
                className="text-xs text-stone-500 underline ml-1 cursor-pointer hover:text-stone-900 transition-colors"
              >
                Connect now
              </button>
            </>
          )}
        </div>
      </div>

      {!fbConnected && (
        <button
          onClick={() => onNavigate?.("settings")}
          className="bg-stone-950 text-white text-xs font-black uppercase tracking-wider px-4 py-2 hover:bg-stone-800 transition-colors cursor-pointer flex items-center gap-2 border border-stone-950"
        >
          <Wifi className="w-4 h-4" />
          Connect WhatsApp
        </button>
      )}

      {fbConnected && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-2 text-emerald-700">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">WhatsApp Active</span>
        </div>
      )}
    </div>
  );

  // ── ZERO STATE render ──────────────────────────────────────────────────────
  if (isZeroState) {
    const pendingDeps = [!fbConnected, !contactsImported, !templatesApproved].filter(Boolean).length;

    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#fafaf9] space-y-5 custom-scrollbar pb-12">
        {TopBar}

        {/* Copilot — full width, dark, dominant */}
        <ZeroStateCopilot
          goal={goal}
          setGoal={setGoal}
          onLaunch={launchCopilot}
          inputRef={copilotInputRef}
        />

        {/* Dependency strip — only shown when any step is incomplete */}
        {pendingDeps > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <p className="text-xs text-stone-500">
                <span className="font-bold text-stone-700">Before the AI can launch anything,</span>{" "}
                {pendingDeps === 1 ? "1 thing needs" : `${pendingDeps} things need`} to be ready:
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <DepCard
                done={fbConnected}
                number="1"
                label="Connect WhatsApp"
                description="Link your WhatsApp Business Account. Everything — campaigns, chatbots, autoresponders — flows through this."
                ctaLabel="Connect now"
                onCta={() => onNavigate?.("settings")}
              />
              <DepCard
                done={contactsImported}
                number="2"
                label="Import contacts"
                description="Upload a CSV or sync from Shopify. The AI needs an audience to build segments against."
                ctaLabel="Import CSV"
                onCta={() => setIsCSVModalOpen(true)}
              />
              <DepCard
                done={templatesApproved}
                number="3"
                label="Approve a template"
                description="Meta requires a pre-approved template for broadcast messages. Our AI Compliance Auditor prevents rejections."
                ctaLabel="Create template"
                onCta={() => onNavigate?.("templates")}
              />
            </div>
          </div>
        )}

        {/* One-click Recipes — inspiration without manual setup */}
        <div>
          <div className="flex items-center justify-between mb-3 border-b border-stone-200 pb-1.5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Or start with a one-click automation
            </h3>
          </div>
          <RecipesSection hideHeader />
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
  }

  // ── ACTIVE STATE render (has campaigns) ───────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#fafaf9] space-y-5 custom-scrollbar pb-12">
      {TopBar}

      {/* Hero — AI Copilot + Promo video */}
      <div>
        <div className="flex items-center justify-between mb-3 border-b border-stone-200 pb-1.5 select-none">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">AI Campaign Planner</h3>
          <button
            onClick={() => toggleSection("hero")}
            className="text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1 cursor-pointer select-none"
          >
            {collapsedSections["hero"] ? <>Expand <ChevronDown className="w-3 h-3" /></> : <>Collapse <ChevronUp className="w-3 h-3" /></>}
          </button>
        </div>
        {!collapsedSections["hero"] && <DoneForYouCopilot />}
      </div>

      {/* Stats */}
      <div>
        <div className="flex items-center justify-between mb-3 border-b border-stone-200 pb-1.5 select-none">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">At a glance</h3>
          <button
            onClick={() => toggleSection("stats")}
            className="text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1 cursor-pointer select-none"
          >
            {collapsedSections["stats"] ? <>Expand <ChevronDown className="w-3 h-3" /></> : <>Collapse <ChevronUp className="w-3 h-3" /></>}
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
            {collapsedSections["recipes"] ? <>Expand <ChevronDown className="w-3 h-3" /></> : <>Collapse <ChevronUp className="w-3 h-3" /></>}
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
            {collapsedSections["actions_activity"] ? <>Expand <ChevronDown className="w-3 h-3" /></> : <>Collapse <ChevronUp className="w-3 h-3" /></>}
          </button>
        </div>
        {!collapsedSections["actions_activity"] && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
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
