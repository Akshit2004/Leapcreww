"use client";

import React, { useState } from "react";
import { ShoppingBag, CalendarClock, LayoutGrid, Loader2, CheckCircle2 } from "lucide-react";
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
}> = [
  {
    id: "ECOMMERCE",
    label: "E-Commerce & Catalog",
    desc: "I sell products — broadcast campaigns, run a WhatsApp catalog, handle orders and deliveries.",
    icon: ShoppingBag,
  },
  {
    id: "APPOINTMENT",
    label: "Appointments & Bookings",
    desc: "I take bookings — slots, appointments, reservations or sessions with clients and customers.",
    icon: CalendarClock,
  },
  {
    id: "GENERAL",
    label: "General WhatsApp Marketing",
    desc: "I send broadcasts, automate chats and run a chatbot — not tied to a specific vertical.",
    icon: LayoutGrid,
  },
];

export const BusinessTypeOnboarding: React.FC<BusinessTypeOnboardingProps> = ({
  organizationId,
  onComplete,
}) => {
  const [selecting, setSelecting] = useState<BusinessVertical | null>(null);

  const choose = async (vertical: BusinessVertical) => {
    if (selecting) return;
    setSelecting(vertical);
    try {
      const res = await fetch("/api/usecase/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          businessVertical: vertical,
          useCaseOnboarded: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't save your choice.");
      }
      await onComplete();
    } catch (err) {
      notify.error("Something went wrong", err instanceof Error ? err.message : "Please try again.");
      setSelecting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white border border-stone-200 animate-slide-up">
        <div className="px-6 sm:px-8 pt-8 pb-5 border-b border-stone-100">
          <span className="text-[9px] font-extrabold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 inline-block mb-3">
            Quick Setup
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900">
            What does your business do?
          </h2>
          <p className="text-stone-500 text-xs font-semibold mt-1.5">
            We&apos;ll tailor your navigation to the tools you actually need. You can change this later in Use Cases.
          </p>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 gap-3">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelecting = selecting === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => choose(opt.id)}
                disabled={!!selecting}
                className="text-left p-4 border border-stone-200 bg-white hover:border-stone-900 hover:bg-stone-50 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 flex items-start gap-4"
              >
                <div className="w-10 h-10 shrink-0 flex items-center justify-center border border-stone-200 bg-stone-50">
                  <Icon className="w-5 h-5 text-stone-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold uppercase tracking-wider text-stone-900">{opt.label}</span>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">{opt.desc}</p>
                </div>
                <div className="shrink-0 mt-1">
                  {isSelecting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-stone-200" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
