"use client";

import { useState, useEffect, useCallback } from "react";
import { ScrollText, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

interface LogRow {
  id: string;
  type: string;
  message: string;
  orgName: string;
  orgId: string;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  campaign: "bg-blue-50 border-blue-200 text-blue-700",
  chat: "bg-emerald-50 border-emerald-200 text-emerald-700",
  integration: "bg-purple-50 border-purple-200 text-purple-700",
  crm: "bg-amber-50 border-amber-200 text-amber-700",
};

const getTypeColor = (type: string) =>
  TYPE_COLORS[type.toLowerCase()] ?? "bg-stone-50 border-stone-200 text-stone-600";

type DayRange = 1 | 7 | 30;

const TYPE_OPTIONS = ["All", "campaign", "chat", "integration", "crm"];

export function LogsSection() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [orgFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [days, setDays] = useState<DayRange>(7);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchLogs = useCallback(
    async (q: string, org: string, type: string, d: number, p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          search: q,
          orgId: org,
          type: type === "All" ? "" : type,
          days: String(d),
          page: String(p),
        });
        const res = await fetch(`/api/admin/logs?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setPage(1);
    fetchLogs(search, orgFilter, typeFilter, days, 1);
  }, [search, orgFilter, typeFilter, days, refreshKey, fetchLogs]);

  useEffect(() => {
    fetchLogs(search, orgFilter, typeFilter, days, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const startEntry = (page - 1) * PAGE_SIZE + 1;
  const endEntry = Math.min(page * PAGE_SIZE, total);

  const DAY_OPTIONS: DayRange[] = [1, 7, 30];

  return (
    <div className="p-4 lg:p-8 space-y-5 lg:pt-8 pt-16">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-black text-2xl uppercase tracking-tight text-stone-950 flex-1">
            System Logs
          </h1>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-2 border border-stone-200 hover:bg-stone-100 text-stone-600 hover:text-stone-950 transition-all cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="text"
            placeholder="Search logs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-stone-200 bg-white text-xs px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 w-full sm:w-48"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-stone-200 bg-white text-xs px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400 cursor-pointer"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t === "All" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 transition-all cursor-pointer ${
                  days === d
                    ? "bg-stone-950 text-white"
                    : "border border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Log stream */}
      <div className="border border-stone-200 bg-white overflow-hidden">
        {loading ? (
          <ul className="space-y-0.5 p-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-16 h-4 bg-stone-100 animate-pulse" />
                <div className="flex-1 h-3 bg-stone-100 animate-pulse" />
                <div className="w-20 h-3 bg-stone-100 animate-pulse" />
              </li>
            ))}
          </ul>
        ) : logs.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <ScrollText className="w-10 h-10 text-stone-300" />
            <p className="font-black text-stone-700 text-sm uppercase tracking-tight">
              No logs found
            </p>
            <p className="text-xs text-stone-400">Try adjusting your filters.</p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-start gap-3 px-4 py-2.5 hover:bg-stone-50 border-b border-stone-50 transition-colors"
              >
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 border shrink-0 mt-0.5 ${getTypeColor(
                    log.type
                  )}`}
                >
                  {log.type.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-stone-700 text-xs">{log.orgName}</span>
                  <span className="text-stone-400 text-xs"> · </span>
                  <span className="text-stone-500 text-xs">{log.message}</span>
                </div>
                <span className="text-[10px] text-stone-400 font-mono tabular-nums shrink-0 mt-0.5">
                  {formatTime(log.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 bg-stone-50">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              {total > 0 ? `${startEntry}–${endEntry} of ${total}` : "0 results"}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
