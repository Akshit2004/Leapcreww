"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/shared/context/AppContext";
import { notify } from "@/shared/lib/toast";
import {
  APPOINTMENT_PRESETS,
  APPOINTMENT_PRESET_IDS,
  getPreset,
  type AppointmentPresetId,
} from "@/shared/config/useCasePresets";
import {
  CalendarClock,
  Plus,
  Trash2,
  X,
  RefreshCw,
  CheckCircle2,
  Clock,
  User,
  CalendarDays,
} from "lucide-react";

interface SlotContact {
  id: string;
  name: string;
  phone: string;
}

interface Slot {
  id: string;
  serviceName: string;
  startTime: string;
  durationMinutes: number;
  price: number;
  isBooked: boolean;
  paymentStatus: string;
  holdExpiresAt: string | null;
  contact: SlotContact | null;
}

interface AppointmentConsoleProps {
  orgId: string;
  preset: AppointmentPresetId;
  onPresetChange: (preset: AppointmentPresetId) => void;
}

type SlotState = "available" | "held" | "booked";

function slotState(s: Slot): SlotState {
  if (s.isBooked) return "booked";
  if (s.paymentStatus === "pending" && s.holdExpiresAt && new Date(s.holdExpiresAt) > new Date()) return "held";
  return "available";
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export const AppointmentConsole: React.FC<AppointmentConsoleProps> = ({ orgId, preset, onPresetChange }) => {
  const terms = getPreset(preset);
  const { refreshWorkspace } = useApp();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [presetSaving, setPresetSaving] = useState(false);

  const [form, setForm] = useState({ serviceName: "", startTime: "", durationMinutes: "30", price: "" });

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch(`/api/usecase/slots?orgId=${orgId}`);
      const data = await res.json();
      if (res.ok) setSlots(data.slots || []);
    } catch (err) {
      console.error("Failed to fetch slots", err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const resetForm = () => {
    setForm({ serviceName: "", startTime: "", durationMinutes: "30", price: "" });
    setShowAdd(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/usecase/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          slots: [
            {
              serviceName: form.serviceName,
              startTime: new Date(form.startTime).toISOString(),
              durationMinutes: parseInt(form.durationMinutes) || 30,
              price: Math.round(parseFloat(form.price || "0") * 100),
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify.error("Couldn't add slot", data.error || "An unexpected error occurred.");
      } else {
        setSlots(data.slots || []);
        notify.success("Slot added", "Your new booking slot is now live.");
        resetForm();
      }
    } catch {
      notify.error("Couldn't add slot", "Please try again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/usecase/slots/${id}?orgId=${orgId}`, { method: "DELETE" });
      if (res.ok) {
        setSlots((prev) => prev.filter((s) => s.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        notify.error("Couldn't delete slot", data.error || "An unexpected error occurred.");
      }
    } catch {
      notify.error("Couldn't delete slot", "Please try again in a moment.");
    }
  };

  const handlePreset = async (id: AppointmentPresetId) => {
    if (id === preset || presetSaving) return;
    setPresetSaving(true);
    // Optimistic — terminology updates instantly; revert on failure.
    onPresetChange(id);
    try {
      const res = await fetch("/api/usecase/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, appointmentPreset: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onPresetChange(preset);
        notify.error("Couldn't switch preset", data.error || "An unexpected error occurred.");
      } else {
        // Keep the global workspace context in sync so other tabs see the new
        // terminology preset without a manual page reload.
        await refreshWorkspace(orgId);
      }
    } catch {
      onPresetChange(preset);
      notify.error("Couldn't switch preset", "Please try again in a moment.");
    } finally {
      setPresetSaving(false);
    }
  };

  const now = Date.now();
  const stats = {
    total: slots.length,
    available: slots.filter((s) => slotState(s) === "available" && new Date(s.startTime).getTime() > now).length,
    booked: slots.filter((s) => s.isBooked).length,
    revenue: slots.filter((s) => s.isBooked && s.paymentStatus === "paid").reduce((sum, s) => sum + s.price, 0),
  };

  return (
    <div className="space-y-6">
      {/* Terminology Preset Selector */}
      <div className="bg-white rounded-none p-5 sm:p-6 border border-stone-200">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-widest">Terminology Preset</h3>
        </div>
        <p className="text-[11px] text-stone-500 mb-4 leading-relaxed">
          Choose the vocabulary that fits your business. This relabels slots, fees, and clients across the
          booking bot and this console.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {APPOINTMENT_PRESET_IDS.map((id) => {
            const p = APPOINTMENT_PRESETS[id];
            const active = id === preset;
            return (
              <button
                key={id}
                onClick={() => handlePreset(id)}
                disabled={presetSaving}
                className={`text-left p-3 border transition-all cursor-pointer disabled:opacity-60 ${
                  active
                    ? "bg-stone-950 text-white border-stone-950"
                    : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">{p.label}</span>
                  {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-[10px] mt-1 block leading-tight ${active ? "text-stone-300" : "text-stone-400"}`}>
                  {p.slotLabel} · {p.feeLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="Total Slots" value={stats.total} />
        <StatCard icon={CalendarClock} label="Available" value={stats.available} />
        <StatCard icon={CheckCircle2} label={`${terms.bookingNoun}s booked`} value={stats.booked} />
        <StatCard icon={User} label="Revenue (paid)" value={`₹${(stats.revenue / 100).toFixed(2)}`} />
      </div>

      {/* Slot management */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-widest">Booking Slots</h3>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-stone-950 text-white rounded-none border border-stone-950 text-xs font-bold hover:bg-stone-900 transition-all cursor-pointer uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" /> Add Slot
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreate} className="bg-white rounded-none p-6 border border-stone-200 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="font-bold text-stone-900 uppercase text-xs">New Slot</h3>
            <button type="button" onClick={resetForm} className="p-1 hover:bg-stone-100 rounded-none cursor-pointer border border-transparent">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={terms.slotLabel} value={form.serviceName} onChange={(v) => setForm({ ...form, serviceName: v })} required />
            <Field label="Date & Time" type="datetime-local" value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} required />
            <Field label="Duration (min)" type="number" value={form.durationMinutes} onChange={(v) => setForm({ ...form, durationMinutes: v })} />
            <Field label={`${terms.feeLabel} (₹) — 0 for free`} type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-stone-950 text-white rounded-none border border-stone-950 text-xs font-bold hover:bg-stone-900 transition-all cursor-pointer uppercase disabled:opacity-50"
          >
            {saving ? "Saving…" : "Create Slot"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-5 h-5 text-stone-900 animate-spin" />
        </div>
      ) : (
        <SlotList slots={slots} terms={terms} onDelete={handleDelete} />
      )}
    </div>
  );
};

// ─── Slot list ───────────────────────────────────────────────────────────────

const SlotList: React.FC<{
  slots: Slot[];
  terms: ReturnType<typeof getPreset>;
  onDelete: (id: string) => void;
}> = ({ slots, terms, onDelete }) => {
  if (slots.length === 0) {
    return (
      <div className="bg-white border border-stone-200 p-8 text-center text-stone-500 text-xs uppercase tracking-wider">
        No slots yet. Add your first booking slot above.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-none border border-stone-200 divide-y divide-stone-100">
      {slots.map((s) => {
        const state = slotState(s);
        return (
          <div key={s.id} className="flex max-sm:flex-col sm:items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-stone-900 truncate">{s.serviceName}</span>
                <StateBadge state={state} />
              </div>
              <div className="text-xs text-stone-500 mt-1">
                {formatWhen(s.startTime)} · {s.durationMinutes} min ·{" "}
                {s.price > 0 ? `₹${(s.price / 100).toFixed(2)}` : "Free"}
              </div>
              {s.contact && state !== "available" && (
                <div className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-1">
                  <User className="w-3 h-3" /> {terms.clientLabel}: {s.contact.name} ({s.contact.phone})
                </div>
              )}
            </div>
            <button
              onClick={() => onDelete(s.id)}
              className="self-start sm:self-auto p-1.5 hover:bg-red-50 hover:text-red-600 rounded-none text-stone-400 border border-transparent hover:border-red-200 cursor-pointer transition-colors"
              title="Delete slot"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

const StateBadge: React.FC<{ state: SlotState }> = ({ state }) => {
  const map: Record<SlotState, { label: string; cls: string; icon: React.ReactNode }> = {
    available: {
      label: "Available",
      cls: "text-stone-900 bg-stone-100 border-stone-300",
      icon: <CalendarClock className="w-3 h-3" />,
    },
    held: {
      label: "Held",
      cls: "text-amber-700 bg-amber-50 border-amber-200",
      icon: <Clock className="w-3 h-3" />,
    },
    booked: {
      label: "Booked",
      cls: "text-emerald-700 bg-emerald-50 border-emerald-200",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
  };
  const c = map[state];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 border rounded-none uppercase ${c.cls}`}>
      {c.icon} {c.label}
    </span>
  );
};

// ─── Small UI atoms ──────────────────────────────────────────────────────────

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode }> = ({ icon: Icon, label, value }) => (
  <div className="bg-white rounded-none p-4 border border-stone-200">
    <div className="flex items-center gap-2 text-stone-400 mb-2">
      <Icon className="w-4 h-4" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-xl font-light text-stone-950">{value}</div>
  </div>
);

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}> = ({ label, value, onChange, type = "text", required }) => (
  <div>
    <label className="block text-xs font-bold text-stone-600 mb-1">{label}</label>
    <input
      type={type}
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-none border border-stone-200 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
    />
  </div>
);
