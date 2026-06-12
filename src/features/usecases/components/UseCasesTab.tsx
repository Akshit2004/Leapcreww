"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/shared/context/AppContext";
import { notify } from "@/shared/lib/toast";
import { MarketplaceTab } from "@/features/marketplace/components/MarketplaceTab";
import { AppointmentConsole } from "./AppointmentConsole";
import { RecipesSection } from "@/features/recipes/components/RecipesSection";
import { isValidUseCase, isValidPreset, type UseCaseId, type AppointmentPresetId } from "@/shared/config/useCasePresets";
import { LayoutGrid, ShoppingBag, CalendarClock, Bot, CheckCircle2, RefreshCw } from "lucide-react";

interface AgentOption {
  id: UseCaseId;
  label: string;
  desc: string;
  icon: React.ElementType;
}

const AGENTS: AgentOption[] = [
  {
    id: "NONE",
    label: "Default Chatbot Flow",
    desc: "Inbound messages run through your visual chatbot builder and AI autoresponder. No specialised agent.",
    icon: Bot,
  },
  {
    id: "MARKETPLACE",
    label: "E-Commerce & Catalog Bot",
    desc: "Customers browse your catalog, build carts, and pay — all over WhatsApp. Requires a connected Razorpay account.",
    icon: ShoppingBag,
  },
  {
    id: "APPOINTMENT",
    label: "Appointment Booking Bot",
    desc: "Customers view open slots and book instantly. Free slots confirm immediately; paid slots checkout via Razorpay.",
    icon: CalendarClock,
  },
];

export const UseCasesTab: React.FC = () => {
  const params = useParams();
  const orgId = params.orgId as string;
  const { organization, refreshWorkspace } = useApp();

  const [activeUseCase, setActiveUseCase] = useState<UseCaseId>(
    isValidUseCase(organization?.activeUseCase) ? (organization!.activeUseCase as UseCaseId) : "NONE"
  );
  const [preset, setPreset] = useState<AppointmentPresetId>(
    isValidPreset(organization?.appointmentPreset) ? (organization!.appointmentPreset as AppointmentPresetId) : "HEALTHCARE"
  );
  const [switching, setSwitching] = useState<UseCaseId | null>(null);

  const selectAgent = async (id: UseCaseId) => {
    if (id === activeUseCase || switching) return;
    setSwitching(id);
    try {
      const res = await fetch("/api/usecase/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, activeUseCase: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify.error("Couldn't switch agent", data.error || "An unexpected error occurred.");
      } else {
        setActiveUseCase(id);
        await refreshWorkspace(orgId);
        const label = AGENTS.find((a) => a.id === id)?.label || "Agent";
        notify.success("Active agent updated", `${label} is now handling inbound WhatsApp messages.`);
      }
    } catch {
      notify.error("Couldn't switch agent", "Please try again in a moment.");
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-12 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up bg-[#fafaf9]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-stone-200 pb-6 select-none">
        <div className="w-10 h-10 rounded-none bg-stone-950 flex items-center justify-center border border-stone-950 shrink-0">
          <LayoutGrid className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-900 uppercase">Use Cases</h1>
          <p className="text-xs text-stone-500">Choose which agent handles your WhatsApp inbound messages</p>
        </div>
      </div>

      {/* Active Agent selector */}
      <div className="bg-white rounded-none p-5 sm:p-6 border border-stone-200">
        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-widest mb-1">Active Agent</h3>
        <p className="text-[11px] text-stone-500 mb-4 leading-relaxed">
          Only one agent can be active at a time. Switching automatically deactivates the previous one.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {AGENTS.map((agent) => {
            const Icon = agent.icon;
            const active = agent.id === activeUseCase;
            const isSwitching = switching === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => selectAgent(agent.id)}
                disabled={!!switching}
                className={`text-left p-4 border transition-all cursor-pointer disabled:cursor-not-allowed flex flex-col gap-2 ${
                  active
                    ? "bg-stone-950 text-white border-stone-950"
                    : "bg-white text-stone-700 border-stone-200 hover:border-stone-400 disabled:opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 flex items-center justify-center border ${active ? "border-white/30 bg-white/10" : "border-stone-200 bg-stone-50"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSwitching ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : active ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : null}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">{agent.label}</span>
                <span className={`text-[11px] leading-relaxed ${active ? "text-stone-300" : "text-stone-400"}`}>
                  {agent.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-console */}
      {activeUseCase === "MARKETPLACE" && <MarketplaceTab embedded />}
      {activeUseCase === "APPOINTMENT" && (
        <AppointmentConsole orgId={orgId} preset={preset} onPresetChange={setPreset} />
      )}
      {activeUseCase === "NONE" && (
        <div className="bg-white border border-stone-200 p-8 text-center">
          <Bot className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="text-xs text-stone-500 uppercase tracking-wider font-bold mb-1">Default Chatbot Flow Active</p>
          <p className="text-[11px] text-stone-400 max-w-md mx-auto leading-relaxed">
            Inbound WhatsApp messages are handled by your visual chatbot builder and AI autoresponder. Select an
            agent above to switch to a specialised use case.
          </p>
        </div>
      )}

      {/* One-click automation recipes */}
      <div className="bg-white border border-stone-200 p-5 sm:p-6">
        <RecipesSection />
      </div>
    </div>
  );
};
