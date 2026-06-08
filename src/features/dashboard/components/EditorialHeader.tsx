"use client";

import React from "react";
import { Wallet, CheckCircle2, AlertCircle, CreditCard } from "lucide-react";
import { Organization } from "@/shared/context/types";

interface EditorialHeaderProps {
  organization: Organization | null;
  onManageBillingClick: () => void;
}

export const EditorialHeader: React.FC<EditorialHeaderProps> = ({
  organization,
  onManageBillingClick,
}) => {
  const fbConnected = !!(organization?.whatsappConnected || organization?.whatsappBusinessAccountId);

  // Today's date in a clean editorial/journal format (e.g., "MAY 29, 2026 // ISSUE NO. 14")
  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();

  return (
    <header className="border-b border-stone-200 pb-6 sm:pb-8 space-y-4 sm:space-y-6 select-none bg-[#fafaf9] p-4 sm:p-6 rounded-none">
      {/* Editorial Meta Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500 uppercase tracking-widest border-b border-stone-200/60 pb-3">
        <div>
          <span>WAPPFLOW JOURNAL</span>
          <span className="mx-2 text-stone-300">{"//"}</span>
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-stone-900 rounded-full animate-pulse-soft" />
          <span>WORKSPACE LIVE</span>
        </div>
      </div>

      {/* Main Grid Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left/Center Column: Workspace Info */}
        <div className="lg:col-span-2 space-y-3">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-stone-950 leading-tight">
            {organization?.name || "Workspace Journal"}
          </h1>
          <p className="text-stone-500 max-w-2xl text-sm leading-relaxed">
            A real-time editorial log of your automated messaging operations, CRM sync streams, and customer interactions. Complete, unified control without the dashboard noise.
          </p>

          {/* Connection Status Sub-text */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs">
            <div className="flex items-center gap-1.5">
              {fbConnected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-900" />
                  <span className="text-stone-900 font-semibold">WABA LINKED</span>
                  <span className="text-stone-400">({(organization?.whatsappBusinessAccountId as string)?.substring(0, 12) || "Sandbox-Active"}...)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-stone-400" />
                  <span className="text-stone-500">SANDBOX SIMULATOR ACTIVE</span>
                </>
              )}
            </div>
            {fbConnected && (
              <div className="text-stone-500">
                <span>ESTABLISHED // 2026</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Flat Minimalist Meta Billing Dock */}
        <div className="bg-white border border-stone-200 p-5 flex flex-col justify-between space-y-4 hover:border-stone-900 transition-colors duration-300">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase block">
              META CLOUD BILLING
            </span>
            <div className="flex items-center gap-2 text-stone-950 font-semibold tracking-tight">
              {fbConnected ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-xl">Active & Verified</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-stone-400" />
                  <span className="text-xl text-stone-500">Unlinked</span>
                </>
              )}
            </div>
            <p className="text-[10px] text-stone-500 uppercase mt-1">
              Direct billing via Meta Business Suite
            </p>
          </div>

          <button
            onClick={onManageBillingClick}
            className="w-full bg-stone-950 text-white text-[10px] tracking-widest uppercase py-2 px-3 border border-stone-950 hover:bg-white hover:text-stone-950 transition-all duration-300 font-bold flex items-center justify-center gap-2 rounded-none"
          >
            <CreditCard className="w-3.5 h-3.5" />
            MANAGE BILLING
          </button>
        </div>
      </div>
    </header>
  );
};