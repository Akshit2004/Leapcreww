"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";

export const QUICK_ACTION_EVENT = "leapcreww:quickaction";

export function dispatchQuickAction(tab: string) {
  window.dispatchEvent(new CustomEvent(QUICK_ACTION_EVENT, { detail: { tab } }));
}

interface FABAction {
  label: string;
  shortLabel: string;
}

const TAB_ACTIONS: Record<string, FABAction> = {
  campaigns:    { label: "New Campaign",   shortLabel: "Campaign" },
  customers:    { label: "Add Contact",    shortLabel: "Contact" },
  templates:    { label: "Create Template", shortLabel: "Template" },
  flows:        { label: "New Flow",       shortLabel: "Flow" },
  ads:          { label: "Create Ad",      shortLabel: "Ad" },
  launches:     { label: "New Launch",     shortLabel: "Launch" },
  inbox:        { label: "New Message",    shortLabel: "Message" },
  chatbot:      { label: "Build Flow",     shortLabel: "Flow" },
  marketplace:  { label: "Add Product",    shortLabel: "Product" },
  usecases:     { label: "Book Slot",      shortLabel: "Booking" },
};

interface QuickActionFABProps {
  activeTab: string;
}

export const QuickActionFAB: React.FC<QuickActionFABProps> = ({ activeTab }) => {
  const action = TAB_ACTIONS[activeTab];
  const [visible, setVisible] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Animate in on tab change
  useEffect(() => {
    setVisible(false);
    clearTimeout(timerRef.current);
    if (!action) return;
    timerRef.current = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(timerRef.current);
  }, [activeTab, action]);

  if (!action) return null;

  return (
    <div
      className={`fixed bottom-24 right-4 lg:bottom-8 lg:right-6 z-40 flex flex-col items-end gap-2 transition-all duration-200 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      {/* Expanded label tooltip */}
      {showLabel && (
        <div className="bg-stone-950 text-white text-xs font-bold px-3 py-1.5 whitespace-nowrap mr-1 animate-fade-in">
          {action.label}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => dispatchQuickAction(activeTab)}
        onMouseEnter={() => setShowLabel(true)}
        onMouseLeave={() => setShowLabel(false)}
        aria-label={action.label}
        className="w-12 h-12 bg-stone-950 hover:bg-stone-800 text-white flex items-center justify-center shadow-lg shadow-black/20 transition-all duration-150 active:scale-95 cursor-pointer group"
      >
        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
      </button>
    </div>
  );
};
