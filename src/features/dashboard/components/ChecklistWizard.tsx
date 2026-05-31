"use client";

import React from "react";
import { X, CheckCircle2, ChevronRight } from "lucide-react";

interface ChecklistWizardProps {
  organizationId: string;
  fbConnected: boolean;
  templatesApproved: boolean;
  contactsImported: boolean;
  campaignSent: boolean;
  onNavigate?: (tab: string) => void;
  onImportClick?: () => void;
  dismissOnboarding: (orgId: string) => Promise<void>;
  showChecklist: boolean;
}

export const ChecklistWizard: React.FC<ChecklistWizardProps> = ({
  organizationId,
  fbConnected,
  templatesApproved,
  contactsImported,
  campaignSent,
  onNavigate,
  onImportClick,
  dismissOnboarding,
  showChecklist,
}) => {
  if (!showChecklist) return null;

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm relative overflow-hidden animate-slide-up select-none">
      <button 
        onClick={() => dismissOnboarding(organizationId)}
        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer z-10"
        title="Dismiss Setup Wizard"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="mb-5 relative z-10">
        <span className="text-[9px] font-extrabold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-250/20 px-2.5 py-1 rounded-md mb-2 inline-block">Workspace Setup</span>
        <h3 className="text-xl font-extrabold tracking-tight text-slate-900 mb-1">Welcome to WappFlow! Let&apos;s get you set up.</h3>
        <p className="text-stone-500 text-xs font-semibold">Complete these simple steps to start broadcasting campaigns on WhatsApp.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        <button
          onClick={() => onNavigate?.("settings")}
          className={`bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-2.5 text-left cursor-pointer hover:bg-slate-100/50 hover:border-slate-300 transition-all duration-300 hover:shadow-xs hover:scale-[1.01] ${fbConnected ? 'opacity-65' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-800">1. Connect Meta</span>
            {fbConnected ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </div>
          <p className="text-[11px] text-stone-600 font-medium">Link your WhatsApp Business Account (WABA).</p>
        </button>
        
        <button
          onClick={() => onNavigate?.("templates")}
          className={`bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-2.5 text-left cursor-pointer hover:bg-slate-100/50 hover:border-slate-300 transition-all duration-300 hover:shadow-xs hover:scale-[1.01] ${templatesApproved ? 'opacity-65' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-800">2. Sync Templates</span>
            {templatesApproved ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </div>
          <p className="text-[11px] text-stone-600 font-medium">Get approval from Meta on your custom templates.</p>
        </button>
        
        <button
          onClick={() => onImportClick?.()}
          className={`bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-2.5 text-left cursor-pointer hover:bg-slate-100/50 hover:border-slate-300 transition-all duration-300 hover:shadow-xs hover:scale-[1.01] ${contactsImported ? 'opacity-65' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-800">3. Import Contacts</span>
            {contactsImported ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </div>
          <p className="text-[11px] text-stone-600 font-medium">Upload contact lists via CSV or database syncing.</p>
        </button>
        
        <button
          onClick={() => onNavigate?.("campaigns")}
          className={`bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-2.5 text-left cursor-pointer hover:bg-slate-100/50 hover:border-slate-300 transition-all duration-300 hover:shadow-xs hover:scale-[1.01] ${campaignSent ? 'opacity-65' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-800">4. Send Campaign</span>
            {campaignSent ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </div>
          <p className="text-[11px] text-stone-600 font-medium">Launch your very first broad-scale test campaign!</p>
        </button>
      </div>
    </div>
  );
};
