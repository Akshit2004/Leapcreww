"use client";

import React, { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
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
import { UseCasesTab } from "@/features/usecases/components/UseCasesTab";
import { SettingsTab } from "@/features/settings/components/SettingsTab";
import { IntegrationsTab } from "@/features/integrations/components/IntegrationsTab";
import { AnalyticsTab } from "@/features/analytics/components/AnalyticsTab";
import { AdsTab } from "@/features/ads/components/AdsTab";
import { LaunchesTab } from "@/features/launches/components/LaunchesTab";
import { NdrTab } from "@/features/ndr/components/NdrTab";
import { AICopilotSidebar } from "@/features/ai/components/AICopilotSidebar";
import { CommandPalette } from "@/shared/components/CommandPalette";
import { DashboardSkeleton } from "@/shared/components/ui/Skeleton";
import { isValidTab } from "@/shared/config/navigation";
import { Loader, AlertCircle, Bot } from "lucide-react";

const MAX_RETRIES = 4;

function TenantDashboardInner() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const { initializeWorkspace } = useApp();

  const orgId = params.orgId as string;

  // Tab is derived from the URL (?tab=) so refresh, deep-links, and the
  // browser back/forward buttons all work.
  const tabParam = searchParams.get("tab");
  const activeTab = isValidTab(tabParam) ? (tabParam as string) : "overview";

  const mainRef = useRef<HTMLElement>(null);
  const handleTabChange = useCallback(
    (tab: string) => {
      router.push(`${pathname}?tab=${tab}`, { scroll: false });
      mainRef.current?.scrollTo({ top: 0 });
    },
    [router, pathname]
  );

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const retryRef = useRef(0);

  // 1. Session Redirect Guard
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // 2. Fetch scoped workspace data on mount or org switch, with auto-retry.
  useEffect(() => {
    if (status !== "authenticated" || !orgId) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    const fetchWorkspaceData = async () => {
      setErrorMsg("");

      try {
        const response = await fetch(`/api/org/${orgId}/data`);
        if (cancelled) return;

        if (!response.ok) {
          if (response.status === 403) {
            // Access denial is terminal — retrying won't help.
            setErrorMsg(
              "You don't have access to this workspace. Ask an admin to invite you, or switch accounts."
            );
            setLoading(false);
            return;
          }
          throw new Error("sync_failed");
        }

        const data = await response.json();
        if (cancelled) return;
        initializeWorkspace(data);
        retryRef.current = 0;
        setLoading(false);
      } catch {
        if (cancelled) return;
        if (retryRef.current < MAX_RETRIES) {
          // Exponential backoff — keep the loader up while we retry quietly.
          const delay = Math.min(1000 * 2 ** retryRef.current, 8000);
          retryRef.current += 1;
          retryTimer = setTimeout(fetchWorkspaceData, delay);
        } else {
          setErrorMsg(
            "We're having trouble loading your workspace. Check your connection and try again."
          );
          setLoading(false);
        }
      }
    };

    setLoading(true);
    fetchWorkspaceData();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [orgId, status, initializeWorkspace, reloadKey]);

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
      case "usecases":
        return <UseCasesTab />;
      case "integrations":
        return <IntegrationsTab />;
      case "ndr":
        return <NdrTab />;
      case "launches":
        return <LaunchesTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <OverviewTab onNavigate={handleTabChange} />;
    }
  };

  const handleRetry = () => {
    retryRef.current = 0;
    setErrorMsg("");
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

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
              onClick={handleRetry}
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

  // Initial auth check — brief, before we can even show the shell.
  if (status === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f4f6f5] text-wa-green font-sans">
        <div className="flex flex-col items-center gap-4 animate-slide-up">
          <div className="w-14 h-14 rounded-2xl bg-wa-green flex items-center justify-center shadow-xl shadow-wa-green/30">
            <Loader className="w-6 h-6 animate-spin text-white" />
          </div>
          <span className="text-[11px] tracking-widest uppercase font-extrabold text-stone-600">
            Signing you in…
          </span>
        </div>
      </div>
    );
  }

  // Main shell — renders immediately; the main panel shows a skeleton while
  // the workspace data syncs so the layout never blocks on a full-screen spinner.
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f6f5] font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenCopilot={() => setIsCopilotOpen(true)}
      />

      <main
        ref={mainRef}
        className="flex-1 flex flex-col h-full overflow-hidden bg-[#f4f6f5] relative max-lg:pb-20 lg:pb-0"
      >
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

        {loading ? <DashboardSkeleton /> : renderActiveTab()}
      </main>

      <AICopilotSidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        orgId={orgId}
        isOpen={isCopilotOpen}
        setIsOpen={setIsCopilotOpen}
      />

      <CommandPalette
        onNavigate={handleTabChange}
        onOpenCopilot={() => setIsCopilotOpen(true)}
      />
    </div>
  );
}

export default function TenantDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TenantDashboardInner />
    </Suspense>
  );
}
