"use client";

import React, { useState } from "react";
import { X, Loader2, CreditCard } from "lucide-react";

interface WalletTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  refreshWorkspace: (orgId: string) => void;
}

export const WalletTopupModal: React.FC<WalletTopupModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  refreshWorkspace,
}) => {
  const [amount, setAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleTopup = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/org/${organizationId}/wallet/topup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error("Failed to topup");
      await refreshWorkspace(organizationId);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-xs cursor-pointer" onClick={onClose} />
      <div className="w-full max-w-md bg-white border border-stone-200/60 shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-stone-950 text-white flex items-center justify-center shadow-sm">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-light text-stone-900 text-lg tracking-tight">Wallet Top Up</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Amount (INR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-white border border-stone-200 py-2 px-3 focus:outline-none focus:border-stone-400 text-sm"
              min={100}
            />
          </div>
          <button
            onClick={handleTopup}
            disabled={loading}
            className="w-full bg-stone-900 text-white py-3 text-sm font-bold flex items-center justify-center cursor-pointer hover:bg-stone-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Proceed to Pay"}
          </button>
        </div>
      </div>
    </div>
  );
};
