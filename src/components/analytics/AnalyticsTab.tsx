"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Send,
  CheckCheck,
  Eye,
  MousePointerClick,
  Users,
  Tag,
  FileText,
  Clock,
  Zap,
} from "lucide-react";
import { useApp } from "../../context/AppContext";

/* ─── Helpers ─── */
const pct = (num: number, den: number) => (den === 0 ? 0 : Math.round((num / den) * 1000) / 10);
const fmt = (n: number) => n.toLocaleString("en-US");
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/* ─── Radial Gauge (SVG) ─── */
const RadialGauge: React.FC<{ value: number; label: string; color: string; icon: React.ReactNode }> = ({
  value,
  label,
  color,
  icon,
}) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamp(value, 0, 100) / 100) * circumference;

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col items-center gap-4 card-hover-premium shadow-sm bg-white select-none">
      <div className="relative w-24 h-24">
        {/* Soft center glow halo */}
        <div className="absolute inset-2 bg-slate-50/50 rounded-full blur-md opacity-20 pointer-events-none" />
        
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 drop-shadow-[0_2px_8px_rgba(16,185,129,0.06)]">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="7" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out animate-glow-pulse"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-extrabold text-slate-800 tracking-tight">{value}%</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wide">
        <span className="text-stone-400">{icon}</span>
        {label}
      </div>
    </div>
  );
};

/* ─── Mini Stat Card ─── */
const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: number;
}> = ({ title, value, subtitle, icon, iconBg, trend }) => (
  <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-sm card-hover-premium bg-white select-none">
    <div className="space-y-2">
      <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest">{title}</span>
      <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{value}</h3>
      {subtitle && (
        <span className="text-[10px] text-stone-400 font-bold flex items-center gap-1">
          {trend !== undefined &&
            (trend >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            ))}
          {subtitle}
        </span>
      )}
    </div>
    <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center shadow-sm shrink-0 border border-slate-100`}>{icon}</div>
  </div>
);

/* ─── Analytics Tab ─── */
export const AnalyticsTab: React.FC = () => {
  const { contacts, campaigns, templates, chatHistory } = useApp();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all");
  const [funnelMode, setFunnelMode] = useState<"absolute" | "percentage">("absolute");

  /* ─── Time-Filtered Campaigns ─── */
  const filteredCampaigns = useMemo(() => {
    if (timeRange === "all") return campaigns;
    const now = new Date();
    const days = timeRange === "7d" ? 7 : 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return campaigns.filter((c) => {
      const d = new Date(c.date || c.createdAt || "");
      return d >= cutoff;
    });
  }, [campaigns, timeRange]);

  /* ─── Aggregate KPIs ─── */
  const kpis = useMemo(() => {
    const totalSent = filteredCampaigns.reduce((s, c) => s + (c.sent || 0), 0);
    const totalDelivered = filteredCampaigns.reduce((s, c) => s + (c.delivered || 0), 0);
    const totalRead = filteredCampaigns.reduce((s, c) => s + (c.read || 0), 0);
    const totalClicked = filteredCampaigns.reduce((s, c) => s + (c.clicked || 0), 0);
    return {
      totalSent,
      totalDelivered,
      totalRead,
      totalClicked,
      deliveryRate: pct(totalDelivered, totalSent),
      readRate: pct(totalRead, totalDelivered),
      clickRate: pct(totalClicked, totalRead),
    };
  }, [filteredCampaigns]);

  /* ─── Funnel Data (Professional Mint & Teal Gradient) ─── */
  const funnelStages = useMemo(() => {
    const { totalSent, totalDelivered, totalRead, totalClicked } = kpis;
    return [
      { label: "Sent", value: totalSent, color: "#14b8a6", pct: 100 },
      { label: "Delivered", value: totalDelivered, color: "#0d9488", pct: pct(totalDelivered, totalSent) },
      { label: "Read", value: totalRead, color: "#0f766e", pct: pct(totalRead, totalSent) },
      { label: "Clicked", value: totalClicked, color: "#115e59", pct: pct(totalClicked, totalSent) },
    ];
  }, [kpis]);

  /* ─── Campaign Timeline ─── */
  const timelineData = useMemo(() => {
    const dateMap: Record<string, { sent: number; status: string }> = {};
    filteredCampaigns.forEach((c) => {
      const dateStr = (c.date || c.createdAt || "Unknown").split("T")[0];
      if (!dateMap[dateStr]) dateMap[dateStr] = { sent: 0, status: c.status };
      dateMap[dateStr].sent += c.sent || 0;
      // Keep highest-priority status
      if (c.status === "Failed") dateMap[dateStr].status = "Failed";
      else if (c.status === "Active" && dateMap[dateStr].status !== "Failed") dateMap[dateStr].status = "Active";
    });
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14) // last 14 entries
      .map(([date, data]) => ({ date, ...data }));
  }, [filteredCampaigns]);

  const maxTimelineSent = Math.max(...timelineData.map((d) => d.sent), 1);

  /* ─── Contact Source Distribution ─── */
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    contacts.forEach((c) => {
      const src = c.source || "Unknown";
      map[src] = (map[src] || 0) + 1;
    });
    const total = contacts.length || 1;
    // Harmonious shades of teal and emerald for pie charts
    const colors = ["#128c7e", "#25d366", "#075e54", "#14b8a6", "#0f766e", "#34d399", "#2dd4bf", "#047857"];
    let entries = Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([source, count], i) => ({
        source,
        count,
        pct: pct(count, total),
        color: colors[i % colors.length],
      }));
    return entries;
  }, [contacts]);

  const conicGradient = useMemo(() => {
    if (sourceData.length === 0) return "conic-gradient(#e7e5e4 0% 100%)";
    let acc = 0;
    const stops = sourceData.map((s) => {
      const start = acc;
      acc += s.pct;
      return `${s.color} ${start}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [sourceData]);

  /* ─── Tag Cloud ─── */
  const tagCloud = useMemo(() => {
    const map: Record<string, number> = {};
    contacts.forEach((c) => {
      (c.tags || []).forEach((t) => {
        map[t] = (map[t] || 0) + 1;
      });
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));
  }, [contacts]);

  const maxTagCount = Math.max(...tagCloud.map((t) => t.count), 1);

  /* ─── Template Performance ─── */
  const templatePerf = useMemo(() => {
    return templates.map((tmpl) => {
      const linked = filteredCampaigns.filter((c) => c.templateName === tmpl.name);
      const sent = linked.reduce((s, c) => s + (c.sent || 0), 0);
      const delivered = linked.reduce((s, c) => s + (c.delivered || 0), 0);
      const read = linked.reduce((s, c) => s + (c.read || 0), 0);
      const clicked = linked.reduce((s, c) => s + (c.clicked || 0), 0);
      return {
        ...tmpl,
        usedInCampaigns: linked.length,
        sent,
        delivered,
        read,
        clicked,
        deliveryRate: pct(delivered, sent),
        readRate: pct(read, delivered),
        clickRate: pct(clicked, read),
      };
    });
  }, [templates, filteredCampaigns]);

  /* ─── Message Activity Heatmap ─── */
  const heatmapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    Object.values(chatHistory).forEach((messages) => {
      messages.forEach((msg) => {
        try {
          const d = new Date(msg.timestamp);
          if (!isNaN(d.getTime())) {
            grid[d.getDay()][d.getHours()]++;
          }
        } catch { /* skip invalid timestamps */ }
      });
    });
    return grid;
  }, [chatHistory]);

  const maxHeat = Math.max(...heatmapData.flat(), 1);
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hourLabels = Array.from({ length: 24 }, (_, i) => (i === 0 ? "12a" : i < 12 ? `${i}a` : i === 12 ? "12p" : `${i - 12}p`));

  /* ─── Status color helpers ─── */
  const statusColor = (s: string) => {
    switch (s) {
      case "Completed": return "bg-emerald-500";
      case "Active": case "Sending": return "bg-teal-500";
      case "Scheduled": return "bg-blue-500";
      case "Failed": return "bg-red-500";
      default: return "bg-stone-400";
    }
  };

  const metaStatusBadge = (status?: string) => {
    switch (status) {
      case "approved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "rejected": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-amber-100 text-amber-700 border-amber-200";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-emerald-650" />
            Analytics
          </h2>
          <p className="text-stone-500 text-sm mt-1">
            Campaign performance, contact insights, and engagement analytics.
          </p>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center gap-1.5 bg-stone-100 rounded-xl p-1 self-start">
          {(["7d", "30d", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all ${
                timeRange === range
                  ? "bg-white text-emerald-650 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Section 1: Top-Level KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Messages Sent"
          value={fmt(kpis.totalSent)}
          subtitle={`${filteredCampaigns.length} campaigns`}
          icon={<Send className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          title="Messages Delivered"
          value={fmt(kpis.totalDelivered)}
          subtitle={`${kpis.deliveryRate}% delivery rate`}
          icon={<CheckCheck className="w-5 h-5 text-blue-500" />}
          iconBg="bg-blue-500/10"
          trend={kpis.deliveryRate > 90 ? 1 : -1}
        />
        <StatCard
          title="Messages Read"
          value={fmt(kpis.totalRead)}
          subtitle={`${kpis.readRate}% read rate`}
          icon={<Eye className="w-5 h-5 text-purple-500" />}
          iconBg="bg-purple-500/10"
          trend={kpis.readRate > 50 ? 1 : -1}
        />
        <StatCard
          title="Link Clicks"
          value={fmt(kpis.totalClicked)}
          subtitle={`${kpis.clickRate}% click-through`}
          icon={<MousePointerClick className="w-5 h-5 text-teal-650" />}
          iconBg="bg-teal-500/10"
          trend={kpis.clickRate > 5 ? 1 : -1}
        />
      </div>

      {/* ─── Section 2: Radial Gauges ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <RadialGauge
          value={kpis.deliveryRate}
          label="Delivery Rate"
          color="#3b82f6"
          icon={<CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
        />
        <RadialGauge
          value={kpis.readRate}
          label="Read Rate"
          color="#8b5cf6"
          icon={<Eye className="w-3.5 h-3.5 text-purple-500" />}
        />
        <RadialGauge
          value={kpis.clickRate}
          label="Click-Through Rate"
          color="#10b981"
          icon={<MousePointerClick className="w-3.5 h-3.5 text-emerald-550" />}
        />
      </div>

      {/* ─── Section 3: Campaign Funnel ─── */}
      <div className="glass-panel rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-500" />
              Campaign Delivery Funnel
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">Message journey from send to click</p>
          </div>
          <button
            onClick={() => setFunnelMode(funnelMode === "absolute" ? "percentage" : "absolute")}
            className="text-[10px] font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            {funnelMode === "absolute" ? "Show %" : "Show #"}
          </button>
        </div>
        <div className="space-y-3">
          {funnelStages.map((stage, i) => (
            <div key={stage.label} className="flex items-center gap-4">
              <span className="text-xs font-semibold text-stone-600 w-20 text-right">{stage.label}</span>
              <div className="flex-1 h-9 bg-stone-100 rounded-lg overflow-hidden relative">
                <div
                  className="h-full rounded-lg transition-all duration-1000 ease-out flex items-center justify-end pr-3"
                  style={{
                    width: `${Math.max(stage.pct, 2)}%`,
                    backgroundColor: stage.color,
                  }}
                >
                  <span className="text-[11px] font-bold text-white drop-shadow-sm">
                    {funnelMode === "absolute" ? fmt(stage.value) : `${stage.pct}%`}
                  </span>
                </div>
              </div>
              {i < funnelStages.length - 1 && (
                <span className="text-[10px] text-stone-400 font-mono w-12 text-center">
                  {pct(funnelStages[i + 1].value, stage.value || 1)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Section 4: Campaign Timeline ─── */}
      <div className="glass-panel rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-emerald-650" />
          Campaign Activity Timeline
        </h3>
        <p className="text-xs text-stone-500 mb-5">Messages sent per campaign day</p>
        {timelineData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-stone-400 text-sm">
            No campaign data in this time range.
          </div>
        ) : (
          <div className="flex items-end gap-1.5 h-48 overflow-x-auto custom-scrollbar pb-1">
            {timelineData.map((d) => {
              const heightPct = (d.sent / maxTimelineSent) * 100;
              return (
                <div key={d.date} className="flex flex-col items-center gap-1.5 min-w-[36px] group flex-1">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-stone-700 bg-white shadow-lg border border-stone-200 rounded-lg px-2 py-1 whitespace-nowrap pointer-events-none">
                    {fmt(d.sent)} sent
                  </div>
                  {/* Bar */}
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${statusColor(d.status)} group-hover:opacity-80`}
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                  {/* Label */}
                  <span className="text-[9px] text-stone-400 font-mono whitespace-nowrap">
                    {d.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-[10px] text-stone-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500" /> Active</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Scheduled</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Failed</span>
        </div>
      </div>

      {/* ─── Section 5 + 6: Contact Source & Tag Cloud ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Contact Source Donut */}
        <div className="glass-panel rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-emerald-650" />
            Contact Source Distribution
          </h3>
          <p className="text-xs text-stone-500 mb-5">Where your contacts come from</p>
          <div className="flex items-center gap-8">
            {/* Donut */}
            <div className="relative w-36 h-36 shrink-0">
              <div
                className="w-full h-full rounded-full"
                style={{ background: conicGradient }}
              />
              <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="text-lg font-bold">{contacts.length}</span>
                <span className="text-[9px] text-stone-500">Total</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex-1 space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
              {sourceData.map((s) => (
                <div key={s.source} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-stone-700 font-medium truncate max-w-[120px]">{s.source}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-800">{s.count}</span>
                    <span className="text-[10px] text-stone-400">{s.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tag Cloud */}
        <div className="glass-panel rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
            <Tag className="w-4 h-4 text-teal-600" />
            Contact Tag Distribution
          </h3>
          <p className="text-xs text-stone-500 mb-5">Most used audience segments</p>
          {tagCloud.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-stone-400 text-sm">
              No tags assigned yet.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tagCloud.map((t) => {
                const intensity = t.count / maxTagCount;
                const size = 11 + intensity * 5; // 11px to 16px
                const opacity = 0.5 + intensity * 0.5;
                return (
                  <span
                    key={t.tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-50/50 to-teal-50/30 border border-emerald-250/20 text-emerald-700 font-semibold transition-all hover:scale-105 hover:shadow-sm cursor-default"
                    style={{ fontSize: `${size}px`, opacity }}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {t.tag}
                    <span className="text-[9px] text-emerald-450 font-mono ml-0.5 font-bold">×{t.count}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Section 7: Template Performance Matrix ─── */}
      <div className="glass-panel rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-emerald-650" />
          Template Performance Matrix
        </h3>
        <p className="text-xs text-stone-500 mb-5">How each template performs across campaigns</p>
        {templatePerf.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-stone-400 text-sm">
            No templates available.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-[10px] font-bold text-stone-500 uppercase tracking-wider pb-3 pr-4">Template</th>
                  <th className="text-[10px] font-bold text-stone-500 uppercase tracking-wider pb-3 pr-4 text-center">Status</th>
                  <th className="text-[10px] font-bold text-stone-500 uppercase tracking-wider pb-3 pr-4 text-center">Campaigns</th>
                  <th className="text-[10px] font-bold text-stone-500 uppercase tracking-wider pb-3 pr-4 text-center">Sent</th>
                  <th className="text-[10px] font-bold text-stone-500 uppercase tracking-wider pb-3 pr-4 text-center">Delivery %</th>
                  <th className="text-[10px] font-bold text-stone-500 uppercase tracking-wider pb-3 pr-4 text-center">Read %</th>
                  <th className="text-[10px] font-bold text-stone-500 uppercase tracking-wider pb-3 text-center">Click %</th>
                </tr>
              </thead>
              <tbody>
                {templatePerf.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-stone-800">{t.name}</span>
                        <span className="text-[10px] text-stone-400 capitalize">{t.category}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${metaStatusBadge(t.metaStatus)}`}>
                        {t.metaStatus || "pending"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-center text-sm font-semibold">{t.usedInCampaigns}</td>
                    <td className="py-3 pr-4 text-center text-sm font-semibold">{fmt(t.sent)}</td>
                    <td className="py-3 pr-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-14 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${t.deliveryRate}%` }} />
                        </div>
                        <span className="text-[11px] font-mono text-stone-600">{t.deliveryRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-14 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${t.readRate}%` }} />
                        </div>
                        <span className="text-[11px] font-mono text-stone-600">{t.readRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-14 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${t.clickRate}%` }} />
                        </div>
                        <span className="text-[11px] font-mono text-stone-600">{t.clickRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Section 8: Message Activity Heatmap ─── */}
      <div className="glass-panel rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-emerald-650" />
          Message Activity Heatmap
        </h3>
        <p className="text-xs text-stone-500 mb-5">Hourly chat message volume by day of week</p>
        <div className="overflow-x-auto custom-scrollbar">
          {/* Hour labels row */}
          <div className="flex items-center mb-1">
            <div className="w-10 shrink-0" />
            {hourLabels.map((h, i) => (
              i % 2 === 0 ? (
                <span key={i} className="text-[8px] text-stone-400 font-mono" style={{ width: "calc(100% / 24)", minWidth: "20px", textAlign: "center" }}>
                  {h}
                </span>
              ) : (
                <span key={i} style={{ width: "calc(100% / 24)", minWidth: "20px" }} />
              )
            ))}
          </div>
          {/* Heatmap rows */}
          {heatmapData.map((row, dayIdx) => (
            <div key={dayIdx} className="flex items-center gap-0">
              <span className="text-[10px] text-stone-500 font-semibold w-10 shrink-0 text-right pr-2">
                {dayLabels[dayIdx]}
              </span>
              <div className="flex-1 flex gap-[2px]">
                {row.map((val, hourIdx) => {
                  const intensity = val / maxHeat;
                  return (
                    <div
                      key={hourIdx}
                      className="aspect-square rounded-[3px] transition-all hover:scale-125 hover:z-10 group relative cursor-default"
                      style={{
                        flex: 1,
                        minWidth: "14px",
                        backgroundColor: val === 0
                          ? "#f5f5f4"
                          : `rgba(18, 140, 126, ${0.15 + intensity * 0.85})`, // Slick WhatsApp teal heatmap intensity
                      }}
                      title={`${dayLabels[dayIdx]} ${hourLabels[hourIdx]}: ${val} messages`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          {/* Heatmap legend */}
          <div className="flex items-center justify-end gap-1 mt-3">
            <span className="text-[9px] text-stone-400">Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((i) => (
              <div
                key={i}
                className="w-3.5 h-3.5 rounded-[2px]"
                style={{
                  backgroundColor: i === 0 ? "#f5f5f4" : `rgba(18, 140, 126, ${0.15 + i * 0.85})`,
                }}
              />
            ))}
            <span className="text-[9px] text-stone-400">More</span>
          </div>
        </div>
      </div>
    </div>
  );
};
