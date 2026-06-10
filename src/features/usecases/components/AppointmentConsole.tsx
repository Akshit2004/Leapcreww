"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "@/shared/context/AppContext";
import { notify } from "@/shared/lib/toast";
import {
  APPOINTMENT_PRESETS,
  APPOINTMENT_PRESET_IDS,
  getPreset,
  type AppointmentPresetId,
} from "@/shared/config/useCasePresets";
import { formatSlotDateTime, formatSlotDay, formatSlotTime, istDateTimeToUtc } from "@/shared/lib/datetime";
import {
  CalendarClock,
  Plus,
  Trash2,
  X,
  RefreshCw,
  CheckCircle2,
  User,
  CalendarDays,
  CalendarPlus,
  Repeat,
  Phone,
  ListChecks,
  XCircle,
  Ban,
} from "lucide-react";

interface Slot {
  id: string;
  serviceName: string;
  startTime: string;
  durationMinutes: number;
  price: number;
  isBooked: boolean;
}

type BookingStatus = "booked" | "completed" | "no_show" | "cancelled";

interface Booking {
  id: string;
  serviceName: string;
  startTime: string;
  price: number;
  bookingForName: string;
  status: BookingStatus;
  contact: { id: string; name: string; phone: string } | null;
}

interface AppointmentConsoleProps {
  orgId: string;
  preset: AppointmentPresetId;
  onPresetChange: (preset: AppointmentPresetId) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const AppointmentConsole: React.FC<AppointmentConsoleProps> = ({ orgId, preset, onPresetChange }) => {
  const terms = getPreset(preset);
  const { refreshWorkspace } = useApp();

  const [view, setView] = useState<"slots" | "bookings">("slots");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [presetSaving, setPresetSaving] = useState(false);

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

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const res = await fetch(`/api/usecase/bookings?orgId=${orgId}`);
      const data = await res.json();
      if (res.ok) setBookings(data.bookings || []);
    } catch (err) {
      console.error("Failed to fetch bookings", err);
    } finally {
      setBookingsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    if (view === "bookings") fetchBookings();
  }, [view, fetchBookings]);

  const handlePreset = async (id: AppointmentPresetId) => {
    if (id === preset || presetSaving) return;
    setPresetSaving(true);
    onPresetChange(id); // optimistic — revert on failure
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
    available: slots.filter((s) => !s.isBooked && new Date(s.startTime).getTime() >= now).length,
    booked: slots.filter((s) => s.isBooked).length,
    services: new Set(slots.map((s) => s.serviceName)).size,
  };

  return (
    <div className="space-y-6">
      {/* Terminology Preset Selector */}
      <div className="bg-white rounded-none p-5 sm:p-6 border border-stone-200">
        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-widest mb-1">Terminology Preset</h3>
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
        <StatCard icon={User} label={`${terms.slotLabel.split(" ")[0]}s`} value={stats.services} />
      </div>

      {/* View tabs */}
      <div className="flex border border-stone-200 bg-white w-full sm:w-fit">
        <TabButton active={view === "slots"} onClick={() => setView("slots")} icon={CalendarClock} label="Slots" />
        <TabButton active={view === "bookings"} onClick={() => setView("bookings")} icon={ListChecks} label="Bookings" />
      </div>

      {view === "slots" ? (
        <SlotsView
          orgId={orgId}
          terms={terms}
          slots={slots}
          loading={loading}
          onSlotsChange={setSlots}
        />
      ) : (
        <BookingsView
          orgId={orgId}
          terms={terms}
          bookings={bookings}
          loading={bookingsLoading}
          onRefresh={fetchBookings}
          onBookingsChange={setBookings}
        />
      )}
    </div>
  );
};

// ─── Slots view ────────────────────────────────────────────────────────────

const SlotsView: React.FC<{
  orgId: string;
  terms: ReturnType<typeof getPreset>;
  slots: Slot[];
  loading: boolean;
  onSlotsChange: (slots: Slot[]) => void;
}> = ({ orgId, terms, slots, loading, onSlotsChange }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/usecase/slots/${id}?orgId=${orgId}`, { method: "DELETE" });
      if (res.ok) {
        onSlotsChange(slots.filter((s) => s.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        notify.error("Couldn't delete slot", data.error || "An unexpected error occurred.");
      }
    } catch {
      notify.error("Couldn't delete slot", "Please try again in a moment.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-widest">Booking Slots</h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowGenerate((v) => !v); setShowAdd(false); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-stone-900 rounded-none border border-stone-300 text-xs font-bold hover:border-stone-900 transition-all cursor-pointer uppercase tracking-wider"
          >
            <Repeat className="w-4 h-4" /> Generate Schedule
          </button>
          <button
            onClick={() => { setShowAdd((v) => !v); setShowGenerate(false); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-950 text-white rounded-none border border-stone-950 text-xs font-bold hover:bg-stone-900 transition-all cursor-pointer uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" /> Add Slot
          </button>
        </div>
      </div>

      {showGenerate && (
        <GenerateForm
          orgId={orgId}
          terms={terms}
          onClose={() => setShowGenerate(false)}
          onGenerated={(s) => { onSlotsChange(s); setShowGenerate(false); }}
        />
      )}

      {showAdd && (
        <AddSlotForm
          orgId={orgId}
          terms={terms}
          onClose={() => setShowAdd(false)}
          onAdded={(s) => { onSlotsChange(s); setShowAdd(false); }}
        />
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

// ─── Recurring generator form ────────────────────────────────────────────────

const GenerateForm: React.FC<{
  orgId: string;
  terms: ReturnType<typeof getPreset>;
  onClose: () => void;
  onGenerated: (slots: Slot[]) => void;
}> = ({ orgId, terms, onClose, onGenerated }) => {
  const [serviceName, setServiceName] = useState("");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon–Fri default
  const [ranges, setRanges] = useState<{ start: string; end: string }[]>([{ start: "10:00", end: "13:00" }]);
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [weeksAhead, setWeeksAhead] = useState("2");
  const [saving, setSaving] = useState(false);

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const updateRange = (i: number, key: "start" | "end", val: string) =>
    setRanges((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/usecase/slots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          serviceName,
          daysOfWeek: days,
          timeRanges: ranges,
          durationMinutes: parseInt(duration) || 30,
          price: Math.round(parseFloat(price || "0") * 100),
          weeksAhead: parseInt(weeksAhead) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify.error("Couldn't generate slots", data.error || "An unexpected error occurred.");
      } else {
        onGenerated(data.slots || []);
        notify.success("Schedule generated", `${data.created} slot${data.created === 1 ? "" : "s"} created.`);
      }
    } catch {
      notify.error("Couldn't generate slots", "Please try again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-none p-6 border border-stone-200 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <CalendarPlus className="w-4 h-4 text-stone-900" />
          <h3 className="font-bold text-stone-900 uppercase text-xs">Recurring Schedule</h3>
        </div>
        <button type="button" onClick={onClose} className="p-1 hover:bg-stone-100 cursor-pointer border border-transparent">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[11px] text-stone-500 leading-relaxed -mt-2">
        Define a weekly pattern and we&apos;ll lay down every slot for the weeks ahead. Times are IST; past times and
        duplicates are skipped automatically.
      </p>

      <Field label={terms.slotLabel} value={serviceName} onChange={setServiceName} required />

      <div>
        <label className="block text-xs font-bold text-stone-600 mb-1.5">Days of week</label>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d, i) => {
            const active = days.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`px-3 py-1.5 text-[11px] font-bold uppercase border transition-all cursor-pointer ${
                  active ? "bg-stone-950 text-white border-stone-950" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-stone-600 mb-1.5">Daily time ranges</label>
        <div className="space-y-2">
          {ranges.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="time"
                value={r.start}
                onChange={(e) => updateRange(i, "start", e.target.value)}
                className="px-3 py-2 rounded-none border border-stone-200 text-sm focus:outline-none focus:border-stone-900"
              />
              <span className="text-stone-400 text-xs">to</span>
              <input
                type="time"
                value={r.end}
                onChange={(e) => updateRange(i, "end", e.target.value)}
                className="px-3 py-2 rounded-none border border-stone-200 text-sm focus:outline-none focus:border-stone-900"
              />
              {ranges.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRanges((prev) => prev.filter((_, idx) => idx !== i))}
                  className="p-1.5 text-stone-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRanges((prev) => [...prev, { start: "14:00", end: "17:00" }])}
          className="mt-2 text-[11px] font-bold text-stone-600 uppercase tracking-wider hover:text-stone-900 cursor-pointer flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add range
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Slot length (min)" type="number" value={duration} onChange={setDuration} />
        <Field label={`${terms.feeLabel} (₹) — 0 free`} type="number" value={price} onChange={setPrice} />
        <div>
          <label className="block text-xs font-bold text-stone-600 mb-1">Weeks ahead</label>
          <select
            value={weeksAhead}
            onChange={(e) => setWeeksAhead(e.target.value)}
            className="w-full px-3 py-2 rounded-none border border-stone-200 text-sm focus:outline-none focus:border-stone-900 bg-white"
          >
            {[1, 2, 3, 4, 6, 8].map((w) => (
              <option key={w} value={w}>{w} week{w === 1 ? "" : "s"}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-2.5 bg-stone-950 text-white rounded-none border border-stone-950 text-xs font-bold hover:bg-stone-900 transition-all cursor-pointer uppercase disabled:opacity-50"
      >
        {saving ? "Generating…" : "Generate Slots"}
      </button>
    </form>
  );
};

// ─── Single-slot add form ────────────────────────────────────────────────────

const AddSlotForm: React.FC<{
  orgId: string;
  terms: ReturnType<typeof getPreset>;
  onClose: () => void;
  onAdded: (slots: Slot[]) => void;
}> = ({ orgId, terms, onClose, onAdded }) => {
  const [form, setForm] = useState({ serviceName: "", date: "", time: "10:00", durationMinutes: "30", price: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
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
              startTime: istDateTimeToUtc(form.date, form.time).toISOString(),
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
        onAdded(data.slots || []);
        notify.success("Slot added", "Your new booking slot is now live.");
      }
    } catch {
      notify.error("Couldn't add slot", "Please try again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-none p-6 border border-stone-200 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <h3 className="font-bold text-stone-900 uppercase text-xs">New Slot</h3>
        <button type="button" onClick={onClose} className="p-1 hover:bg-stone-100 cursor-pointer border border-transparent">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={terms.slotLabel} value={form.serviceName} onChange={(v) => setForm({ ...form, serviceName: v })} required />
        <Field label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} required />
        <Field label="Time (IST)" type="time" value={form.time} onChange={(v) => setForm({ ...form, time: v })} required />
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
  );
};

// ─── Slot list ───────────────────────────────────────────────────────────────

const SlotList: React.FC<{
  slots: Slot[];
  terms: ReturnType<typeof getPreset>;
  onDelete: (id: string) => void;
}> = ({ slots, onDelete }) => {
  // Group by day for a scannable, calendar-like list.
  const groups = useMemo(() => {
    const map: Record<string, Slot[]> = {};
    for (const s of [...slots].sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))) {
      const day = formatSlotDay(s.startTime);
      (map[day] ||= []).push(s);
    }
    return map;
  }, [slots]);

  if (slots.length === 0) {
    return (
      <div className="bg-white border border-stone-200 p-8 text-center text-stone-500 text-xs uppercase tracking-wider">
        No slots yet. Add one or generate a schedule above.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([day, daySlots]) => (
        <div key={day} className="bg-white rounded-none border border-stone-200">
          <div className="px-4 py-2 border-b border-stone-100 text-[11px] font-bold uppercase tracking-widest text-stone-500">
            {day}
          </div>
          <div className="divide-y divide-stone-100">
            {daySlots.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-stone-900">{formatSlotTime(s.startTime)}</span>
                    <span className="text-xs text-stone-500 truncate">{s.serviceName}</span>
                    {s.isBooked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 border rounded-none uppercase text-emerald-700 bg-emerald-50 border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Booked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 border rounded-none uppercase text-stone-900 bg-stone-100 border-stone-300">
                        <CalendarClock className="w-3 h-3" /> Available
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1">
                    {s.durationMinutes} min · {s.price > 0 ? `₹${(s.price / 100).toFixed(2)} (pay at venue)` : "Free"}
                  </div>
                </div>
                {!s.isBooked && (
                  <button
                    onClick={() => onDelete(s.id)}
                    className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-none text-stone-400 border border-transparent hover:border-red-200 cursor-pointer transition-colors"
                    title="Delete slot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Bookings view ───────────────────────────────────────────────────────────

type BookingFilter = "upcoming" | "past" | "cancelled";

const BookingsView: React.FC<{
  orgId: string;
  terms: ReturnType<typeof getPreset>;
  bookings: Booking[];
  loading: boolean;
  onRefresh: () => void;
  onBookingsChange: (b: Booking[]) => void;
}> = ({ orgId, terms, bookings, loading, onRefresh, onBookingsChange }) => {
  const [filter, setFilter] = useState<BookingFilter>("upcoming");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const services = useMemo(() => [...new Set(bookings.map((b) => b.serviceName))], [bookings]);
  const now = Date.now();

  const filtered = useMemo(() => {
    return bookings
      .filter((b) => {
        const start = new Date(b.startTime).getTime();
        if (filter === "upcoming") return b.status === "booked" && start >= now;
        if (filter === "cancelled") return b.status === "cancelled";
        // past: completed, no_show, or a still-"booked" slot whose time has passed
        return b.status === "completed" || b.status === "no_show" || (b.status === "booked" && start < now);
      })
      .filter((b) => serviceFilter === "all" || b.serviceName === serviceFilter)
      .sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime));
  }, [bookings, filter, serviceFilter, now]);

  const act = async (id: string, status: BookingStatus) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/usecase/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify.error("Couldn't update booking", data.error || "An unexpected error occurred.");
      } else {
        onBookingsChange(data.bookings || []);
        notify.success(
          status === "cancelled" ? "Booking cancelled" : status === "completed" ? "Marked completed" : "Marked no-show",
          status === "cancelled" ? "The customer has been notified on WhatsApp." : undefined,
        );
      }
    } catch {
      notify.error("Couldn't update booking", "Please try again in a moment.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex border border-stone-200 bg-white">
          {(["upcoming", "past", "cancelled"] as BookingFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                filter === f ? "bg-stone-950 text-white" : "bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {services.length > 1 && (
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-3 py-2 rounded-none border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-white max-w-[180px]"
            >
              <option value="all">All {terms.slotLabel.split(" ")[0].toLowerCase()}s</option>
              {services.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <button
            onClick={onRefresh}
            className="p-2 border border-stone-200 hover:border-stone-900 cursor-pointer text-stone-600"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-5 h-5 text-stone-900 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-stone-200 p-8 text-center text-stone-500 text-xs uppercase tracking-wider">
          No {filter} {terms.bookingNoun}s.
        </div>
      ) : (
        <div className="bg-white rounded-none border border-stone-200 divide-y divide-stone-100">
          {filtered.map((b) => {
            const upcoming = b.status === "booked" && new Date(b.startTime).getTime() >= now;
            return (
              <div key={b.id} className="flex max-md:flex-col md:items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-stone-900 truncate">{b.serviceName}</span>
                    <BookingBadge status={b.status} pastDue={b.status === "booked" && new Date(b.startTime).getTime() < now} />
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    {formatSlotDateTime(b.startTime)} · {b.price > 0 ? `₹${(b.price / 100).toFixed(2)}` : "Free"}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {terms.clientLabel}: {b.bookingForName}</span>
                    {b.contact && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {b.contact.name} ({b.contact.phone})</span>
                    )}
                  </div>
                </div>
                {upcoming && (
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    <ActionButton label="Completed" icon={CheckCircle2} disabled={busyId === b.id} onClick={() => act(b.id, "completed")} />
                    <ActionButton label="No-show" icon={Ban} disabled={busyId === b.id} onClick={() => act(b.id, "no_show")} />
                    <ActionButton label="Cancel" icon={XCircle} variant="danger" disabled={busyId === b.id} onClick={() => act(b.id, "cancelled")} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const BookingBadge: React.FC<{ status: BookingStatus; pastDue: boolean }> = ({ status, pastDue }) => {
  const map: Record<string, { label: string; cls: string }> = {
    booked: pastDue
      ? { label: "Past due", cls: "text-amber-700 bg-amber-50 border-amber-200" }
      : { label: "Confirmed", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    completed: { label: "Completed", cls: "text-stone-700 bg-stone-100 border-stone-300" },
    no_show: { label: "No-show", cls: "text-amber-800 bg-amber-50 border-amber-200" },
    cancelled: { label: "Cancelled", cls: "text-red-700 bg-red-50 border-red-200" },
  };
  const c = map[status] || map.booked;
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 border rounded-none uppercase ${c.cls}`}>
      {c.label}
    </span>
  );
};

// ─── Small UI atoms ──────────────────────────────────────────────────────────

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ElementType; label: string }> = ({
  active,
  onClick,
  icon: Icon,
  label,
}) => (
  <button
    onClick={onClick}
    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
      active ? "bg-stone-950 text-white" : "bg-white text-stone-600 hover:bg-stone-50"
    }`}
  >
    <Icon className="w-4 h-4" /> {label}
  </button>
);

const ActionButton: React.FC<{
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
}> = ({ label, icon: Icon, onClick, disabled, variant = "default" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider border rounded-none cursor-pointer transition-colors disabled:opacity-50 ${
      variant === "danger"
        ? "border-stone-200 text-stone-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50"
        : "border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900"
    }`}
  >
    <Icon className="w-3.5 h-3.5" /> {label}
  </button>
);

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
