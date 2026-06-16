"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Send,
  FileText,
  Zap,
  Wifi,
  Bot,
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  Calendar,
  ShoppingBag,
  AlertTriangle,
  Wallet,
  TrendingUp,
  Megaphone,
} from "lucide-react";
import { motion } from "framer-motion";
import { useApp } from "@/shared/context/AppContext";
import { useParams, useRouter, usePathname } from "next/navigation";
import { CSVImporterModal } from "@/features/inbox/components/CSVImporterModal";
import { MetaBillingModal } from "@/features/wallet/components/MetaBillingModal";
import { ChecklistWizard } from "@/features/dashboard/components/ChecklistWizard";
import { buildWorkspaceUrl } from "@/features/ai/lib/workspaceRouting";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewTabProps {
  onNavigate?: (tab: string) => void;
}

interface TodayBooking {
  id: string;
  serviceName: string;
  startTime: string;
  bookingForName: string;
  status: "booked" | "completed" | "no_show" | "cancelled";
  price: number; // paise
}

// ─── Constants ────────────────────────────────────────────────────────────────

function humanizeLog(message: string): string {
  let m = message
    .replace(/\s*\(ID\s+[a-z0-9-]+\)/gi, "")
    .replace(/\s+to\s+ID\s+[a-z0-9-]+/gi, "")
    .replace(/\s+for\s+ID\s+[a-z0-9-]+/gi, "")
    .replace(/contact\s+ID\s+[a-z0-9-]+/gi, "contact")
    .replace(/\(\d{7,}\)/g, "")
    .replace(/\s*—\s*(NONE|null|undefined)\.?\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return m.length > 72 ? m.slice(0, 70) + "…" : m;
}

// ─── Shared mini-components ───────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  sectionId: string;
  collapsed: boolean;
  onToggle: (id: string) => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, sectionId, collapsed, onToggle }) => (
  <div className="flex items-center justify-between mb-4 select-none">
    <h3 className="text-sm font-black text-stone-700 tracking-tight">{title}</h3>
    <button
      onClick={() => onToggle(sectionId)}
      className="flex items-center gap-1 text-xs font-semibold text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
    >
      {collapsed ? <><ChevronDown className="w-3.5 h-3.5" /> Show</> : <><ChevronUp className="w-3.5 h-3.5" /> Hide</>}
    </button>
  </div>
);

// ─── CONTROL-ROOM COMPONENTS (dashboard rebuild) ──────────────────────────────

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

/** Big typographic metric tile — floating card with a mono figure. */
interface HeroStatProps {
  label: string;
  value: string;
  icon: React.ElementType;
  accent: string;
  cardBg: string;       // CSS gradient for card background
  context?: string;     // small context line below label
  hint?: string;
  onClick?: () => void;
  delay?: number;
}

const HeroStat: React.FC<HeroStatProps> = ({ label, value, icon: Icon, accent, cardBg, context, hint, onClick, delay = 0 }) => (
  <motion.button
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
    whileHover={{ y: -6, transition: { type: "spring", stiffness: 450, damping: 15 } }}
    whileTap={{ scale: 0.97, transition: { type: "spring", stiffness: 500, damping: 20 } }}
    onClick={onClick}
    className="bg-white border border-stone-300 shadow-sm relative overflow-hidden text-left flex flex-col cursor-pointer group rounded-2xl"
    style={{ background: cardBg, borderColor: `${accent}55` }}
  >
    {/* Left accent stripe */}
    <div className="absolute left-0 rounded-r-full pointer-events-none" style={{
      top: "18%", bottom: "18%", width: 3,
      background: `linear-gradient(to bottom, ${accent}, ${accent}40)`,
    }} />

    {/* Dot-grid corner texture (top-right) */}
    <div className="absolute top-0 right-0 w-28 h-28 pointer-events-none" style={{
      backgroundImage: `radial-gradient(${accent}22 1px, transparent 1px)`,
      backgroundSize: "12px 12px",
      maskImage: "radial-gradient(circle at top right, black 30%, transparent 78%)",
      WebkitMaskImage: "radial-gradient(circle at top right, black 30%, transparent 78%)",
    }} />

    <div className="p-5 flex flex-col flex-1 relative z-10">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${accent}18` }}>
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: accent }} />
      </div>
      <div className="kc-figure text-[40px] font-black leading-none" style={{ color: accent }}>{value}</div>
      <div className="kc-label text-stone-500 mt-2">{label}</div>
      {context && <div className="text-[11px] text-stone-400 mt-1.5 font-medium">{context}</div>}
      {hint && <div className="text-[11px] font-bold mt-2" style={{ color: accent }}>{hint} →</div>}
    </div>
  </motion.button>
);

/** Auto-computed alerts — the heart of a control room. */
interface AttentionItem {
  id: string;
  label: string;
  tone: "warn" | "info" | "danger";
  onClick: () => void;
}

const TONE_STYLES: Record<AttentionItem["tone"], { bg: string; border: string; text: string; dot: string }> = {
  danger: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
  warn: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  info: { bg: "bg-wa-green/8", border: "border-wa-green/25", text: "text-wa-green-dark", dot: "bg-wa-green" },
};

const AttentionStrip: React.FC<{ items: AttentionItem[] }> = ({ items }) => {
  if (items.length === 0) return null;
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="kc-float p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        <span className="kc-label text-stone-400">Needs Attention</span>
        <span className="kc-label text-stone-300">· {items.length}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => {
          const s = TONE_STYLES[it.tone];
          return (
            <button
              key={it.id}
              onClick={it.onClick}
              className={`group flex items-center gap-2 ${s.bg} ${s.border} border rounded-full pl-2.5 pr-2 py-1.5 cursor-pointer transition-transform hover:-translate-y-0.5`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse-soft`} />
              <span className={`text-xs font-semibold ${s.text}`}>{it.label}</span>
              <ArrowRight className={`w-3 h-3 ${s.text} opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all`} />
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

/** Collapsed AI command bar — navigates to the dedicated AI Workspace on submit. */
interface CommandBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onFocus: () => void;
}

const CommandBar: React.FC<CommandBarProps> = ({ value, onChange, onSubmit, onFocus }) => {
  const [focused, setFocused] = useState(false);
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
      className="relative overflow-hidden rounded-2xl border transition-all duration-300"
      style={{
        background: focused
          ? "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)"
          : "linear-gradient(135deg, #f6fef9 0%, #f0fdf4 100%)",
        borderColor: focused ? "rgba(37,211,102,0.7)" : "rgba(37,211,102,0.35)",
        boxShadow: focused
          ? "0 0 0 3px rgba(37,211,102,0.08), 0 4px 16px rgba(37,211,102,0.12)"
          : "0 2px 8px rgba(37,211,102,0.08)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-0 w-40 h-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse at left center, rgba(37,211,102,0.12) 0%, transparent 65%)" }}
      />
      <div className="relative flex items-center gap-3 px-4 sm:px-5 py-4">
        <div className="relative shrink-0">
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-wa-green-light animate-pulse" />
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #128c7e, #25d366)", boxShadow: "0 4px 14px rgba(18,140,126,0.45)" }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-widest mb-0.5 text-wa-green-dark">
            AI Copilot · Always ready
          </p>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => { setFocused(true); onFocus(); }}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSubmit(); } }}
            placeholder="Ask me anything — build a campaign, automate a flow, write a template…"
            className="bg-transparent text-sm font-medium focus:outline-none w-full text-stone-700 placeholder:text-stone-400"
          />
        </div>
        <button
          onClick={onSubmit}
          className="shrink-0 font-black text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-white"
          style={{
            background: "linear-gradient(135deg, #128c7e, #25d366)",
            boxShadow: "0 2px 10px rgba(18,140,126,0.35)",
          }}
        >
          <Sparkles className="w-3 h-3" /> Ask AI
        </button>
      </div>
    </motion.div>
  );
};

/** Live campaign performance — read-rate bars. */
interface LiveCampaignRow {
  id: string;
  name: string;
  status: string;
  sent: number;
  delivered: number;
  read: number;
}

function formatCampaignName(name: string): string {
  return name.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

const STATUS_CHIP: Record<string, string> = {
  Completed: "bg-stone-100 text-stone-500",
  Active: "bg-amber-50 text-amber-700",
  Sending: "bg-amber-50 text-amber-700",
  Scheduled: "bg-blue-50 text-blue-700",
  Failed: "bg-red-50 text-red-600",
  PendingTemplate: "bg-stone-50 text-stone-500",
};

const LiveCampaignsCard: React.FC<{ campaigns: LiveCampaignRow[]; onNavigate?: (tab: string) => void; delay?: number }> = ({ campaigns, onNavigate, delay = 0 }) => (
  <motion.div {...fadeUp} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }} className="bg-white border border-stone-300 shadow-sm rounded-2xl p-5 flex flex-col h-full">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-stone-500" />
        <h3 className="kc-label text-stone-400">Live Campaigns</h3>
      </div>
      <button onClick={() => onNavigate?.("campaigns")} className="kc-label text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-1 cursor-pointer">
        View all <ArrowUpRight className="w-3 h-3" />
      </button>
    </div>
    {campaigns.length === 0 ? (
      <div className="flex flex-col items-center justify-center flex-1 py-6 text-center">
        <Send className="w-7 h-7 text-stone-200 mb-2" />
        <p className="text-xs font-semibold text-stone-400">No campaigns running</p>
        <button onClick={() => onNavigate?.("campaigns")} className="text-[11px] font-bold text-wa-green-dark mt-2 cursor-pointer hover:underline">
          Launch first broadcast →
        </button>
      </div>
    ) : (
      <div className="space-y-1">
        {/* Compact summary rows — click any to go to campaigns */}
        {campaigns.slice(0, 5).map((c) => {
          const isActive = c.status === "Sending" || c.status === "Active";
          const readRate = c.delivered > 0 ? Math.round((c.read / c.delivered) * 100) : 0;
          return (
            <button
              key={c.id}
              onClick={() => onNavigate?.("campaigns")}
              className="w-full flex items-center justify-between gap-3 py-2 px-2.5 rounded-lg hover:bg-stone-50 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />}
                <span className="text-xs font-semibold text-stone-800 truncate group-hover:text-wa-green-dark transition-colors">
                  {formatCampaignName(c.name)}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold text-stone-400">{c.sent} sent</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${STATUS_CHIP[c.status] ?? "bg-stone-100 text-stone-500"}`}>
                  {readRate > 0 ? `${readRate}% read` : c.status}
                </span>
              </div>
            </button>
          );
        })}
        {campaigns.length > 5 && (
          <button onClick={() => onNavigate?.("campaigns")} className="w-full text-center text-[10px] font-bold text-stone-400 hover:text-wa-green-dark pt-1 cursor-pointer transition-colors">
            +{campaigns.length - 5} more → View all
          </button>
        )}
      </div>
    )}
  </motion.div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export const OverviewTab: React.FC<OverviewTabProps> = ({ onNavigate }) => {
  const { organization, contacts, campaigns, templates, systemLogs, orders, chatbotNodes, refreshWorkspace, dismissOnboarding } = useApp();

  const params = useParams();
  const orgId = params.orgId as string;
  const router = useRouter();
  const pathname = usePathname();

  // Modal state
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);

  // Collapsible sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("dashboard_collapsed_sections");
        if (saved) setCollapsedSections(JSON.parse(saved) as Record<string, boolean>);
      } catch { /* ignore */ }
    }
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const updated = { ...prev, [sectionId]: !prev[sectionId] };
      try { localStorage.setItem("dashboard_collapsed_sections", JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  // Active automations count
  const [activeAutomations, setActiveAutomations] = useState<number | null>(null);
  const [totalAutomations, setTotalAutomations] = useState<number | null>(null);

  useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false;
    fetch(`/api/org/${organization.id}/recipes`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) {
          const recipes = data.recipes ?? [];
          setTotalAutomations(recipes.length);
          setActiveAutomations(recipes.filter((r: { installed: boolean }) => r.installed).length);
        }
      })
      .catch(() => { if (!cancelled) { setActiveAutomations(0); setTotalAutomations(0); } });
    return () => { cancelled = true; };
  }, [organization?.id]);

  // All bookings (Appointment-vertical orgs only) — derived stats computed below
  const [allBookings, setAllBookings] = useState<TodayBooking[] | null>(null);
  const businessVertical = organization?.businessVertical;

  useEffect(() => {
    if (businessVertical !== "APPOINTMENT" || !organization?.id) return;
    let cancelled = false;
    fetch(`/api/usecase/bookings?orgId=${organization.id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => { if (!cancelled) setAllBookings(data.bookings || []); })
      .catch(() => { if (!cancelled) setAllBookings([]); });
    return () => { cancelled = true; };
  }, [businessVertical, organization?.id]);

  // CommandBar input state
  const [input, setInput] = useState("");

  // Derived stats
  const totalContacts = contacts.length;
  const totalCampaigns = campaigns.length;
  const totalMessages = campaigns.reduce((sum, c) => sum + (c.sent || 0), 0);
  const fbConnected = !!(organization?.whatsappConnected || organization?.whatsappBusinessAccountId);
  const walletBalance = organization?.walletBalance ?? 0;

  // Avg read rate across all campaigns (read / delivered)
  const avgReadRate = useMemo(() => {
    const totalDelivered = campaigns.reduce((s, c) => s + (c.delivered || 0), 0);
    const totalRead = campaigns.reduce((s, c) => s + (c.read || 0), 0);
    return totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;
  }, [campaigns]);

  // Most recent campaigns for the live-performance card
  const liveCampaigns = useMemo(
    () =>
      campaigns
        .slice()
        .sort((a, b) => new Date(b.createdAt ?? b.date ?? 0).getTime() - new Date(a.createdAt ?? a.date ?? 0).getTime())
        .slice(0, 4),
    [campaigns]
  );

  // Today widget — recent orders (E-commerce vertical)
  const todayOrdersCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return (orders as Array<{ createdAt?: string }>).filter(
      (o) => o.createdAt && new Date(o.createdAt).toDateString() === todayStr
    ).length;
  }, [orders]);

  // Template Health counts
  const approvedTemplates = templates.filter((t) => t.metaStatus === "approved").length;
  const pendingTemplates = templates.filter((t) => t.metaStatus === "pending").length;
  const rejectedTemplates = templates.filter((t) => t.metaStatus === "rejected").length;

  // Appointment vertical — derived booking stats
  const todayBookingsAll = useMemo(() => {
    if (!allBookings) return null;
    const todayStr = new Date().toDateString();
    return allBookings.filter(
      (b) => new Date(b.startTime).toDateString() === todayStr && b.status !== "cancelled"
    ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [allBookings]);

  const todayRevenueRs = useMemo(() => {
    if (!todayBookingsAll) return 0;
    return Math.round(todayBookingsAll.reduce((sum, b) => sum + (b.price || 0), 0) / 100);
  }, [todayBookingsAll]);

  const nextUpcomingBooking = useMemo(() => {
    if (!allBookings) return null;
    const now = new Date();
    return allBookings
      .filter((b) => b.status === "booked" && new Date(b.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] ?? null;
  }, [allBookings]);

  // ── Needs Attention — auto-computed control-room alerts ─────────────────────
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    if (!fbConnected) {
      items.push({ id: "wa", label: "WhatsApp not connected", tone: "danger", onClick: () => onNavigate?.("settings") });
    }
    if (fbConnected && walletBalance < 100) {
      items.push({ id: "wallet", label: `Low balance · ₹${walletBalance.toLocaleString()}`, tone: "warn", onClick: () => onNavigate?.("settings") });
    }
    const rejected = templates.filter((t) => t.metaStatus === "rejected").length;
    if (rejected > 0) {
      items.push({ id: "tpl-rej", label: `${rejected} template${rejected > 1 ? "s" : ""} rejected`, tone: "danger", onClick: () => onNavigate?.("templates") });
    }
    const pending = templates.filter((t) => t.metaStatus === "pending").length;
    if (pending > 0) {
      items.push({ id: "tpl-pend", label: `${pending} template${pending > 1 ? "s" : ""} pending approval`, tone: "warn", onClick: () => onNavigate?.("templates") });
    }
    const failed = campaigns.filter((c) => c.status === "Failed").length;
    if (failed > 0) {
      items.push({ id: "camp-fail", label: `${failed} campaign${failed > 1 ? "s" : ""} failed`, tone: "danger", onClick: () => onNavigate?.("campaigns") });
    }
    const totalUnread = contacts.reduce((s, c) => s + (c.unreadCount ?? 0), 0);
    if (totalUnread > 0) {
      items.push({ id: "unread", label: `${totalUnread} unread message${totalUnread > 1 ? "s" : ""}`, tone: "info", onClick: () => onNavigate?.("inbox") });
    }
    return items;
  }, [fbConnected, walletBalance, templates, campaigns, contacts, onNavigate]);

  const recentLogs = systemLogs.slice(0, 8);

  const firstName = (organization?.name ?? "there").split(" ")[0];
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const quickActions = [
    {
      label: "Import Contacts", desc: "Bulk upload via CSV",
      icon: Users, action: () => setIsCSVModalOpen(true),
      gradient: "linear-gradient(135deg, #0EA5E9 0%, #7DD3FC 100%)",
      glow: "rgba(14,165,233,0.18)",
    },
    {
      label: "New Campaign", desc: "Broadcast to segments",
      icon: Send, action: () => onNavigate?.("campaigns"),
      gradient: "linear-gradient(135deg, #059669 0%, #6EE7B7 100%)",
      glow: "rgba(5,150,105,0.18)",
    },
    {
      label: "Create Template", desc: "Meta-approved messages",
      icon: FileText, action: () => onNavigate?.("templates"),
      gradient: "linear-gradient(135deg, #8B5CF6 0%, #C4B5FD 100%)",
      glow: "rgba(139,92,246,0.16)",
    },
    {
      label: "Build Chatbot", desc: "Automate conversations",
      icon: Bot, action: () => onNavigate?.("chatbot"),
      gradient: "linear-gradient(135deg, #F59E0B 0%, #FDE68A 100%)",
      glow: "rgba(245,158,11,0.18)",
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto bg-stone-100 custom-scrollbar pb-12">
      {/* ── Hero band ── */}
      <div className="px-4 sm:px-6 pt-6 pb-5 space-y-5 bg-stone-100">
      {/* ── Greeting header ── */}
      <motion.div {...fadeUp} transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }} className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="kc-label text-stone-400">Workspace Overview · {todayLabel}</span>
          <h1 className="text-[26px] sm:text-[32px] font-black tracking-tight text-stone-900 leading-tight mt-1">
            Welcome back, <span className="text-wa-green">{firstName}</span>
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">Here&apos;s what&apos;s happening across your workspace.</p>
        </div>

        {fbConnected ? (
          <div className="flex items-center gap-2 bg-wa-green/10 border border-wa-green/25 rounded-full px-3.5 py-2 text-wa-green-dark">
            <span className="w-1.5 h-1.5 rounded-full bg-wa-green-light animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">WhatsApp Active</span>
          </div>
        ) : (
          <button
            onClick={() => onNavigate?.("settings")}
            className="flex items-center gap-2 bg-stone-900 hover:bg-wa-green-dark text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-full transition-colors cursor-pointer"
          >
            <Wifi className="w-4 h-4" />
            Connect WhatsApp
          </button>
        )}
      </motion.div>

      {/* ── Setup Checklist (first-time / incomplete workspaces) ── */}
      {organization && (
        <ChecklistWizard
          organizationId={organization.id}
          fbConnected={fbConnected}
          templatesApproved={templates.some((t) => t.metaStatus === "approved")}
          contactsImported={totalContacts > 0}
          campaignSent={totalCampaigns > 0}
          onNavigate={onNavigate}
          onImportClick={() => setIsCSVModalOpen(true)}
          dismissOnboarding={dismissOnboarding}
          showChecklist={!organization.onboardingDismissed}
          businessVertical={businessVertical}
        />
      )}

      {/* ── Needs Attention ── */}
      <AttentionStrip items={attentionItems} />

      {/* ── Hero metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <HeroStat
          label="Contacts"
          value={totalContacts.toLocaleString()}
          icon={Users}
          accent="#128c7e"
          cardBg="linear-gradient(135deg, #f0fdf9 0%, #ffffff 65%)"
          context={totalContacts > 0 ? `${totalContacts} in your CRM` : "Start importing"}
          hint={totalContacts === 0 ? "Import contacts" : undefined}
          onClick={() => onNavigate?.("customers")}
          delay={0.02}
        />
        <HeroStat
          label="Messages Sent"
          value={totalMessages.toLocaleString()}
          icon={Zap}
          accent="#2563eb"
          cardBg="linear-gradient(135deg, #eff6ff 0%, #ffffff 65%)"
          context={totalCampaigns > 0 ? `${totalCampaigns} campaign${totalCampaigns === 1 ? "" : "s"} run` : "No campaigns yet"}
          hint={totalMessages === 0 ? "Send a broadcast" : undefined}
          onClick={() => onNavigate?.("campaigns")}
          delay={0.06}
        />
        <HeroStat
          label="Avg Read Rate"
          value={`${avgReadRate}%`}
          icon={TrendingUp}
          accent="#059669"
          cardBg="linear-gradient(135deg, #ecfdf5 0%, #ffffff 65%)"
          context={avgReadRate > 0 ? "Great engagement!" : totalCampaigns > 0 ? "Tracking engagement" : "Run a campaign first"}
          hint={totalCampaigns === 0 ? "Launch a campaign" : undefined}
          onClick={() => onNavigate?.("campaigns")}
          delay={0.1}
        />
        <HeroStat
          label="Wallet Balance"
          value={`₹${walletBalance.toLocaleString()}`}
          icon={Wallet}
          accent="#d97706"
          cardBg="linear-gradient(135deg, #fffbeb 0%, #ffffff 65%)"
          context={walletBalance > 500 ? "Looking healthy 💪" : walletBalance > 100 ? "Running low" : "Top up soon!"}
          hint={walletBalance < 100 ? "Top up balance" : undefined}
          onClick={() => onNavigate?.("settings")}
          delay={0.14}
        />
      </div>

      {/* ── Templates + Automations mini stat cards ── */}
      {(templates.length > 0 || (totalAutomations !== null && totalAutomations > 0)) && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">

          {/* Templates card */}
          <motion.button
            {...fadeUp}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
            onClick={() => onNavigate?.("templates")}
            className="group border border-stone-300 shadow-sm rounded-2xl px-4 py-3.5 text-left hover:border-wa-green hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, #f0fdf9 0%, #ffffff 65%)" }}
          >
            <div className="w-8 h-8 rounded-xl bg-white/80 group-hover:bg-wa-green/10 flex items-center justify-center transition-colors shrink-0 border border-stone-200">
              <FileText className="w-4 h-4 text-stone-500 group-hover:text-wa-green transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg font-black text-stone-900 leading-none">{templates.length}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Templates</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {approvedTemplates > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                    {approvedTemplates} Approved
                  </span>
                )}
                {pendingTemplates > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                    {pendingTemplates} Pending
                  </span>
                )}
                {rejectedTemplates > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
                    {rejectedTemplates} Rejected
                  </span>
                )}
                {approvedTemplates === 0 && pendingTemplates === 0 && rejectedTemplates === 0 && (
                  <span className="text-[10px] text-stone-400">No templates yet</span>
                )}
              </div>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-wa-green group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </motion.button>

          {/* Automations card */}
          <motion.button
            {...fadeUp}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.22 }}
            onClick={() => onNavigate?.("recipes")}
            className="group border border-stone-300 shadow-sm rounded-2xl px-4 py-3.5 text-left hover:border-wa-green hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #ffffff 65%)" }}
          >
            <div className="w-8 h-8 rounded-xl bg-white/80 group-hover:bg-wa-green/10 flex items-center justify-center transition-colors shrink-0 border border-stone-200">
              <Zap className="w-4 h-4 text-stone-500 group-hover:text-wa-green transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg font-black text-stone-900 leading-none">
                  {activeAutomations ?? "—"}
                  {totalAutomations !== null && totalAutomations > 0 && (
                    <span className="text-sm font-bold text-stone-400"> / {totalAutomations}</span>
                  )}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Automations</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {activeAutomations !== null && activeAutomations > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                    {activeAutomations} Running
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-500 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-stone-300 shrink-0" />
                    None active
                  </span>
                )}
              </div>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-wa-green group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </motion.button>

        </div>
      )}

      </div>{/* end hero band */}

      {/* ── Rest of dashboard ── */}
      <div className="px-4 sm:px-6 space-y-5 pt-5">

      {/* ── AI Command Bar — navigates to dedicated AI Workspace ── */}
      <CommandBar
        value={input}
        onChange={setInput}
        onFocus={() => {}}
        onSubmit={() => {
          router.push(buildWorkspaceUrl(pathname, input));
          setInput("");
        }}
      />

      {/* ── Live Campaigns + Today ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2">
          <LiveCampaignsCard campaigns={liveCampaigns} onNavigate={onNavigate} delay={0.04} />
        </div>

        <div className="lg:col-span-1 flex flex-col gap-4">
          {businessVertical === "APPOINTMENT" && (
            <motion.div {...fadeUp} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.08 }} className="bg-white border border-stone-300 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-violet-500" />
                  <h3 className="kc-label text-stone-400">Today&apos;s Schedule</h3>
                </div>
                <div className="flex items-center gap-2">
                  {todayBookingsAll !== null && todayBookingsAll.length > 0 && (
                    <span className="kc-figure text-xs font-black text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                      {todayBookingsAll.length} appt{todayBookingsAll.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-stone-300">
                    {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>

              {todayBookingsAll === null ? (
                <div className="flex items-center gap-2 text-stone-400 text-xs py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                </div>
              ) : todayBookingsAll.length === 0 ? (
                /* Empty today — show next upcoming instead */
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-stone-400">No appointments today.</p>
                  {nextUpcomingBooking ? (
                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-violet-500 mb-1">Next up</p>
                      <p className="text-sm font-bold text-stone-800 truncate">{nextUpcomingBooking.bookingForName}</p>
                      <p className="text-xs text-stone-500 truncate">{nextUpcomingBooking.serviceName}</p>
                      <p className="text-xs font-semibold text-violet-600 mt-1">
                        {new Date(nextUpcomingBooking.startTime).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                        {" · "}
                        {new Date(nextUpcomingBooking.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400">No upcoming appointments either. 🗓️</p>
                  )}
                  <p className="text-[10px] text-stone-300 font-semibold">{allBookings?.length ?? 0} total bookings all time</p>
                </div>
              ) : (
                /* Today has appointments */
                <div className="flex flex-col gap-3">
                  {/* Summary row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-stone-50 rounded-lg p-2 text-center">
                      <p className="kc-figure text-lg font-black text-stone-900">{todayBookingsAll.filter(b => b.status === "booked").length}</p>
                      <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mt-0.5">Upcoming</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2 text-center">
                      <p className="kc-figure text-lg font-black text-emerald-700">{todayBookingsAll.filter(b => b.status === "completed").length}</p>
                      <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">Done</p>
                    </div>
                    <div className="bg-violet-50 rounded-lg p-2 text-center">
                      <p className="kc-figure text-lg font-black text-violet-700">
                        {todayRevenueRs > 0 ? `₹${todayRevenueRs >= 1000 ? `${Math.round(todayRevenueRs / 1000)}k` : todayRevenueRs}` : todayBookingsAll.length}
                      </p>
                      <p className="text-[9px] font-bold text-violet-400 uppercase tracking-wider mt-0.5">
                        {todayRevenueRs > 0 ? "Revenue" : "Total"}
                      </p>
                    </div>
                  </div>

                  {/* Appointment list */}
                  <div className="space-y-1.5">
                    {todayBookingsAll.slice(0, 4).map((b) => {
                      const statusDot: Record<string, string> = {
                        booked: "bg-blue-400",
                        completed: "bg-emerald-400",
                        no_show: "bg-red-400",
                        cancelled: "bg-stone-300",
                      };
                      return (
                        <div key={b.id} className="flex items-center gap-2 text-xs py-1 border-b border-stone-50 last:border-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[b.status] ?? "bg-stone-300"}`} />
                          <span className="font-semibold text-stone-700 truncate flex-1">{b.bookingForName}</span>
                          <span className="text-stone-400 shrink-0">
                            {new Date(b.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                      );
                    })}
                    {todayBookingsAll.length > 4 && (
                      <p className="text-[10px] text-stone-400 font-semibold pt-1">+{todayBookingsAll.length - 4} more</p>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => onNavigate?.("bookingcustomers")}
                className="mt-auto kc-label text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-1 cursor-pointer"
              >
                View Schedule <ArrowUpRight className="w-3 h-3" />
              </button>
            </motion.div>
          )}

          {businessVertical === "ECOMMERCE" && (
            <motion.div {...fadeUp} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.08 }} className="bg-white border border-stone-300 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-500" />
                  <h3 className="kc-label text-stone-400">Sales Overview</h3>
                </div>
                {todayOrdersCount > 0 && (
                  <span className="kc-figure text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    {todayOrdersCount} today
                  </span>
                )}
              </div>

              {/* Order stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-stone-50 rounded-xl p-3">
                  <p className="kc-figure text-2xl font-black text-stone-900">{todayOrdersCount}</p>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mt-0.5">Today</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="kc-figure text-2xl font-black text-amber-700">{orders.length}</p>
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mt-0.5">All time</p>
                </div>
              </div>

              {/* Feature callouts */}
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-emerald-800">Cart Recovery</p>
                    <p className="text-[10px] text-emerald-600">Recover abandoned carts via WhatsApp sequences</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                  <Megaphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-blue-800">Reduce RTO</p>
                    <p className="text-[10px] text-blue-600">Re-confirm COD orders before dispatch</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigate?.("marketplace")}
                className="mt-auto kc-label text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-1 cursor-pointer"
              >
                View Marketplace <ArrowUpRight className="w-3 h-3" />
              </button>
            </motion.div>
          )}

          {businessVertical === "GENERAL" && (
            <motion.div {...fadeUp} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.08 }} className="bg-white border border-stone-300 shadow-sm rounded-2xl p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-stone-500" />
                <h3 className="kc-label text-stone-400">Chatbot Status</h3>
              </div>
              {organization?.chatbotBuilderEnabled ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-700">Active</span>
                  </div>
                  <p className="kc-figure text-2xl font-bold text-stone-900 mb-1">{chatbotNodes.length}</p>
                  <p className="text-xs text-stone-400 mb-3">nodes configured</p>
                </>
              ) : (
                <p className="text-sm text-stone-400 py-2 mb-3">Chatbot is off — enable it to automate replies.</p>
              )}
              <button
                onClick={() => onNavigate?.("chatbot")}
                className="mt-auto kc-label text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {organization?.chatbotBuilderEnabled ? "Open Builder" : "Enable Chatbot"} <ArrowUpRight className="w-3 h-3" />
              </button>
            </motion.div>
          )}

        </div>
      </div>

      {/* ── Quick Actions & Activity ── */}
      <div>
        <SectionHeader
          title="Quick Actions & Activity"
          sectionId="actions_activity"
          collapsed={!!collapsedSections["actions_activity"]}
          onToggle={toggleSection}
        />
        {!collapsedSections["actions_activity"] && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <h3 className="kc-label text-stone-400 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {quickActions.map(({ label, desc, icon: Icon, action, gradient, glow }) => (
                  <motion.button
                    key={label}
                    onClick={action}
                    whileHover={{ y: -3, boxShadow: `0 14px 32px ${glow}, 0 4px 10px rgba(0,0,0,0.07)`, transition: { type: "spring", stiffness: 450, damping: 15 } }}
                    whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 500, damping: 20 } }}
                    className="relative overflow-hidden text-left flex flex-col p-4 rounded-2xl cursor-pointer"
                    style={{ background: gradient, boxShadow: `0 8px 20px ${glow}, 0 2px 6px rgba(0,0,0,0.06)` }}
                  >
                    {/* Background orb */}
                    <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white pointer-events-none" style={{ opacity: 0.07 }} />

                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-3 relative z-10">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[13px] font-bold text-white leading-tight relative z-10">{label}</span>
                    <span className="text-[10px] text-white/60 mt-0.5 relative z-10 font-medium">{desc}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 bg-white border border-stone-300 shadow-sm rounded-2xl p-5">
              <h3 className="kc-label text-stone-400 mb-4">Recent Activity</h3>
              {recentLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <Zap className="w-8 h-8 text-stone-200 mb-2" />
                  <p className="text-sm text-stone-400">Nothing yet — your actions will show up here.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentLogs.map((log) => {
                    const badgeStyle: Record<string, string> = {
                      campaign: "bg-amber-50 text-amber-700 border-amber-200",
                      crm:      "bg-blue-50 text-blue-700 border-blue-200",
                      chat:     "bg-emerald-50 text-emerald-700 border-emerald-200",
                      template: "bg-violet-50 text-violet-700 border-violet-200",
                    };
                    const cls = badgeStyle[log.type] ?? "bg-stone-100 text-stone-500 border-stone-200";
                    return (
                      <div key={log.id} className="flex items-center gap-2.5 py-1 border-b border-stone-50 last:border-0">
                        <span className="text-[10px] text-slate-500 shrink-0 font-mono w-10 tabular-nums">{log.timestamp}</span>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border shrink-0 ${cls}`}>
                          {log.type}
                        </span>
                        <p className="text-xs text-stone-600 flex-1 truncate">{humanizeLog(log.message)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      </div>{/* end rest of dashboard */}

      {/* Modals */}
      {organization && (
        <>
          <CSVImporterModal
            orgId={organization.id}
            isOpen={isCSVModalOpen}
            onClose={() => setIsCSVModalOpen(false)}
            onSuccess={() => refreshWorkspace(organization.id)}
          />
          <MetaBillingModal
            isOpen={isBillingModalOpen}
            onClose={() => setIsBillingModalOpen(false)}
            organizationId={organization.id}
          />
        </>
      )}
    </div>
  );
};
