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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50" onClick={handleClose} />
      <div className="relative bg-white border border-stone-200 w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#D05E3C]" />
            <span className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Win-Back Campaign
            </span>
          </div>
          <button onClick={handleClose} className="text-stone-400 hover:text-stone-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {result ? (
            <div className="text-center space-y-3 py-2">
              <CheckCircle2 className="w-8 h-8 text-[#2E4A3F] mx-auto" />
              <p className="text-sm font-bold text-stone-900">Campaign launched</p>
              <p className="text-xs text-stone-500">
                <span className="font-bold text-stone-800">{result.tagged}</span> contact
                {result.tagged !== 1 ? "s" : ""} tagged "win-back" —{" "}
                <span className="font-bold text-stone-800">{result.enrolled}</span> enrolled in
                the win-back sequence.
              </p>
              <p className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">
                Install the win-back recipe in Use Cases if not already active.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Target contacts inactive for
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {THRESHOLDS.map(({ label, days }) => (
                    <button
                      key={days}
                      onClick={() => setDormantDays(days)}
                      className={`py-2 text-[11px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                        dormantDays === days
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-100 px-4 py-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Contacts matched
                </span>
                <span className="text-2xl font-bold text-stone-900">{matchCount}</span>
              </div>

              <p className="text-[11px] text-stone-400 leading-relaxed">
                These contacts will be tagged <span className="font-mono bg-stone-100 px-1">win-back</span> and
                automatically enrolled into the win-back sequence.
              </p>

              {error && (
                <p className="text-xs text-red-600 font-medium">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 text-xs font-bold text-stone-600 border border-stone-200 hover:border-stone-400 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLaunch}
                  disabled={loading || matchCount === 0}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-[#D05E3C] hover:bg-[#b84e30] disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Flame className="w-3.5 h-3.5" />
                  )}
                  {loading ? "Launching..." : "Launch Campaign"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
