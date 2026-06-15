"use client";

import React from "react";
import { X, CheckCircle2, ArrowUpRight } from "lucide-react";

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
  businessVertical?: string;
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
  businessVertical,
}) => {
  if (!showChecklist) return null;

  const isAppointment = businessVertical === "APPOINTMENT";

  const steps = [
    {
      label: "Connect WhatsApp",
      desc: "Link your WhatsApp Business Account so messages can send.",
      done: fbConnected,
      onClick: () => onNavigate?.("settings"),
    },
    {
      label: "Approve a Template",
      desc: "Get a message template approved by Meta for broadcasts.",
      done: templatesApproved,
      onClick: () => onNavigate?.("templates"),
    },
    {
      label: "Import Contacts",
      desc: "Upload your contact list via CSV to build your audience.",
      done: contactsImported,
      onClick: () => onImportClick?.(),
    },
    isAppointment
      ? {
          label: "Set Up Booking Slots",
          desc: "Open your availability so customers can book on WhatsApp.",
          done: false,
          onClick: () => onNavigate?.("usecases"),
        }
      : {
          label: "Send a Campaign",
          desc: "Launch your first broadcast to your contacts.",
          done: campaignSent,
          onClick: () => onNavigate?.("campaigns"),
        },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div className="bg-white border border-stone-200 relative">
      <button
        onClick={() => dismissOnboarding(organizationId)}
        className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 transition-colors cursor-pointer z-10"
        title="Dismiss Setup Checklist"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-stone-200">
        <span className="text-[10px] font-black uppercase tracking-widest text-wa-green-dark bg-wa-green/10 px-2 py-1 inline-block mb-2">
          Workspace Setup — {completedCount}/{steps.length} done
        </span>
        <h3 className="text-xl font-black tracking-tight text-stone-900 mb-1">Welcome to LeapCreww 👋</h3>
        <p className="text-stone-500 text-sm">Complete these steps to start broadcasting on WhatsApp.</p>
        <div className="mt-3 h-1.5 bg-stone-100 w-full">
          <div
            className="h-1.5 bg-wa-green transition-all"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-stone-200 sm:divide-x">
        {steps.map((step, i) => (
          <button
            key={step.label}
            onClick={step.onClick}
            className={`p-5 text-left cursor-pointer hover:bg-stone-50 transition-colors flex flex-col gap-2 ${step.done ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Step {i + 1}</span>
              {step.done ? (
                <CheckCircle2 className="w-4 h-4 text-wa-green" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-stone-300" />
              )}
            </div>
            <p className="font-bold text-sm text-stone-900">{step.label}</p>
            <p className="text-xs text-stone-500 leading-relaxed">{step.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
