"use client";

import React, { useState } from "react";
import {
  ShoppingBag,
  CalendarClock,
  LayoutGrid,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { notify } from "@/shared/lib/toast";
import type { BusinessVertical } from "@/shared/config/navigation";

interface BusinessTypeOnboardingProps {
  organizationId: string;
  onComplete: () => Promise<void>;
}

const OPTIONS: Array<{
  id: BusinessVertical;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverBorderColor: string;
}> = [
  {
    id: "ECOMMERCE",
    label: "E-Commerce & Catalog",
    desc: "I sell products — broadcast campaigns, run a WhatsApp catalog, handle orders and deliveries.",
    icon: ShoppingBag,
    color: "text-teal-700",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    hoverBorderColor: "hover:border-teal-500",
  },
  {
    id: "APPOINTMENT",
    label: "Appointments & Bookings",
    desc: "I take bookings — slots, appointments, reservations or sessions with clients and customers.",
    icon: CalendarClock,
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    hoverBorderColor: "hover:border-violet-500",
  },
  {
    id: "GENERAL",
    label: "General WhatsApp Marketing",
    desc: "I send broadcasts, automate chats and run a chatbot — not tied to a specific vertical.",
    icon: LayoutGrid,
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    hoverBorderColor: "hover:border-amber-500",
  },
];

const TONE_OPTIONS = [
  "Friendly & Warm",
  "Professional & Formal",
  "Fun & Playful",
  "Concise & Direct",
  "Empathetic & Supportive",
];

const VERTICAL_LEFT_BORDER: Record<BusinessVertical, string> = {
  ECOMMERCE: "border-l-teal-500",
  APPOINTMENT: "border-l-violet-500",
  GENERAL: "border-l-amber-500",
};

function ProgressDots({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      <div
        className="w-2.5 h-2.5 rounded-full transition-colors duration-300"
        style={{ background: step >= 1 ? "#128c7e" : "#d6d3d1" }}
      />
      <div
        className="w-2.5 h-2.5 rounded-full transition-colors duration-300"
        style={{ background: step >= 2 ? "#128c7e" : "#d6d3d1" }}
      />
    </div>
  );
}

export const BusinessTypeOnboarding: React.FC<BusinessTypeOnboardingProps> = ({
  organizationId,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedVertical, setSelectedVertical] =
    useState<BusinessVertical | null>(null);
  const [brandName, setBrandName] = useState("");
  const [selectedTone, setSelectedTone] = useState(TONE_OPTIONS[0]);
  const [loading, setLoading] = useState(false);

  const handleVerticalSelect = (vertical: BusinessVertical) => {
    setSelectedVertical(vertical);
    setStep(2);
  };

  const handleFinish = async () => {
    if (!selectedVertical || loading) return;
    setLoading(true);
    try {
      const calls: Promise<Response>[] = [
        fetch("/api/usecase/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId,
            businessVertical: selectedVertical,
            useCaseOnboarded: true,
          }),
        }),
      ];

      if (brandName.trim()) {
        calls.push(
          fetch(`/api/org/${organizationId}/brand-profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: brandName.trim(),
              toneOfVoice: selectedTone,
            }),
          })
        );
      }

      const results = await Promise.all(calls);
      for (const res of results) {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error || "Something went wrong."
          );
        }
      }

      await onComplete();
    } catch (err) {
      notify.error(
        "Setup failed",
        err instanceof Error ? err.message : "Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/70 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl ds-modal-in overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-7 pb-5">
          <ProgressDots step={step} />

          {step === 1 ? (
            <>
              <h2 className="text-xl font-bold tracking-tight text-stone-900 text-center">
                What does your business do?
              </h2>
              <p className="text-stone-500 text-sm mt-1.5 text-center leading-relaxed">
                We&apos;ll personalise your dashboard and AI features around it.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold tracking-tight text-stone-900 text-center">
                How should your AI speak?
              </h2>
              <p className="text-stone-500 text-sm mt-1.5 text-center leading-relaxed">
                Your AI Copilot will adopt this brand voice.
              </p>
            </>
          )}
        </div>

        {/* Body */}
        {step === 1 ? (
          <div className="px-6 pb-7 grid grid-cols-1 gap-3">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleVerticalSelect(opt.id)}
                  className={[
                    "group text-left p-4 border-2 rounded-xl bg-white transition-all duration-200 cursor-pointer flex items-start gap-4",
                    "border-stone-100 hover:shadow-md",
                    `border-l-4 ${VERTICAL_LEFT_BORDER[opt.id]} ${opt.hoverBorderColor}`,
                  ].join(" ")}
                  style={{ transform: "translateY(0)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(0)";
                  }}
                >
                  <div
                    className={[
                      "w-11 h-11 shrink-0 flex items-center justify-center rounded-full",
                      opt.bgColor,
                    ].join(" ")}
                  >
                    <Icon className={["w-5 h-5", opt.color].join(" ")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-stone-900">
                      {opt.label}
                    </span>
                    <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                      {opt.desc}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 shrink-0 mt-1 transition-colors" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="px-6 pb-7 flex flex-col gap-5">
            {/* Brand name */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wide">
                Brand / Business Name{" "}
                <span className="text-stone-400 normal-case font-normal tracking-normal">
                  (optional)
                </span>
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Dr. Mehta's Clinic"
                className="w-full border border-stone-200 rounded-lg px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all"
              />
            </div>

            {/* AI tone */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wide">
                AI Tone of Voice
              </label>
              <select
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3.5 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100 transition-all appearance-none cursor-pointer"
              >
                {TONE_OPTIONS.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone}
                  </option>
                ))}
              </select>
            </div>

            {/* Settings note */}
            <p className="text-xs text-stone-400 text-center -mt-1">
              You can update these anytime in Settings
            </p>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                onClick={() => setStep(1)}
                disabled={loading}
                className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors disabled:opacity-40"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                onClick={handleFinish}
                disabled={loading}
                className="flex items-center gap-2 bg-stone-900 hover:bg-stone-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    Finish Setup
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
