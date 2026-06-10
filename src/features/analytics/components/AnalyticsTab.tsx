"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
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
  Sparkles,
  Loader2,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { useApp } from "@/shared/context/AppContext";

/* ─── Helpers ─── */
const pct = (num: number, den: number) => (den === 0 ? 0 : Math.round((num / den) * 1000) / 10);
const fmt = (n: number) => n.toLocaleString("en-US");
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function renderTextWithBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx} className="font-bold text-stone-950">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <strong key={idx} className="font-bold text-stone-950">{part.slice(1, -1)}</strong>;
    }
    return part;
  });
}

function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let keyCounter = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${keyCounter++}`} className="list-disc pl-4 space-y-1 mb-2 text-stone-600">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flushList();
      continue;
    }

    if (line.startsWith("#### ")) {
      flushList();
      elements.push(
        <h4 key={`h4-${keyCounter++}`} className="text-stone-800 text-[10px] font-bold uppercase mt-3 mb-1">
          {line.replace("#### ", "")}
        </h4>
      );
    } else if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={`h3-${keyCounter++}`} className="text-stone-900 text-[11px] font-bold uppercase mt-4 mb-1.5 border-b border-stone-100 pb-1">
          {line.replace("### ", "")}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={`h2-${keyCounter++}`} className="text-stone-955 text-xs font-bold uppercase mt-5 mb-2 border-b border-stone-200 pb-1">
          {line.replace("## ", "")}
        </h2>
      );
    } else if (line.startsWith("* ") || line.startsWith("- ")) {
      const textContent = line.replace(/^[\*\-]\s+/, "");
      currentList.push(
        <li key={`li-${keyCounter++}`} className="text-xs text-stone-650 font-semibold pl-1 leading-relaxed">
          {renderTextWithBold(textContent)}
        </li>
      );
    } else {
      flushList();
      elements.push(
        <p key={`p-${keyCounter++}`} className="text-xs text-stone-650 font-semibold mb-2 leading-relaxed">
          {renderTextWithBold(line)}
        </p>
      );
    }
  }

  flushList();
  return elements;
}

interface BriefSections {
  revenue: string;
  engagement: string;
  recommendations: string;
}

function parseBriefIntoSections(text: string): BriefSections {
  const lines = text.split("\n");
  const sections: BriefSections = {
    revenue: "",
    engagement: "",
    recommendations: ""
  };
  
  let currentSection: keyof BriefSections | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.includes("Revenue Performance")) {
      currentSection = "revenue";
      continue;
    } else if (trimmed.includes("Engagement Health")) {
      currentSection = "engagement";
      continue;
    } else if (trimmed.includes("Underperforming Campaigns") || trimmed.includes("Recommendations")) {
      currentSection = "recommendations";
      continue;
    } else if (trimmed.startsWith("### ")) {
      continue;
    }
    
    if (currentSection) {
      sections[currentSection] += line + "\n";
    }
  }
  
  return sections;
}

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
    <div className="bg-white border border-stone-200 p-6 flex flex-col items-center gap-4 hover:border-stone-400 transition-colors duration-300 select-none">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="7" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="square"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-stone-900 tracking-tight">{value}%</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] font-bold text-stone-500 uppercase tracking-widest">
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
  trend?: number;
}> = ({ title, value, subtitle, icon, trend }) => (
  <div className="bg-white border border-stone-200 p-6 flex items-center justify-between hover:border-stone-400 transition-colors duration-300 select-none">
    <div className="space-y-2">
      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{title}</span>
      <h3 className="text-2xl font-bold text-stone-950 tracking-tight">{value}</h3>
      {subtitle && (
        <span className="text-[10px] text-stone-400 font-bold flex items-center gap-1 uppercase">
          {trend !== undefined &&
            (trend >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-stone-900" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-stone-500" />
            ))}
          {subtitle}
        </span>
      )}
    </div>
    <div className="w-12 h-12 bg-stone-50 border border-stone-200 text-stone-900 flex items-center justify-center shrink-0">
      {icon}
    </div>
  </div>
);

/* ─── Analytics Tab ─── */
export const AnalyticsTab: React.FC = () => {
  const { contacts, campaigns, templates, chatHistory } = useApp();
  const params = useParams();
  const orgId = params.orgId as string;

  const [activeSection, setActiveSection] = useState<"campaigns" | "agents" | "roi" | "commerce">("campaigns");
  const [agentMetrics, setAgentMetrics] = useState<Array<{ agent: string; avgLatencyMinutes: number; replies: number; conversations: number; resolutionRate: number; attributedSales: number; attributedRevenuePaise: number }>>([]);
  const [roiLedger, setRoiLedger] = useState<Array<{ id: string; name: string; templateName: string; sent: number; delivered: number; costPaise: number; attributedRevenuePaise: number; conversions: number; roi: number; status: string; date: string }>>([]);
  const [roiSummary, setRoiSummary] = useState<{ totalCostPaise: number; totalRevenuePaise: number; totalConversions: number; overallRoi: number }>({ totalCostPaise: 0, totalRevenuePaise: 0, totalConversions: 0, overallRoi: 0 });
  const [roiView, setRoiView] = useState<"campaigns" | "sequences">("campaigns");
  const [seqLedger, setSeqLedger] = useState<Array<{ id: string; name: string; trigger: string; sends: number; costPaise: number; attributedRevenuePaise: number; conversions: number; roi: number; status: string }>>([]);
  const [seqSummary, setSeqSummary] = useState<{ totalCostPaise: number; totalRevenuePaise: number; totalConversions: number; overallRoi: number }>({ totalCostPaise: 0, totalRevenuePaise: 0, totalConversions: 0, overallRoi: 0 });
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [narration, setNarration] = useState("");
  const [loadingNarration, setLoadingNarration] = useState(false);

  const fetchNarration = useCallback(async () => {
    if (!orgId) return;
    setLoadingNarration(true);
    try {
      const res = await fetch(`/api/ai/analytics-narrator?orgId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setNarration(data.narration || "");
      }
    } catch (err) {
      console.error("Narrator error:", err);
    } finally {
      setLoadingNarration(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchNarration();
  }, [fetchNarration]);

  useEffect(() => {
    if (!orgId) return;
    const fetchPerformanceStats = async () => {
      setLoadingMetrics(true);
      try {
        const [resAgents, resRoi, resSeq] = await Promise.all([
          fetch(`/api/org/${orgId}/analytics/agent-metrics`),
          fetch(`/api/org/${orgId}/analytics/roi-ledger`),
          fetch(`/api/org/${orgId}/analytics/sequence-roi`),
        ]);
        if (resAgents.ok) {
          const data = await resAgents.json();
          if (data.metrics) setAgentMetrics(data.metrics);
        }
        if (resRoi.ok) {
          const data = await resRoi.json();
          if (data.ledger) setRoiLedger(data.ledger);
          if (data.summary) setRoiSummary(data.summary);
        }
        if (resSeq.ok) {
          const data = await resSeq.json();
          if (data.ledger) setSeqLedger(data.ledger);
          if (data.summary) setSeqSummary(data.summary);
        }
      } catch (err) {
        console.error("Failed to load operational analytics", err);
      } finally {
        setLoadingMetrics(false);
      }
    };
    fetchPerformanceStats();
  }, [orgId]);

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

  /* ─── Funnel Data (Elegant Monochromatic Gray Scales) ─── */
  const funnelStages = useMemo(() => {
    const { totalSent, totalDelivered, totalRead, totalClicked } = kpis;
    return [
      { label: "Sent", value: totalSent, color: "#1c1917", pct: 100 },
      { label: "Delivered", value: totalDelivered, color: "#44403c", pct: pct(totalDelivered, totalSent) },
      { label: "Read", value: totalRead, color: "#78716c", pct: pct(totalRead, totalSent) },
      { label: "Clicked", value: totalClicked, color: "#a8a29e", pct: pct(totalClicked, totalSent) },
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

  /* ─── Contact Source Distribution (Refined Stone Colors) ─── */
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    contacts.forEach((c) => {
      const src = c.source || "Unknown";
      map[src] = (map[src] || 0) + 1;
    });
    const total = contacts.length || 1;
    const colors = ["#1c1917", "#44403c", "#78716c", "#a8a29e", "#d6d3d1", "#e7e5e4"];
    const entries = Object.entries(map)
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

  /* ─── Message Activity Heatmap (Sleek Charcoal Heatmap) ─── */
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
      case "Completed": return "bg-stone-950";
      case "Active": case "Sending": return "bg-stone-600";
      case "Scheduled": return "bg-stone-300";
      case "Failed": return "bg-stone-200";
      default: return "bg-stone-100";
    }
  };

  const metaStatusBadge = (status?: string) => {
    switch (status) {
      case "approved": return "bg-stone-100 text-stone-900 border-stone-300";
      case "rejected": return "bg-stone-200 text-stone-500 border-stone-200";
      default: return "bg-stone-50 text-stone-400 border-stone-200";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 pb-12 sm:p-8 custom-scrollbar space-y-8 bg-[#fafaf9]">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 pb-6 border-b border-stone-200 select-none">
        <div>
          <h2 className="text-2xl font-light tracking-tight text-stone-950 flex items-center gap-2">
            <BarChart3 className="w-5.5 h-5.5 text-stone-950" />
            Analytics Overview
          </h2>
          <p className="text-stone-500 text-xs tracking-wider uppercase mt-1">
            CAMPAIGN PERFORMANCE & CONTACT LEDGER INDEX
          </p>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-none border border-stone-200">
          {(["7d", "30d", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-none transition-all cursor-pointer ${
                timeRange === range
                  ? "bg-stone-950 text-white"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* AI Analytics Narrator Briefing */}
      <div className="space-y-4 select-none">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-stone-950" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-900">
              AI Analytics Narrator & Diagnostic Brief
            </h3>
          </div>
          <button
            onClick={fetchNarration}
            disabled={loadingNarration}
            className="p-1.5 rounded-none text-stone-400 hover:text-stone-950 transition-colors border border-transparent cursor-pointer disabled:opacity-50"
            title="Recalculate Brief"
          >
            <RefreshCw className={`w-4 h-4 ${loadingNarration ? 'animate-spin text-stone-600' : ''}`} />
          </button>
        </div>

        {loadingNarration ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-stone-200 p-6 h-40 animate-pulse space-y-3">
              <div className="h-3 bg-stone-200 w-1/2" />
              <div className="h-2.5 bg-stone-100 w-full" />
              <div className="h-2.5 bg-stone-100 w-5/6" />
            </div>
            <div className="bg-white border border-stone-200 p-6 h-40 animate-pulse space-y-3">
              <div className="h-3 bg-stone-200 w-1/2" />
              <div className="h-2.5 bg-stone-100 w-full" />
              <div className="h-2.5 bg-stone-100 w-5/6" />
            </div>
            <div className="bg-white border border-stone-200 p-6 h-40 animate-pulse space-y-3">
              <div className="h-3 bg-stone-200 w-1/2" />
              <div className="h-2.5 bg-stone-100 w-full" />
              <div className="h-2.5 bg-stone-100 w-5/6" />
            </div>
          </div>
        ) : narration ? (
          (() => {
            const sections = parseBriefIntoSections(narration);
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Revenue Performance */}
                <div className="bg-white border border-stone-200 p-6 hover:border-stone-400 transition-colors duration-300 shadow-sm rounded-none">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-stone-900 border-b border-stone-100 pb-2">
                      <TrendingUp className="w-4 h-4 text-stone-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Revenue Performance</span>
                    </div>
                    <div className="text-xs text-stone-600 leading-relaxed font-semibold pl-1 select-text">
                      {parseMarkdown(sections.revenue || "No revenue performance telemetry recorded.")}
                    </div>
                  </div>
                </div>

                {/* Card 2: Engagement Health */}
                <div className="bg-white border border-stone-200 p-6 hover:border-stone-400 transition-colors duration-300 shadow-sm rounded-none">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-stone-900 border-b border-stone-100 pb-2">
                      <Eye className="w-4 h-4 text-stone-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Engagement Health</span>
                    </div>
                    <div className="text-xs text-stone-600 leading-relaxed font-semibold pl-1 select-text">
                      {parseMarkdown(sections.engagement || "No engagement metrics recorded.")}
                    </div>
                  </div>
                </div>

                {/* Card 3: Actionable Diagnostics */}
                <div className="bg-white border border-stone-200 p-6 hover:border-stone-400 transition-colors duration-300 shadow-sm rounded-none">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-stone-900 border-b border-stone-100 pb-2">
                      <Sparkles className="w-4 h-4 text-stone-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Actionable Diagnostics</span>
                    </div>
                    <div className="text-xs text-stone-600 leading-relaxed font-semibold pl-1 select-text">
                      {parseMarkdown(sections.recommendations || "No optimization recommendations recorded.")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <p className="text-xs text-stone-500 italic relative z-10">No telemetry briefing generated yet. Click refresh to narrate.</p>
        )}
      </div>

      {/* ─── Sub-Navigation Tabs ─── */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-1.5 select-none shrink-0">
        {(["campaigns", "agents", "roi", "commerce"] as const).map((sec) => (
          <button
            key={sec}
            onClick={() => setActiveSection(sec)}
            className={`text-xs font-bold uppercase tracking-wider px-4 py-2 border-b-2 transition-all cursor-pointer ${
              activeSection === sec
                ? "border-stone-950 text-stone-950 font-extrabold"
                : "border-transparent text-stone-400 hover:text-stone-600"
            }`}
          >
            {sec === "campaigns"
              ? "Campaign Performance"
              : sec === "agents"
              ? "Agent Latency Matrix"
              : sec === "roi"
              ? "Attribution & ROI Ledger"
              : "E-Commerce & Abandoned Carts"}
          </button>
        ))}
      </div>

      {/* ─── SECTION: CAMPAIGN OVERVIEW ─── */}
      {activeSection === "campaigns" && (
        <>
          {/* ─── Section 1: Top-Level KPI Cards ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Messages Sent"
              value={fmt(kpis.totalSent)}
              subtitle={`${filteredCampaigns.length} campaigns dispatch`}
              icon={<Send className="w-5 h-5 text-stone-950" />}
            />
            <StatCard
              title="Messages Delivered"
              value={fmt(kpis.totalDelivered)}
              subtitle={`${kpis.deliveryRate}% delivery rate`}
              icon={<CheckCheck className="w-5 h-5 text-stone-950" />}
              trend={kpis.deliveryRate > 90 ? 1 : -1}
            />
            <StatCard
              title="Messages Read"
              value={fmt(kpis.totalRead)}
              subtitle={`${kpis.readRate}% read rate`}
              icon={<Eye className="w-5 h-5 text-stone-950" />}
              trend={kpis.readRate > 50 ? 1 : -1}
            />
            <StatCard
              title="Link Clicks"
              value={fmt(kpis.totalClicked)}
              subtitle={`${kpis.clickRate}% click-through`}
              icon={<MousePointerClick className="w-5 h-5 text-stone-950" />}
              trend={kpis.clickRate > 5 ? 1 : -1}
            />
          </div>

          {/* ─── Section 2: Radial Gauges ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <RadialGauge
              value={kpis.deliveryRate}
              label="Delivery Rate"
              color="#1c1917"
              icon={<CheckCheck className="w-3.5 h-3.5 text-stone-950" />}
            />
            <RadialGauge
              value={kpis.readRate}
              label="Read Rate"
              color="#44403c"
              icon={<Eye className="w-3.5 h-3.5 text-stone-900" />}
            />
            <RadialGauge
              value={kpis.clickRate}
              label="Click-Through Rate"
              color="#78716c"
              icon={<MousePointerClick className="w-3.5 h-3.5 text-stone-500" />}
            />
          </div>

          {/* ─── Section 3: Campaign Funnel ─── */}
          <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
              <div>
                <h3 className="text-lg font-light text-stone-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-stone-950" />
                  Campaign Delivery Funnel
                </h3>
                <p className="text-xs text-stone-500 tracking-wider uppercase mt-1">Message journey index from send to click</p>
              </div>
              <button
                onClick={() => setFunnelMode(funnelMode === "absolute" ? "percentage" : "absolute")}
                className="text-[9px] font-bold text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-none border border-stone-200/20 uppercase tracking-widest transition-all cursor-pointer"
              >
                {funnelMode === "absolute" ? "Show %" : "Show #"}
              </button>
            </div>
            <div className="space-y-4">
              {funnelStages.map((stage, i) => (
                <div key={stage.label} className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-stone-400 w-20 text-right uppercase tracking-wider">{stage.label}</span>
                  <div className="flex-1 h-9 bg-stone-100 rounded-none overflow-hidden relative border border-stone-200/40">
                    <div
                      className="h-full rounded-none transition-all duration-1000 ease-out flex items-center justify-end pr-3"
                      style={{
                        width: `${Math.max(stage.pct, 2)}%`,
                        backgroundColor: stage.color,
                      }}
                    >
                      <span className="text-[10px] font-bold text-white tracking-widest uppercase">
                        {funnelMode === "absolute" ? fmt(stage.value) : `${stage.pct}%`}
                      </span>
                    </div>
                  </div>
                  {i < funnelStages.length - 1 && (
                    <span className="text-[10px] text-stone-400 font-bold w-12 text-center uppercase">
                      {pct(funnelStages[i + 1].value, stage.value || 1)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ─── Section 4: Campaign Timeline ─── */}
          <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
            <h3 className="text-lg font-light text-stone-950 flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-stone-950" />
              Campaign Activity Timeline
            </h3>
            <p className="text-xs text-stone-500 tracking-wider uppercase mt-1 mb-6">Messages dispatched per campaign day ledger</p>
            {timelineData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-stone-500 text-xs font-bold uppercase tracking-widest">
                NO ACTIVE CAMPAIGN RECORDS DISCOVERED IN THIS PERIOD
              </div>
            ) : (
              <div className="flex items-end gap-1.5 h-48 overflow-x-auto custom-scrollbar pb-1">
                {timelineData.map((d) => {
                  const heightPct = (d.sent / maxTimelineSent) * 100;
                  return (
                    <div key={d.date} className="flex flex-col items-center gap-1.5 min-w-[36px] group flex-1">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-stone-900 bg-white border border-stone-200 px-2 py-1 uppercase whitespace-nowrap pointer-events-none tracking-widest">
                        {fmt(d.sent)} sent
                      </div>
                      <div
                        className={`w-full rounded-none transition-all duration-500 ${statusColor(d.status)}`}
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                      />
                      <span className="text-[9px] text-stone-500 font-bold uppercase whitespace-nowrap tracking-wider">
                        {d.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 pt-4 border-t border-stone-100 text-[9px] text-stone-500 font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-stone-950" /> Completed</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-stone-600" /> Active</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-stone-300" /> Scheduled</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-stone-200" /> Failed</span>
            </div>
          </div>

          {/* ─── Section 5 + 6: Contact Source & Tag Cloud ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Source Donut */}
            <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
              <h3 className="text-lg font-light text-stone-950 flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-stone-950" />
                Contact Source Distribution
              </h3>
              <p className="text-xs text-stone-500 tracking-wider uppercase mt-1 mb-6">CRM entry node index</p>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="relative w-36 h-36 shrink-0">
                  <div
                    className="w-full h-full rounded-full border border-stone-200/50"
                    style={{ background: conicGradient }}
                  />
                  <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center border border-stone-200">
                    <span className="text-lg font-bold text-stone-950">{contacts.length}</span>
                    <span className="text-[8px] text-stone-500 font-bold uppercase tracking-widest">Total CRM</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2.5 max-h-36 overflow-y-auto w-full custom-scrollbar">
                  {sourceData.map((s) => (
                    <div key={s.source} className="flex items-center justify-between text-xs text-stone-700 border-b border-stone-50 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="font-semibold text-stone-800 uppercase text-[10px] tracking-wider truncate max-w-[120px]">{s.source}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold">
                        <span className="text-stone-800">{s.count}</span>
                        <span className="text-stone-400">{s.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tag Cloud */}
            <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
              <h3 className="text-lg font-light text-stone-900 flex items-center gap-2 mb-1">
                <Tag className="w-4 h-4 text-stone-950" />
                Audience Tag Distribution
              </h3>
              <p className="text-xs text-stone-500 tracking-wider uppercase mt-1 mb-6">Active crm taxonomy segments</p>
              {tagCloud.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-stone-500 text-xs font-bold uppercase tracking-widest">
                  NO CRM TAXONOMY TAGS SPECIFIED YET
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tagCloud.map((t) => {
                    const intensity = t.count / maxTagCount;
                    const opacity = 0.6 + intensity * 0.4;
                    return (
                      <span
                        key={t.tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-900 text-[10px] font-bold uppercase tracking-wider transition-all"
                        style={{ opacity }}
                      >
                        <Tag className="w-3 h-3 text-stone-500" />
                        {t.tag}
                        <span className="text-stone-400 ml-0.5">×{t.count}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── Section 7: Template Performance Matrix ─── */}
          <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
            <h3 className="text-lg font-light text-stone-950 flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-stone-950" />
              Template Performance Matrix
            </h3>
            <p className="text-xs text-stone-500 tracking-wider uppercase mt-1 mb-6">Waba payload delivery rate analysis index</p>
            {templatePerf.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-stone-500 text-xs font-bold uppercase tracking-widest">
                NO META APPROVED MESSAGE PAYLOADS CURRENTLY ON RECORD
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4">Template</th>
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Status</th>
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Campaigns</th>
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Sent</th>
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Delivery %</th>
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Read %</th>
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 text-center">Click %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templatePerf.map((t) => (
                      <tr key={t.id} className="border-b border-stone-100 hover:bg-[#fafaf9]/80 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">{t.name}</span>
                            <span className="text-[9px] text-stone-400 uppercase tracking-wider mt-0.5">{t.category}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <span className={`text-[8.5px] font-bold uppercase px-2 py-0.5 rounded-none border ${metaStatusBadge(t.metaStatus)}`}>
                            {t.metaStatus || "pending"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-center text-xs font-bold">{t.usedInCampaigns}</td>
                        <td className="py-3 pr-4 text-center text-xs font-bold">{fmt(t.sent)}</td>
                        <td className="py-3 pr-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-14 h-1 bg-stone-100 border border-stone-200/50 rounded-none overflow-hidden shrink-0">
                              <div className="h-full bg-stone-900 rounded-none" style={{ width: `${t.deliveryRate}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-stone-600">{t.deliveryRate}%</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-14 h-1 bg-stone-100 border border-stone-200/50 rounded-none overflow-hidden shrink-0">
                              <div className="h-full bg-stone-600 rounded-none" style={{ width: `${t.readRate}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-stone-600">{t.readRate}%</span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-14 h-1 bg-stone-100 border border-stone-200/50 rounded-none overflow-hidden shrink-0">
                              <div className="h-full bg-stone-300 rounded-none" style={{ width: `${t.clickRate}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-stone-600">{t.clickRate}%</span>
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
          <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
            <h3 className="text-lg font-light text-stone-950 flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-stone-950" />
              Message Activity Heatmap
            </h3>
            <p className="text-xs text-stone-500 tracking-wider uppercase mt-1 mb-6">Hourly webhook chat transmission volume metrics by week day</p>
            <div className="overflow-x-auto custom-scrollbar">
              <div className="flex items-center mb-2">
                <div className="w-10 shrink-0" />
                {hourLabels.map((h, i) => (
                  i % 2 === 0 ? (
                    <span key={i} className="text-[8.5px] text-stone-400 font-bold uppercase" style={{ width: "calc(100% / 24)", minWidth: "20px", textAlign: "center" }}>
                      {h}
                    </span>
                  ) : (
                    <span key={i} style={{ width: "calc(100% / 24)", minWidth: "20px" }} />
                  )
                ))}
              </div>
              {heatmapData.map((row, dayIdx) => (
                <div key={dayIdx} className="flex items-center gap-0 mb-1">
                  <span className="text-[10px] text-stone-500 font-bold w-10 shrink-0 text-right pr-3 uppercase">
                    {dayLabels[dayIdx]}
                  </span>
                  <div className="flex-1 flex gap-[2px]">
                    {row.map((val, hourIdx) => {
                      const intensity = val / maxHeat;
                      return (
                        <div
                          key={hourIdx}
                          className="aspect-square rounded-none transition-all hover:scale-125 hover:z-10 group relative border border-stone-200/10 cursor-default"
                          style={{
                            flex: 1,
                            minWidth: "14px",
                            backgroundColor: val === 0
                              ? "#fafaf9"
                              : `rgba(28, 25, 23, ${0.12 + intensity * 0.88})`,
                          }}
                          title={`${dayLabels[dayIdx]} ${hourLabels[hourIdx]}: ${val} messages`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-end gap-1 mt-4 text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                <span className="mr-1">Less Activity</span>
                {[0, 0.25, 0.5, 0.75, 1].map((i) => (
                  <div
                    key={i}
                    className="w-3.5 h-3.5 rounded-none border border-stone-200/50"
                    style={{
                      backgroundColor: i === 0 ? "#fafaf9" : `rgba(28, 25, 23, ${0.12 + i * 0.88})`,
                    }}
                  />
                ))}
                <span className="ml-1">More Activity</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── SECTION: AGENT PERFORMANCE MATRIX ─── */}
      {activeSection === "agents" && (
        <div className="space-y-8 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Active Team Handlers"
              value={agentMetrics.length.toString()}
              subtitle="Monitored in CRM index"
              icon={<Users className="w-5 h-5 text-stone-950" />}
            />
            <StatCard
              title="Avg Operational Latency"
              value={`${Math.round(agentMetrics.reduce((acc, a) => acc + a.avgLatencyMinutes, 0) / (agentMetrics.length || 1))} min`}
              subtitle="Global average ticket delay"
              icon={<Clock className="w-5 h-5 text-stone-950" />}
            />
            <StatCard
              title="Agent-Attributed Sales"
              value={fmt(agentMetrics.reduce((acc, a) => acc + (a.attributedSales || 0), 0))}
              subtitle="Paid orders credited to agents"
              icon={<Zap className="w-5 h-5 text-stone-950" />}
            />
            <StatCard
              title="Agent-Attributed Revenue"
              value={`₹${(agentMetrics.reduce((acc, a) => acc + (a.attributedRevenuePaise || 0), 0) / 100).toFixed(2)}`}
              subtitle="Revenue driven by handlers"
              icon={<Tag className="w-5 h-5 text-stone-950" />}
            />
          </div>

          <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
            <h3 className="text-lg font-light text-stone-950 flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-stone-950" />
              Agent Response Latency & Conversational Volume Matrix
            </h3>
            <p className="text-xs text-stone-500 tracking-wider uppercase mt-1 mb-6">CRM performance audit ledger</p>
            
            {loadingMetrics ? (
              <div className="h-48 flex items-center justify-center text-stone-500 text-xs font-bold uppercase tracking-widest animate-pulse">
                SYNCHRONIZING OPERATIONAL INDEX...
              </div>
            ) : agentMetrics.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-stone-500 text-xs font-bold uppercase tracking-widest">
                NO TEAM ACTIVITY DISCOVERED ON FILE
              </div>
            ) : (
              <div className="space-y-6">
                {agentMetrics.map((ag) => {
                  const displayName = ag.agent === "Bot" || ag.agent === "None" ? "Automation" : ag.agent;
                  const maxRevenue = Math.max(...agentMetrics.map((a) => a.attributedRevenuePaise || 0), 1);
                  const revenuePct = Math.min(100, Math.max(4, ((ag.attributedRevenuePaise || 0) / maxRevenue) * 100));
                  return (
                    <div key={ag.agent} className="space-y-2 border-b border-stone-100 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-stone-900 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-stone-950" />
                          {displayName}
                        </span>
                        <span className="text-stone-500 uppercase tracking-wider">
                          {ag.attributedSales || 0} Sales | {ag.replies} Replies | {ag.avgLatencyMinutes}m latency
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-3 bg-stone-100 border border-stone-200/50 rounded-none overflow-hidden relative">
                          <div
                            className="h-full bg-stone-900 rounded-none transition-all duration-1000 ease-out"
                            style={{ width: `${revenuePct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-stone-950 w-24 text-right tracking-tight">
                          ₹{((ag.attributedRevenuePaise || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SECTION: ROI ATTRIBUTION LEDGER ─── */}
      {activeSection === "roi" && (() => {
        const activeSummary = roiView === "campaigns" ? roiSummary : seqSummary;
        return (
        <div className="space-y-8 animate-slide-up">
          {/* Campaigns | Sequences toggle */}
          <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-none border border-stone-200 w-fit select-none">
            {(["campaigns", "sequences"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setRoiView(v)}
                className={`text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-none transition-all cursor-pointer ${
                  roiView === v ? "bg-stone-950 text-white" : "text-stone-500 hover:text-stone-900"
                }`}
              >
                {v === "campaigns" ? "Campaigns" : "Sequences"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <StatCard
              title="Attributed Sales Revenue"
              value={`₹${(activeSummary.totalRevenuePaise / 100).toFixed(2)}`}
              subtitle="Last-touch revenue attribution"
              icon={<Tag className="w-5 h-5 text-stone-950" />}
            />
            <StatCard
              title="Simulated Send Costs"
              value={`₹${(activeSummary.totalCostPaise / 100).toFixed(2)}`}
              subtitle="Centralized per-message rate"
              icon={<Clock className="w-5 h-5 text-stone-950" />}
            />
            <StatCard
              title="Ledger Conversion Events"
              value={activeSummary.totalConversions.toString()}
              subtitle={roiView === "campaigns" ? "Campaign driven checkouts" : "Sequence driven checkouts"}
              icon={<Zap className="w-5 h-5 text-stone-950" />}
            />
            <StatCard
              title={roiView === "campaigns" ? "Aggregate Campaign ROI" : "Aggregate Sequence ROI"}
              value={`${activeSummary.overallRoi}x`}
              subtitle="Revenue-to-spend multiplier ratio"
              icon={<TrendingUp className="w-5 h-5 text-stone-950" />}
              trend={activeSummary.overallRoi > 1 ? 1 : -1}
            />
          </div>

          {roiView === "campaigns" && (
          <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
            <h3 className="text-lg font-light text-stone-950 flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-stone-950" />
              Campaign Attribution & ROI Performance Matrix
            </h3>
            <p className="text-xs text-stone-500 tracking-wider uppercase mt-1 mb-6">Waba campaign spend audit ledgers</p>

            {loadingMetrics ? (
              <div className="h-48 flex items-center justify-center text-stone-500 text-xs font-bold uppercase tracking-widest animate-pulse">
                AUDITING CAMPAIGN BALANCES...
              </div>
            ) : roiLedger.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-stone-500 text-xs font-bold uppercase tracking-widest">
                NO BROADCAST CAMPAIGN DATA RECORDED YET
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4">Campaign</th>
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Conversions</th>
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Cost</th>
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Attributed Revenue</th>
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 text-center">ROI Multiplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roiLedger.map((rl) => (
                      <tr key={rl.id} className="border-b border-stone-100 hover:bg-[#fafaf9]/80 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">{rl.name}</span>
                            <span className="text-[9px] text-stone-400 uppercase tracking-wider mt-0.5">{rl.templateName}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-center text-xs font-bold text-stone-850">{rl.conversions}</td>
                        <td className="py-3 pr-4 text-center text-xs font-bold text-stone-600">₹{(rl.costPaise / 100).toFixed(2)}</td>
                        <td className="py-3 pr-4 text-center text-xs font-bold text-stone-900">₹{(rl.attributedRevenuePaise / 100).toFixed(2)}</td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase border ${
                            rl.roi > 2 
                              ? "bg-stone-900 text-white border-stone-950" 
                              : rl.roi > 0 
                              ? "bg-stone-100 text-stone-900 border-stone-300"
                              : "bg-stone-50 text-stone-400 border-stone-200"
                          }`}>
                            {rl.roi > 0 ? `${rl.roi}x ROI` : "0.0x ROI"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}

          {roiView === "sequences" && (
          <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
            <h3 className="text-lg font-light text-stone-950 flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-stone-950" />
              Sequence Attribution & ROI Performance Matrix
            </h3>
            <p className="text-xs text-stone-500 tracking-wider uppercase mt-1 mb-6">Drip / journey revenue audit ledgers</p>

            {loadingMetrics ? (
              <div className="h-48 flex items-center justify-center text-stone-500 text-xs font-bold uppercase tracking-widest animate-pulse">
                AUDITING SEQUENCE BALANCES...
              </div>
            ) : seqLedger.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-stone-500 text-xs font-bold uppercase tracking-widest">
                NO SEQUENCE AUTOMATION DATA RECORDED YET
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4">Sequence</th>
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Sends</th>
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Conversions</th>
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Cost</th>
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Attributed Revenue</th>
                      <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 text-center">ROI Multiplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seqLedger.map((sl) => (
                      <tr key={sl.id} className="border-b border-stone-100 hover:bg-[#fafaf9]/80 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">{sl.name}</span>
                            <span className="text-[9px] text-stone-400 uppercase tracking-wider mt-0.5">{sl.trigger}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-center text-xs font-bold text-stone-600">{sl.sends}</td>
                        <td className="py-3 pr-4 text-center text-xs font-bold text-stone-850">{sl.conversions}</td>
                        <td className="py-3 pr-4 text-center text-xs font-bold text-stone-600">₹{(sl.costPaise / 100).toFixed(2)}</td>
                        <td className="py-3 pr-4 text-center text-xs font-bold text-stone-900">₹{(sl.attributedRevenuePaise / 100).toFixed(2)}</td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase border ${
                            sl.roi > 2
                              ? "bg-stone-900 text-white border-stone-950"
                              : sl.roi > 0
                              ? "bg-stone-100 text-stone-900 border-stone-300"
                              : "bg-stone-50 text-stone-400 border-stone-200"
                          }`}>
                            {sl.roi > 0 ? `${sl.roi}x ROI` : "0.0x ROI"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}
        </div>
        );
      })()}

      {/* ─── SECTION: E-COMMERCE & ABANDONED CARTS ─── */}
      {activeSection === "commerce" && (() => {
        const abandonedContacts = contacts.filter((c) => c.tags.includes("Shopify-Cart") || c.tags.includes("WhatsApp-Cart"));
        const totalAbandonedCount = abandonedContacts.length;
        const recoveredContacts = abandonedContacts.filter((c) => {
          const attrs = (c.attributes as Record<string, any>) || {};
          return attrs.cart_recovered === true;
        });
        const totalRecoveredCount = recoveredContacts.length;
        const recoveryRate = totalAbandonedCount > 0 ? Math.round((totalRecoveredCount / totalAbandonedCount) * 100) : 0;

        const recoveredRevenuePaise = recoveredContacts.reduce((sum, c) => {
          const attrs = (c.attributes as Record<string, any>) || {};
          const value = parseFloat(attrs.cart_total || "0");
          return sum + Math.round(value * 100);
        }, 0);

        return (
          <div className="space-y-8 animate-slide-up">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <StatCard
                title="Carts Abandoned"
                value={totalAbandonedCount.toString()}
                subtitle="Shopify + WhatsApp checkouts"
                icon={<ShoppingBag className="w-5 h-5 text-stone-950" />}
              />
              <StatCard
                title="Carts Recovered"
                value={totalRecoveredCount.toString()}
                subtitle="Drip recovery conversions"
                icon={<CheckCheck className="w-5 h-5 text-stone-950" />}
                trend={recoveryRate > 15 ? 1 : -1}
              />
              <StatCard
                title="Recovery Rate"
                value={`${recoveryRate}%`}
                subtitle="Average conversion rate"
                icon={<TrendingUp className="w-5 h-5 text-stone-950" />}
                trend={recoveryRate > 15 ? 1 : -1}
              />
              <StatCard
                title="Recovered Revenue"
                value={`₹${(recoveredRevenuePaise / 100).toFixed(2)}`}
                subtitle="Saved sales value index"
                icon={<Tag className="w-5 h-5 text-stone-950" />}
              />
            </div>

            <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
              <h3 className="text-lg font-light text-stone-950 flex items-center gap-2 mb-1">
                <ShoppingBag className="w-4 h-4 text-stone-950" />
                Abandoned Checkout Recovery Ledger
              </h3>
              <p className="text-xs text-stone-500 tracking-wider uppercase mt-1 mb-6">Real-time Shopify &amp; WhatsApp marketplace telemetry</p>

              {abandonedContacts.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-stone-500 text-xs font-bold uppercase tracking-widest">
                  NO ABANDONED CHECKOUT RECORDS DETECTED
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4">Contact</th>
                        <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4">Source</th>
                        <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4">Cart Total</th>
                        <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4">Items Summary</th>
                        <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4">Abandoned At</th>
                        <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 text-center">Recovery Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abandonedContacts.map((c) => {
                        const attrs = (c.attributes as Record<string, any>) || {};
                        const isRecovered = attrs.cart_recovered === true;
                        const isWhatsAppCart = c.tags.includes("WhatsApp-Cart");
                        const sourceLabel = isWhatsAppCart ? "WhatsApp" : "Shopify";

                        return (
                          <tr key={c.id} className="border-b border-stone-100 hover:bg-[#fafaf9]/80 transition-colors text-xs font-medium">
                            <td className="py-3 pr-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-stone-800 uppercase tracking-wider">{c.name}</span>
                                <span className="text-[9px] text-stone-450 tracking-wide mt-0.5">{c.phone}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <span className={`inline-flex items-center px-2 py-0.5 text-[8px] font-black tracking-widest uppercase border ${
                                isWhatsAppCart
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-stone-50 text-stone-600 border-stone-200"
                              }`}>
                                {sourceLabel}
                              </span>
                            </td>
                            <td className="py-3 pr-4 font-bold text-stone-900">₹{attrs.cart_total || "0.00"}</td>
                            <td className="py-3 pr-4 text-stone-600 truncate max-w-[240px]" title={attrs.cart_items}>
                              {attrs.cart_items || "Line items not synced"}
                            </td>
                            <td className="py-3 pr-4 text-stone-400 text-[10px] uppercase tracking-wide">{attrs.cart_abandoned_at || "Recent"}</td>
                            <td className="py-3 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[8px] font-black tracking-widest uppercase border ${
                                isRecovered
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>
                                {isRecovered ? "Recovered" : "Active Recovery"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};