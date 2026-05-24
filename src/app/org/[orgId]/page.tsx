"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useApp } from "../../../context/AppContext";
import { Sidebar } from "../../../components/Sidebar";
import { OverviewTab } from "../../../components/OverviewTab";
import { InboxTab } from "../../../components/InboxTab";
import { CampaignsTab } from "../../../components/CampaignsTab";
import { TemplatesTab } from "../../../components/TemplatesTab";
import { Loader, AlertCircle, Bot } from "lucide-react";

export default function TenantDashboard() {
  const params = useParams();
  const router = useRouter();
  const { status, data: session } = useSession();
  const { initializeWorkspace } = useApp();

  const orgId = params.orgId as string;

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

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
      } catch (err) {
        if (showLoading) {
          setErrorMsg("Failed to synchronize with local PostgreSQL. Connection timeout.");
          setLoading(false);
        }
      }
    };

    fetchWorkspaceData(true);

    const interval = setInterval(() => fetchWorkspaceData(false), 5000);
    return () => clearInterval(interval);
  }, [orgId, status, initializeWorkspace]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;
      case "inbox":
        return <InboxTab />;
      case "campaigns":
        return <CampaignsTab />;
      case "templates":
        return <TemplatesTab />;
      default:
        return <OverviewTab />;
    }
  };

  // Render authenticating screen
  if (status === "loading" || (loading && !errorMsg)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-amber-50 text-orange-600 font-sans">
        <div className="flex flex-col items-center gap-3.5 animate-pulse-soft">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20">
            <Loader className="w-6 h-6 animate-spin text-white" />
          </div>
          <span className="text-[10px] tracking-widest uppercase font-bold text-stone-500">Synchronizing PostgreSQL Sandbox...</span>
        </div>
      </div>
    );
  }

  // Render Access Error Screen
  if (errorMsg) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col justify-center items-center px-6 relative">
        <div className="max-w-md bg-white border border-orange-100 p-8 rounded-3xl shadow-2xl space-y-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/10">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-stone-900 text-base">Workspace Access Refused</h3>
            <p className="text-stone-500 text-xs leading-relaxed select-text">{errorMsg}</p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
          >
            Return to Login Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-amber-50 font-sans">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Main Tab View Panels */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-amber-50 relative">
        {renderActiveTab()}
      </main>
    </div>
  );
}
