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
      <div className="kc-float w-full max-w-md rounded-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-stone-950 text-white flex items-center justify-center rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base tracking-tight">Wallet Top Up</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ds-btn ds-btn-ghost ds-btn-sm w-8 h-8 justify-center p-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {error && (
            <div className="ds-badge ds-badge-danger w-full justify-start text-xs py-2 px-3 rounded-lg">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="kc-label text-stone-500">Amount (INR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="ds-input"
              min={100}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="ds-btn ds-btn-secondary flex-1 justify-center"
            >
              Cancel
            </button>
            <button
              onClick={handleTopup}
              disabled={loading}
              className="ds-btn ds-btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Proceed to Pay"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
