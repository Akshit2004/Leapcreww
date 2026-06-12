"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Truck, RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle, MapPin, Calendar, Terminal } from "lucide-react";
import { useApp } from "@/shared/context/AppContext";

interface NdrEvent {
  id: string; awb: string; orderId?: string; courier?: string; attempt: number;
  reason?: string;
  status: "pending" | "confirmed" | "rescheduled" | "address_updated" | "cancelled" | "resolved";
  customerPhone: string; customerName?: string; rescheduledDate?: string;
  updatedAddress?: string; contactId?: string; createdAt: string; updatedAt: string;
}
type FilterTab = "all" | "pending" | "rescued" | "cancelled";

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
const rescued = (s: NdrEvent["status"]) =>
  s === "confirmed" || s === "rescheduled" || s === "address_updated";

/* ─── Status Badge ─── */
function StatusBadge({ event }: { event: NdrEvent }) {
  const map: Record<NdrEvent["status"], { dot: string; label: string; cls: string }> = {
    pending:         { dot: "bg-[#D05E3C]",  label: "Awaiting reply",  cls: "border-[#D05E3C]/30 text-[#D05E3C] bg-[#D05E3C]/5" },
    confirmed:       { dot: "bg-[#2E4A3F]",  label: "Confirmed",       cls: "border-[#2E4A3F]/30 text-[#2E4A3F] bg-[#2E4A3F]/5" },
    rescheduled:     { dot: "bg-blue-600",   label: event.rescheduledDate ? `Rescheduled · ${event.rescheduledDate}` : "Rescheduled", cls: "border-blue-200 text-blue-700 bg-blue-50" },
    address_updated: { dot: "bg-purple-600", label: "Address updated",  cls: "border-purple-200 text-purple-700 bg-purple-50" },
    cancelled:       { dot: "bg-red-600",    label: "RTO Risk",         cls: "border-red-200 text-red-700 bg-red-50" },
    resolved:        { dot: "bg-[#1D211F]/40", label: "Resolved",       cls: "border-[#1D211F]/10 text-[#1D211F]/50 bg-[#1D211F]/5" },
  };
  const { dot, label, cls } = map[event.status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border font-mono text-[9px] tracking-widest uppercase ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
}

/* ─── Stat Card ─── */
function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: "orange" | "green" }) {
  const vc = accent === "orange" ? "text-[#D05E3C]" : accent === "green" ? "text-[#2E4A3F]" : "text-[#1D211F]";
  return (
    <div className="bg-white border border-[#1D211F]/10 p-5 flex items-center justify-between hover:border-[#1D211F]/30 transition-colors duration-200">
      <div className="space-y-1.5">
        <span className="font-mono text-[10px] tracking-widest uppercase text-[#1D211F]/50 block">{label}</span>
        <span className={`text-2xl font-bold tracking-tight ${vc}`}>{value}</span>
      </div>
      <div className="w-10 h-10 border border-[#1D211F]/10 flex items-center justify-center text-[#1D211F]/40 shrink-0">{icon}</div>
    </div>
  );
}

/* ─── Desktop event row ─── */
function EventRow({ e }: { e: NdrEvent }) {
  return (
    <tr className="border-b border-[#1D211F]/8 hover:bg-[#1D211F]/[0.02] transition-colors">
      <td className="py-3.5 px-4 align-top">
        <div className="font-mono text-[11px] text-[#1D211F]/60 tracking-wider">{e.awb}</div>
        {e.orderId && <div className="font-mono text-[9px] text-[#1D211F]/35 mt-0.5">#{e.orderId}</div>}
      </td>
      <td className="py-3.5 px-4 align-top">
        <div className="text-xs font-semibold text-[#1D211F]">{e.customerName || "—"}</div>
        <div className="font-mono text-[10px] text-[#1D211F]/50 mt-0.5">{e.customerPhone}</div>
      </td>
      <td className="py-3.5 px-4 align-top">
        <div className="text-xs font-semibold text-[#1D211F]">{e.courier || "—"}</div>
        <div className="font-mono text-[10px] text-[#1D211F]/50 mt-0.5">Attempt {e.attempt}</div>
      </td>
      <td className="py-3.5 px-4 align-top max-w-[180px]">
        <span className="text-xs text-[#1D211F]/60 leading-snug">{e.reason || "—"}</span>
        {e.updatedAddress && (
          <div className="flex items-start gap-1 mt-1">
            <MapPin className="w-3 h-3 text-purple-500 shrink-0 mt-0.5" />
            <span className="text-[10px] text-purple-600 leading-snug">{e.updatedAddress}</span>
          </div>
        )}
      </td>
      <td className="py-3.5 px-4 align-top"><StatusBadge event={e} /></td>
      <td className="py-3.5 px-4 align-top text-right">
        <span className="font-mono text-[10px] text-[#1D211F]/35 whitespace-nowrap">{timeAgo(e.createdAt)}</span>
      </td>
    </tr>
  );
}

/* ─── Mobile event card ─── */
function EventCard({ e }: { e: NdrEvent }) {
  return (
    <div className="bg-white border border-[#1D211F]/10 p-4 space-y-3 hover:border-[#1D211F]/30 transition-colors duration-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[11px] text-[#1D211F]/60 tracking-wider block">{e.awb}</span>
          {e.orderId && <span className="font-mono text-[9px] text-[#1D211F]/35">#{e.orderId}</span>}
        </div>
        <StatusBadge event={e} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#1D211F]/40 block mb-0.5">Customer</span>
          <span className="font-semibold text-[#1D211F]">{e.customerName || "—"}</span>
          <span className="text-[#1D211F]/50 block font-mono text-[10px]">{e.customerPhone}</span>
        </div>
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#1D211F]/40 block mb-0.5">Courier</span>
          <span className="font-semibold text-[#1D211F]">{e.courier || "—"}</span>
          <span className="text-[#1D211F]/50 block font-mono text-[10px]">Attempt {e.attempt}</span>
        </div>
      </div>
      {e.reason && <p className="text-xs text-[#1D211F]/60 leading-snug border-t border-[#1D211F]/8 pt-2">{e.reason}</p>}
      <div className="flex items-center justify-between pt-0.5">
        {e.updatedAddress
          ? <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-purple-500 shrink-0" /><span className="text-[10px] text-purple-600 truncate max-w-[200px]">{e.updatedAddress}</span></div>
          : <span />}
        <span className="font-mono text-[10px] text-[#1D211F]/35 shrink-0">{timeAgo(e.createdAt)}</span>
      </div>
    </div>
  );
}

/* ─── Setup Banner ─── */
function SetupBanner() {
  return (
    <div className="bg-white border border-[#1D211F]/10 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="w-8 h-8 border border-[#1D211F]/15 flex items-center justify-center text-[#1D211F]/40 shrink-0">
        <Terminal className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[10px] tracking-widest uppercase text-[#1D211F]/40 mb-1">Courier webhook setup</p>
        <p className="text-xs text-[#1D211F]/70 leading-relaxed">
          Send NDR events to{" "}
          <code className="font-mono bg-[#1D211F]/5 border border-[#1D211F]/10 px-1.5 py-0.5 text-[10px]">POST /api/webhooks/ndr</code>
          {" "}with your API key as{" "}
          <code className="font-mono bg-[#1D211F]/5 border border-[#1D211F]/10 px-1.5 py-0.5 text-[10px]">Authorization: Bearer wf_live_xxx</code>
        </p>
      </div>
    </div>
  );
}

/* ─── NdrTab ─── */
export function NdrTab() {
  const { organization } = useApp();
  const params = useParams();
  const orgId = (params.orgId as string) || organization?.id || "";

  const [events, setEvents] = useState<NdrEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  const fetchEvents = useCallback(async () => {
    if (!orgId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/org/${orgId}/ndr`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load NDR events");
    } finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const stats = {
    total: events.length,
    pending: events.filter((e) => e.status === "pending").length,
    rescued: events.filter((e) => rescued(e.status)).length,
    rtoRisk: events.filter((e) => e.status === "cancelled").length,
  };

  const visible = events.filter((e) => {
    if (filter === "pending") return e.status === "pending";
    if (filter === "rescued") return rescued(e.status);
    if (filter === "cancelled") return e.status === "cancelled";
    return true;
  });

  const filterTabs: { id: FilterTab; label: string; count: number }[] = [
    { id: "all",       label: "All",       count: stats.total   },
    { id: "pending",   label: "Pending",   count: stats.pending },
    { id: "rescued",   label: "Rescued",   count: stats.rescued },
    { id: "cancelled", label: "Cancelled", count: stats.rtoRisk },
  ];

  const rescheduled = events.filter((e) => e.status === "rescheduled" && e.rescheduledDate);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12 bg-[#fafaf9] space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#1D211F]/10">
        <div>
          <h2 className="text-xl font-light tracking-tight text-[#1D211F] flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-[#1D211F]" />
            NDR Events
          </h2>
          <p className="font-mono text-[10px] tracking-widest uppercase text-[#1D211F]/50 mt-1">
            Non-delivery report tracking — WhatsApp-powered delivery rescue
          </p>
        </div>
        <button
          onClick={fetchEvents} disabled={loading}
          className="flex items-center gap-2 border border-[#1D211F]/15 bg-white hover:border-[#1D211F]/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#1D211F] transition-colors duration-200 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Setup Banner */}
      <SetupBanner />

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Events" value={stats.total}   icon={<Truck className="w-4 h-4" />} />
        <StatCard label="Pending"      value={stats.pending} icon={<Clock className="w-4 h-4" />}         accent="orange" />
        <StatCard label="Rescued"      value={stats.rescued} icon={<CheckCircle2 className="w-4 h-4" />}  accent="green" />
        <StatCard label="RTO Risk"     value={stats.rtoRisk} icon={<AlertTriangle className="w-4 h-4" />} accent="orange" />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {filterTabs.map(({ id, label, count }) => (
          <button
            key={id} onClick={() => setFilter(id)}
            className={`px-4 py-1.5 font-mono text-[10px] tracking-widest uppercase border transition-colors duration-150 cursor-pointer ${
              filter === id
                ? "bg-[#1D211F] text-white border-[#1D211F]"
                : "bg-white text-[#1D211F]/50 border-[#1D211F]/15 hover:border-[#1D211F]/30 hover:text-[#1D211F]"
            }`}
          >
            {label} <span className="opacity-60 ml-1">{count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && events.length === 0 ? (
        <div className="bg-white border border-[#1D211F]/10 p-12 flex items-center justify-center">
          <div className="flex items-center gap-3 text-[#1D211F]/40">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="font-mono text-[10px] tracking-widest uppercase">Loading NDR events...</span>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white border border-[#D05E3C]/20 p-8 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-[#D05E3C] shrink-0" />
          <div>
            <p className="text-xs font-bold text-[#D05E3C] uppercase tracking-wider">Failed to load</p>
            <p className="text-xs text-[#1D211F]/50 mt-0.5">{error}</p>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-[#1D211F]/10 p-12 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-12 h-12 border border-[#1D211F]/10 flex items-center justify-center text-[#1D211F]/20">
            <Truck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="font-mono text-[10px] tracking-widest uppercase text-[#1D211F]/40">
              {filter === "all" ? "No NDR events yet" : `No ${filter} events`}
            </p>
            <p className="text-xs text-[#1D211F]/40 max-w-xs">
              {filter === "all"
                ? "Connect your courier webhook to start tracking failed deliveries."
                : `No events match the "${filter}" filter.`}
            </p>
          </div>
          {filter !== "all" && (
            <button onClick={() => setFilter("all")} className="font-mono text-[10px] tracking-widest uppercase text-[#1D211F]/40 hover:text-[#1D211F] transition-colors border border-[#1D211F]/15 px-3 py-1.5 cursor-pointer">
              Clear filter
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-[#1D211F]/10 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#1D211F]/10 bg-[#fafaf9]">
                  {["AWB / Order", "Customer", "Courier", "Reason", "Status", "Time"].map((h) => (
                    <th key={h} className="px-4 py-3 font-mono text-[9px] tracking-widest uppercase text-[#1D211F]/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{visible.map((e) => <EventRow key={e.id} e={e} />)}</tbody>
            </table>
          </div>

          {/* Mobile card stack */}
          <div className="sm:hidden space-y-2">
            {visible.map((e) => <EventCard key={e.id} e={e} />)}
          </div>

          <p className="font-mono text-[9px] tracking-widest uppercase text-[#1D211F]/30 text-right">
            {visible.length} event{visible.length !== 1 ? "s" : ""}{filter !== "all" ? ` · filtered by ${filter}` : ""}
          </p>
        </>
      )}

      {/* Rescheduled call-out */}
      {rescheduled.length > 0 && (
        <div className="bg-white border border-blue-100 p-4 flex items-start gap-3">
          <Calendar className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-mono text-[10px] tracking-widest uppercase text-blue-600 mb-1">Upcoming rescheduled deliveries</p>
            <div className="space-y-1">
              {rescheduled.map((e) => (
                <p key={e.id} className="text-xs text-[#1D211F]/60">
                  <span className="font-mono text-[10px] text-[#1D211F]/40 mr-2">{e.awb}</span>
                  {e.customerName ?? e.customerPhone} —{" "}
                  <span className="text-blue-600 font-semibold">{e.rescheduledDate}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
