"use client";

import React, { useState, useMemo } from "react";
import { X, Flame, Loader, CheckCircle2 } from "lucide-react";
import type { Contact } from "@/shared/context/types";

const THRESHOLDS = [
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
  { label: "180 days", days: 180 },
];

interface WinBackModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  contacts: Contact[];
}

export const WinBackModal: React.FC<WinBackModalProps> = ({
  isOpen,
  onClose,
  orgId,
  contacts,
}) => {
  const [dormantDays, setDormantDays] = useState(60);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tagged: number; enrolled: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const matchCount = useMemo(() => {
    if (!contacts) return 0;
    const cutoff = new Date(Date.now() - dormantDays * 24 * 60 * 60 * 1000);
    return contacts.filter((c) => {
      if (c.tags?.includes("win-back")) return false;
      if (!c.lastActiveAt) return true;
      return new Date(c.lastActiveAt) < cutoff;
    }).length;
  }, [contacts, dormantDays]);

  const handleLaunch = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/org/${orgId}/contacts/bulk-tag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: "win-back", dormantDays }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to launch campaign.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-[#D05E3C]/10 flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 text-[#D05E3C]" />
              </div>
              <h3 className="text-base font-black text-stone-900">Win-Back Campaign</h3>
            </div>
            <p className="text-xs text-stone-500 mt-1">Re-engage dormant contacts automatically</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {result ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-black text-stone-900 mb-1">Campaign launched!</p>
                <p className="text-xs text-stone-500 leading-relaxed">
                  <span className="font-bold text-stone-800">{result.tagged}</span> contact
                  {result.tagged !== 1 ? "s" : ""} tagged{" "}
                  <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded-md text-[10px]">win-back</span>{" "}
                  — <span className="font-bold text-stone-800">{result.enrolled}</span> enrolled in the sequence.
                </p>
              </div>
              <p className="text-[10px] text-stone-400 leading-relaxed">
                Install the win-back recipe in Use Cases if not already active.
              </p>
              <button
                onClick={handleClose}
                className="w-full py-2.5 text-xs font-bold text-stone-700 border border-stone-200 hover:bg-stone-50 rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Threshold selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Target contacts inactive for
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {THRESHOLDS.map(({ label, days }) => (
                    <button
                      key={days}
                      onClick={() => setDormantDays(days)}
                      className={`py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                        dormantDays === days
                          ? "bg-[#D05E3C] text-white border-[#D05E3C]"
                          : "bg-white text-stone-500 border-stone-200 hover:border-[#D05E3C]/40 hover:text-[#D05E3C]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Match count preview */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Contacts matched</span>
                  <span className="text-xs text-stone-500 mt-0.5">Will receive win-back tag</span>
                </div>
                <span className={`text-3xl font-black font-mono ${matchCount > 0 ? "text-[#D05E3C]" : "text-stone-300"}`}>
                  {matchCount}
                </span>
              </div>

              <p className="text-[11px] text-stone-400 leading-relaxed">
                These contacts will be tagged{" "}
                <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded-md text-[10px] text-stone-600">win-back</span>{" "}
                and automatically enrolled into the re-engagement sequence.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}

              {/* Footer actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 text-xs font-bold text-stone-700 border border-stone-200 bg-white hover:bg-stone-50 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLaunch}
                  disabled={loading || matchCount === 0}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-[#D05E3C] hover:bg-[#b84e30] disabled:opacity-40 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Flame className="w-3.5 h-3.5" />
                  )}
                  {loading ? "Launching…" : "Launch Campaign"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
