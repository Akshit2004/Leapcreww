"use client";

import React, { useState } from "react";
import { AlertTriangle, X, CreditCard } from "lucide-react";
import { useApp } from "../../context/AppContext";

const LOW_BALANCE_THRESHOLD = 100;

interface WalletWarningBannerProps {
  onNavigate: (tab: string) => void;
}

export const WalletWarningBanner: React.FC<WalletWarningBannerProps> = ({ onNavigate }) => {
  const { organization } = useApp();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!organization) return null;

  const balance = organization.walletBalance ?? 0;
  const isEmpty = balance <= 0;
  const isLow = balance > 0 && balance < LOW_BALANCE_THRESHOLD;

  if (!isEmpty && !isLow) return null;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold border-b shrink-0 ${
        isEmpty
          ? "bg-red-50 border-red-200 text-red-800"
          : "bg-amber-50 border-amber-200 text-amber-800"
      }`}
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span className="flex-1">
        {isEmpty
          ? "Your wallet is empty — all outbound messages are paused until you top up."
          : `Low wallet balance: ₹${balance.toFixed(0)} remaining. Top up to avoid send failures.`}
      </span>
      <button
        onClick={() => onNavigate("settings")}
        className={`flex items-center gap-1.5 px-3 py-1 border font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${
          isEmpty
            ? "border-red-300 hover:bg-red-100"
            : "border-amber-300 hover:bg-amber-100"
        }`}
      >
        <CreditCard className="w-3 h-3" />
        Top Up
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-black/10 transition-colors cursor-pointer shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
