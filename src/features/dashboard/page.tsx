"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useApp } from "@/shared/context/AppContext";
import { Sidebar } from "@/shared/components/layout/Sidebar";
import { OverviewTab } from "@/features/dashboard/components/OverviewTab";
import { InboxTab } from "@/features/inbox/components/InboxTab";
import { CustomersTab } from "../customers/components/CustomersTab";
import { CampaignsTab } from "@/features/campaigns/components/CampaignsTab";
import { TemplatesTab } from "@/features/templates/components/TemplatesTab";
import { FlowsTab } from "@/features/flows/components/FlowsTab";
import { ChatbotTab } from "@/features/chatbot/components/ChatbotTab";
import { MarketplaceTab } from "@/features/marketplace/components/MarketplaceTab";
import { SettingsTab } from "@/features/settings/components/SettingsTab";
import { IntegrationsTab } from "@/features/integrations/components/IntegrationsTab";
import { AnalyticsTab } from "@/features/analytics/components/AnalyticsTab";
import { AdsTab } from "@/features/ads/components/AdsTab";
import { AICopilotSidebar } from "@/features/ai/components/AICopilotSidebar";
import { Loader, AlertCircle, Bot } from "lucide-react";

export default function TenantDashboard() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const { initializeWorkspace } = useApp();

  const orgId = params.orgId as string;

  const [activeTab, setActiveTab] = useState<string>("overview");
  const mainRef = React.useRef<HTMLElement>(null);
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    mainRef.current?.scrollTo({ top: 0 });
  };
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // 1. Session Redirect Guard
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // 2. Fetch scoped PostgreSQL data on mount or org switch with polling
  useEffect(() => {
    if (status !== "authenticated" || !orgId) return;

    const fetchWorkspaceData = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      setErrorMsg("");

      try {
        const response = await fetch(`/api/org/${orgId}/data`);
        if (!response.ok) {
          if (response.status === 403) {
            setErrorMsg("Forbidden: You do not possess active membership access to this SaaS workspace.");
          } else {
            setErrorMsg("An error occurred during PostgreSQL workspace sync.");
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        initializeWorkspace(data);
        setLoading(false);
      } catch {
        if (showLoading) {
          setErrorMsg("Failed to synchronize with local PostgreSQL. Connection timeout.");
          setLoading(false);
        }
      }
    };

    fetchWorkspaceData(true);
  }, [orgId, status, initializeWorkspace]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab onNavigate={handleTabChange} />;
      case "analytics":
        return <AnalyticsTab />;
      case "inbox":
        return <InboxTab />;
      case "customers":
        return <CustomersTab />;
      case "ads":
        return <AdsTab />;
      case "campaigns":
        return <CampaignsTab />;
      case "templates":
        return <TemplatesTab />;
      case "flows":
        return <FlowsTab />;
      case "chatbot":
        return <ChatbotTab />;
      case "marketplace":
        return <MarketplaceTab />;
      case "integrations":
        return <IntegrationsTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <OverviewTab />;
    }
  };

  // Render authenticating screen
  if (status === "loading" || (loading && !errorMsg)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f4f6f5] text-wa-green font-sans relative overflow-hidden">
        {/* Decorative blur rings */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-wa-green/10 rounded-full blur-3xl opacity-30 animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-wa-green-dark/10 rounded-full blur-3xl opacity-30 animate-pulse-soft" />
        
        <div className="flex flex-col items-center gap-4 animate-slide-up relative z-10">
          <div className="w-16 h-16 rounded-3xl bg-wa-green flex items-center justify-center shadow-xl shadow-wa-green/30 animate-glow-pulse relative">
            <Loader className="w-7 h-7 animate-spin text-white" />
            <span className="absolute -inset-1 rounded-3xl border-2 border-emerald-400 opacity-20 animate-ping" />
          </div>
          <div className="text-center space-y-1">
            <span className="text-[11px] tracking-widest uppercase font-extrabold text-stone-600 block">WappFlow Portal</span>
            <span className="text-[9px] tracking-wide font-medium text-stone-400 block uppercase">Synchronizing secure PostgreSQL sandbox...</span>
          </div>
        </div>
      </div>
    );
  }

  // Render Access Error Screen
  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#f4f6f5] flex flex-col justify-center items-center px-6">
        <div className="max-w-sm w-full bg-white border border-stone-200 p-8 space-y-5 text-center">
          <div className="w-12 h-12 bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-stone-900 text-base">Could not load workspace</h3>
            <p className="text-stone-500 text-xs leading-relaxed">{errorMsg}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setErrorMsg(""); setLoading(true); }}
              className="flex-1 bg-stone-950 hover:bg-stone-800 text-white font-bold text-xs py-2.5 transition-colors cursor-pointer"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push("/login")}
              className="flex-1 border border-stone-200 hover:border-stone-400 text-stone-700 font-bold text-xs py-2.5 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f6f5] font-sans">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
      />

      {/* 2. Main Tab View Panels */}
      <main ref={mainRef} className="flex-1 flex flex-col h-full overflow-hidden bg-[#f4f6f5] relative max-lg:pb-20 lg:pb-0">
        {/* Mobile Top Navigation Header */}
        <header className="h-14 px-4 bg-white/80 backdrop-blur-md border-b border-slate-200/50 items-center justify-between shrink-0 max-lg:flex lg:hidden select-none z-30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-wa-green flex items-center justify-center shadow-md shadow-wa-green/20">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900">WappFlow</span>
            </div>
          </div>
        </header>

        {renderActiveTab()}
      </main>

      <AICopilotSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        orgId={orgId}
        isOpen={isCopilotOpen}
        setIsOpen={setIsCopilotOpen}
      />
    </div>
  );
}
