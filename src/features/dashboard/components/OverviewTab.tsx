"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Users,
  Send,
  FileText,
  Zap,
  Wifi,
  WifiOff,
  Bot,
  CheckCircle2,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  MessageCircle,
  RotateCcw,
  X,
  Tag,
  Calendar,
  Eye,
  Mic,
  Play,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/shared/context/AppContext";
import { useParams } from "next/navigation";
import { CSVImporterModal } from "@/features/inbox/components/CSVImporterModal";
import { MetaBillingModal } from "@/features/wallet/components/MetaBillingModal";
import { RecipesSection } from "@/features/recipes/components/RecipesSection";
import type { CampaignStrategy } from "@/features/ai/services/campaignStrategistService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QualifierQuestion {
  id: string;
  text: string;
  options: string[];
  disqualifyOn?: string[];
}

interface QualifierConfig {
  triggerKeyword: string;
  qualifiedTag: string;
  disqualifiedTag: string;
  questions: QualifierQuestion[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  isAction?: boolean;
  action?: "campaign" | "automation" | "chatbot" | "template";
  summary?: string;
  isLoading?: boolean;
  strategyReady?: CampaignStrategy;
}

type RightPanelMode =
  | "stats"
  | "campaign-loading"
  | "campaign-preview"
  | "automation"
  | "chatbot"
  | "template";

interface OverviewTabProps {
  onNavigate?: (tab: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_GREETING: ChatMessage = {
  id: "init",
  role: "assistant",
  content:
    "Hey! 👋 What do you want to do today? Tell me your goal and I'll take care of the rest.",
  suggestions: [
    "Send a campaign blast",
    "Set up an automation",
    "Build a chatbot",
    "Create a template",
  ],
};

const chipColors = [
  "bg-amber-400/20 border-amber-400/50 text-amber-300 hover:bg-amber-400/30",
  "bg-emerald-400/20 border-emerald-400/50 text-emerald-300 hover:bg-emerald-400/30",
  "bg-violet-400/20 border-violet-400/50 text-violet-300 hover:bg-violet-400/30",
  "bg-rose-400/20 border-rose-400/50 text-rose-300 hover:bg-rose-400/30",
  "bg-sky-400/20 border-sky-400/50 text-sky-300 hover:bg-sky-400/30",
];

const actionColors: Record<string, string> = {
  campaign: "bg-amber-500/20 border-amber-500/40 text-amber-200",
  automation: "bg-emerald-500/20 border-emerald-500/40 text-emerald-200",
  chatbot: "bg-violet-500/20 border-violet-500/40 text-violet-200",
  template: "bg-sky-500/20 border-sky-500/40 text-sky-200",
};

const actionIcons: Record<string, React.ElementType> = {
  campaign: Send,
  automation: Zap,
  chatbot: Bot,
  template: FileText,
};

const actionLabels: Record<string, string> = {
  campaign: "Campaign",
  automation: "Automation",
  chatbot: "Chatbot Flow",
  template: "Template",
};

function toDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

function delayLabel(mins: number): string {
  if (mins < 60) return `+${mins}m`;
  if (mins < 1440) return `+${Math.round(mins / 60)}h`;
  return `Day ${Math.round(mins / 1440)}`;
}

// ─── Shared mini-components ───────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  sectionId: string;
  collapsed: boolean;
  onToggle: (id: string) => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  sectionId,
  collapsed,
  onToggle,
}) => (
  <div className="flex items-center justify-between mb-3 border-b border-stone-200 pb-1.5 select-none">
    <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
      {title}
    </h3>
    <button
      onClick={() => onToggle(sectionId)}
      className="text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1 cursor-pointer"
    >
      {collapsed ? (
        <>Expand <ChevronDown className="w-3 h-3" /></>
      ) : (
        <>Collapse <ChevronUp className="w-3 h-3" /></>
      )}
    </button>
  </div>
);

const PillToggle: React.FC<{ on: boolean; onToggle: () => void; color?: "emerald" | "amber" }> = ({
  on,
  onToggle,
  color = "emerald",
}) => {
  const onColor = color === "amber" ? "bg-amber-500 border-amber-500" : "bg-emerald-500 border-emerald-500";
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ${on ? onColor : "bg-stone-200 border-stone-200"}`}
    >
      <span
        className={`inline-block h-3 w-3 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${on ? "translate-x-4" : "translate-x-0.5"}`}
      />
    </button>
  );
};

const PhoneMockup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-48 mx-auto border-2 border-stone-800 relative bg-white pt-6 pb-4">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-3.5 bg-stone-800" />
    <div className="bg-[#075e54] text-white px-3 py-1.5 flex items-center gap-2">
      <div className="w-5 h-5 bg-[#25d366] shrink-0" />
      <span className="text-[11px] font-bold truncate">LeapCreww</span>
    </div>
    <div className="bg-[#e5ddd5] p-2.5 min-h-[160px] space-y-2">{children}</div>
  </div>
);

const OutboundBubble: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex justify-end">
    <div className="bg-[#dcf8c6] px-2 py-1.5 max-w-[85%]">
      <p className="text-[10px] text-stone-800 leading-relaxed">{text}</p>
    </div>
  </div>
);

const InboundBubble: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex justify-start">
    <div className="bg-white px-2 py-1.5 max-w-[85%] border border-stone-100">
      <p className="text-[10px] text-stone-800 leading-relaxed">{text}</p>
    </div>
  </div>
);

// ─── RIGHT PANEL MODES ────────────────────────────────────────────────────────

interface StatsPanelProps {
  totalContacts: number;
  totalCampaigns: number;
  totalMessages: number;
  templateCount: number;
  onNavigate?: (tab: string) => void;
}

const StatsPanel: React.FC<StatsPanelProps> = ({
  totalContacts,
  totalCampaigns,
  totalMessages,
  templateCount,
  onNavigate,
}) => {
  const cards = [
    { label: "Contacts", value: totalContacts, icon: Users, gradient: "from-blue-500 to-indigo-500", border: "border-t-blue-500", tab: "customers" },
    { label: "Campaigns", value: totalCampaigns, icon: Send, gradient: "from-orange-500 to-amber-500", border: "border-t-orange-500", tab: "campaigns" },
    { label: "Messages Sent", value: totalMessages, icon: Zap, gradient: "from-emerald-500 to-teal-500", border: "border-t-emerald-500", tab: "campaigns" },
    { label: "Templates", value: templateCount, icon: FileText, gradient: "from-violet-500 to-purple-500", border: "border-t-violet-500", tab: "templates" },
  ];

  return (
    <div className="p-5 flex flex-col">
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ label, value, icon: Icon, gradient, border, tab }) => (
          <button
            key={label}
            onClick={() => onNavigate?.(tab)}
            className={`bg-white border border-stone-200 border-t-4 ${border} p-4 text-left cursor-pointer hover:shadow-sm transition-all group relative`}
          >
            <ArrowUpRight className="w-3 h-3 text-stone-300 absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl font-black text-stone-900 tracking-tight">{value.toLocaleString()}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mt-0.5">{label}</div>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider text-center mt-4">
        Ask the AI anything to get started →
      </p>
    </div>
  );
};

const CampaignLoadingPanel: React.FC = () => (
  <div className="p-5 flex flex-col items-center justify-center h-full gap-5">
    <h3 className="text-stone-900 font-black text-sm tracking-tight">Building your campaign…</h3>
    <PhoneMockup>
      <div className="animate-pulse space-y-2">
        <div className="bg-stone-300 h-2.5 w-28 ml-auto" />
        <div className="bg-stone-300 h-2.5 w-20 ml-auto" />
        <div className="bg-stone-300 h-2.5 w-24 ml-auto" />
      </div>
    </PhoneMockup>
    {["Analysing your contacts…", "Selecting best template…", "Building follow-up sequence…"].map(
      (step, i) => (
        <div key={step} className="flex items-center gap-2 text-[11px] text-stone-500 w-full max-w-[220px]" style={{ animationDelay: `${i * 400}ms` }}>
          <Loader2 className="w-3 h-3 text-stone-400 animate-spin shrink-0" />
          {step}
        </div>
      )
    )}
  </div>
);

// ── Campaign Preview / Editor Panel ───────────────────────────────────────────

interface DbSegment { id: string; name: string; rules: unknown; }

interface CampaignPreviewPanelProps {
  strategy: CampaignStrategy;
  orgId: string;
  sequenceEnabled: boolean;
  onSequenceEnabledChange: (v: boolean) => void;
  sequenceSteps: string[];
  onSequenceStepsChange: (steps: string[]) => void;
  qualifierEnabled: boolean;
  onQualifierEnabledChange: () => void;
  qualifier: QualifierConfig | null;
  onQualifierQuestionsChange: (qs: QualifierQuestion[]) => void;
  isGeneratingQualifier: boolean;
  qualifierError: string | null;
  onRetryQualifier: () => void;
  availableTags: string[];
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  selectedSegmentId: string | null;
  onSelectedSegmentChange: (seg: DbSegment | null) => void;
  scheduledAt: string;
  onScheduledAtChange: (v: string) => void;
  onLaunch: () => void;
  isLaunching: boolean;
  onPreviewFlow: () => void;
}

const CampaignPreviewPanel: React.FC<CampaignPreviewPanelProps> = ({
  strategy, orgId,
  sequenceEnabled, onSequenceEnabledChange,
  sequenceSteps, onSequenceStepsChange,
  qualifierEnabled, onQualifierEnabledChange,
  qualifier, onQualifierQuestionsChange,
  isGeneratingQualifier, qualifierError, onRetryQualifier,
  availableTags, selectedTags, onSelectedTagsChange,
  selectedSegmentId, onSelectedSegmentChange,
  scheduledAt, onScheduledAtChange,
  onLaunch, isLaunching, onPreviewFlow,
}) => {
  const [audienceTab, setAudienceTab] = useState<"tag" | "segment">("tag");
  const [segments, setSegments] = useState<DbSegment[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [newSegName, setNewSegName] = useState("");
  const [creatingSegment, setCreatingSegment] = useState(false);
  const [showNewSeg, setShowNewSeg] = useState(false);

  useEffect(() => {
    if (audienceTab !== "segment" || !orgId) return;
    setSegmentsLoading(true);
    fetch(`/api/org/${orgId}/segments`)
      .then((r) => r.json())
      .then((d) => setSegments(d.segments ?? []))
      .catch(() => {})
      .finally(() => setSegmentsLoading(false));
  }, [audienceTab, orgId]);

  const handleCreateSegment = async () => {
    if (!newSegName.trim() || !orgId) return;
    setCreatingSegment(true);
    try {
      const rules = selectedTags.length > 0
        ? { all: [{ field: "tags", op: "in", value: selectedTags.join(",") }] }
        : { all: [] };
      const res = await fetch(`/api/org/${orgId}/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSegName.trim(), rules, organizationId: orgId }),
      });
      const d = await res.json();
      if (d.segment) {
        const created = d.segment as DbSegment;
        setSegments((prev) => [created, ...prev]);
        onSelectedSegmentChange(created);
        setNewSegName("");
        setShowNewSeg(false);
      }
    } catch { /* silent */ } finally {
      setCreatingSegment(false);
    }
  };
  const delayBadge = (mins: number) => {
    if (mins < 60) return `+${mins}m`;
    if (mins < 1440) return `+${Math.round(mins / 60)}h`;
    return `Day ${Math.round(mins / 1440)}`;
  };

  return (
    <div className="flex flex-col min-h-0 flex-1">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2.5 border-b border-stone-100 flex items-center justify-between shrink-0 bg-white">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Campaign Ready</p>
          <p className="text-sm font-black text-stone-900 mt-0.5 font-mono truncate max-w-[200px]">{strategy.template.name}</p>
        </div>
        {strategy.templateExists
          ? <span className="text-[9px] font-black bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 uppercase shrink-0">Approved</span>
          : <span className="text-[9px] font-black bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 uppercase shrink-0">Pending Meta</span>
        }
      </div>

      {/* ── Preview link ─────────────────────────────────────── */}
      <div className="px-5 py-2.5 border-b border-stone-100 shrink-0 flex items-center justify-between bg-[#fafaf9]">
        <span className="text-[10px] text-stone-500 font-mono truncate max-w-[200px]">{strategy.template.body.replace(/\{\{1\}\}/g, "[Name]").slice(0, 60)}{strategy.template.body.length > 60 ? "…" : ""}</span>
        <button onClick={onPreviewFlow} className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-400 hover:text-stone-800 transition-colors cursor-pointer shrink-0 ml-3">
          <Eye className="w-3.5 h-3.5" /> Preview
        </button>
      </div>

      {/* ── Scrollable editing sections ─────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-stone-100">

        {/* Follow-up Sequence */}
        <div className="px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-black text-stone-900 uppercase tracking-tight">Follow-up Messages</p>
              <p className="text-xs text-stone-500 mt-1">{strategy.sequence.steps.length} automated follow-ups after main blast</p>
            </div>
            <PillToggle on={sequenceEnabled} onToggle={() => onSequenceEnabledChange(!sequenceEnabled)} />
          </div>
          {sequenceEnabled ? (
            <div className="space-y-3">
              {strategy.sequence.steps.map((step, i) => (
                <div key={i} className="bg-stone-50 border border-stone-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black bg-stone-800 text-white px-2 py-0.5">{delayBadge(step.delayMinutes ?? 0)}</span>
                    <span className="text-[10px] text-stone-500 font-semibold">Step {i + 1}</span>
                  </div>
                  <textarea
                    value={sequenceSteps[i] ?? ""}
                    onChange={(e) => {
                      const updated = [...sequenceSteps];
                      updated[i] = e.target.value;
                      onSequenceStepsChange(updated);
                    }}
                    rows={2}
                    placeholder="Write your follow-up message…"
                    className="w-full text-xs text-stone-800 placeholder:text-stone-400 bg-white border border-stone-200 px-3 py-2 resize-none focus:outline-none focus:border-stone-500 transition-colors"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-400 italic">Disabled — only the main blast will send.</p>
          )}
        </div>

        {/* Lead Qualifier */}
        <div className="px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-black text-stone-900 uppercase tracking-tight">Lead Qualifier</p>
              <p className="text-xs text-stone-500 mt-1">Auto-qualify leads who tap Interested</p>
            </div>
            <PillToggle on={qualifierEnabled} onToggle={onQualifierEnabledChange} color="amber" />
          </div>
          {qualifierEnabled && (
            <>
              {isGeneratingQualifier && (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400" />
                  <span className="text-xs text-stone-500">Generating qualifying questions…</span>
                </div>
              )}
              {!isGeneratingQualifier && qualifierError && (
                <div className="bg-red-50 border border-red-200 px-3 py-2.5 flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-red-700">Generation failed</p>
                    <p className="text-[10px] text-red-600 mt-0.5">{qualifierError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onRetryQualifier}
                    className="text-[10px] font-black bg-stone-900 text-white px-2.5 py-1.5 hover:bg-stone-700 transition-colors cursor-pointer shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!isGeneratingQualifier && !qualifierError && !qualifier && (
                <p className="text-xs text-stone-400">No questions yet — try toggling off and on.</p>
              )}
              {!isGeneratingQualifier && qualifier && qualifier.questions.length > 0 && (
                <div className="space-y-2.5">
                  {qualifier.questions.map((q, qi) => (
                    <div key={q.id} className="bg-stone-50 border border-stone-200 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-[9px] font-black bg-amber-500 text-white w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">{qi + 1}</span>
                        <input
                          type="text"
                          value={q.text}
                          onChange={(e) => {
                            const updated = qualifier.questions.map((qq, i) =>
                              i === qi ? { ...qq, text: e.target.value } : qq
                            );
                            onQualifierQuestionsChange(updated);
                          }}
                          className="flex-1 text-xs font-semibold text-stone-800 bg-transparent border-b border-stone-200 hover:border-stone-400 focus:border-amber-500 focus:outline-none pb-0.5 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => onQualifierQuestionsChange(qualifier.questions.filter((_, i) => i !== qi))}
                          className="text-stone-300 hover:text-red-400 transition-colors cursor-pointer shrink-0 mt-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-7">
                        {q.options.map((opt, oi) => (
                          <span
                            key={oi}
                            className={`text-[10px] font-medium px-2 py-0.5 border ${(q.disqualifyOn ?? []).includes(opt) ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-stone-200 text-stone-600"}`}
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {!qualifierEnabled && (
            <p className="text-xs text-stone-400 italic">Toggle on to auto-qualify leads after they reply.</p>
          )}
        </div>

        {/* Audience */}
        <div className="px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-black text-stone-900 uppercase tracking-tight">Audience</p>
              <p className="text-xs text-stone-500 mt-0.5">Who receives this campaign</p>
            </div>
            {/* Mode tabs */}
            <div className="flex bg-stone-100 p-0.5 gap-0 shrink-0">
              <button onClick={() => { setAudienceTab("tag"); onSelectedSegmentChange(null); }} className={`px-3 py-1 text-[10px] font-black uppercase tracking-wide transition-colors cursor-pointer ${audienceTab === "tag" ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-800"}`}>Tags</button>
              <button onClick={() => setAudienceTab("segment")} className={`px-3 py-1 text-[10px] font-black uppercase tracking-wide transition-colors cursor-pointer ${audienceTab === "segment" ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-800"}`}>Segments</button>
            </div>
          </div>

          {audienceTab === "tag" && (
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => onSelectedTagsChange([])} className={`text-xs font-bold px-3 py-1.5 border transition-colors cursor-pointer ${selectedTags.length === 0 ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}>
                All Contacts
              </button>
              {availableTags.map((tag) => (
                <button key={tag} onClick={() => { const s = selectedTags.includes(tag); onSelectedTagsChange(s ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag]); }} className={`text-xs font-bold px-3 py-1.5 border transition-colors cursor-pointer ${selectedTags.includes(tag) ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}>
                  {tag}
                </button>
              ))}
              {availableTags.length === 0 && <span className="text-xs text-stone-400 italic">No CRM tags — will reach all contacts.</span>}
            </div>
          )}

          {audienceTab === "segment" && (
            <div className="space-y-1.5">
              {segmentsLoading && <p className="text-xs text-stone-400 italic">Loading segments…</p>}
              {!segmentsLoading && segments.length === 0 && !showNewSeg && (
                <p className="text-xs text-stone-400 italic">No segments yet.</p>
              )}
              {!segmentsLoading && segments.map((seg) => (
                <button key={seg.id} onClick={() => onSelectedSegmentChange(selectedSegmentId === seg.id ? null : seg)} className={`w-full text-left px-3 py-2.5 border text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${selectedSegmentId === seg.id ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"}`}>
                  <span>{seg.name}</span>
                  {selectedSegmentId === seg.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}

              {/* Inline create */}
              {showNewSeg ? (
                <div className="border border-stone-300 bg-stone-50 p-3 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-stone-500">New Segment</p>
                  <input
                    type="text"
                    placeholder="Segment name…"
                    value={newSegName}
                    onChange={(e) => setNewSegName(e.target.value)}
                    className="w-full text-xs border border-stone-200 px-2.5 py-1.5 focus:outline-none focus:border-stone-500 bg-white"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateSegment()}
                    autoFocus
                  />
                  {availableTags.length > 0 && (
                    <div>
                      <p className="text-[9px] text-stone-400 uppercase font-bold mb-1">Filter by tag (optional)</p>
                      <div className="flex flex-wrap gap-1">
                        {availableTags.map((tag) => (
                          <button key={tag} onClick={() => { const s = selectedTags.includes(tag); onSelectedTagsChange(s ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag]); }} className={`text-[10px] font-bold px-2 py-0.5 border transition-colors cursor-pointer ${selectedTags.includes(tag) ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"}`}>{tag}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleCreateSegment} disabled={!newSegName.trim() || creatingSegment} className="flex-1 bg-stone-900 text-white text-[10px] font-black uppercase py-1.5 px-3 disabled:opacity-40 cursor-pointer hover:bg-stone-700 transition-colors flex items-center justify-center gap-1">
                      {creatingSegment ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}
                    </button>
                    <button onClick={() => { setShowNewSeg(false); setNewSegName(""); }} className="text-[10px] font-black uppercase text-stone-400 hover:text-stone-700 px-2 cursor-pointer">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNewSeg(true)} className="w-full text-left text-[11px] font-black uppercase tracking-wider text-stone-400 hover:text-stone-700 transition-colors cursor-pointer pt-1 flex items-center gap-1.5">
                  <span className="text-base leading-none">+</span> New Segment
                </button>
              )}
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="px-5 py-5">
          <p className="text-sm font-black text-stone-900 uppercase tracking-tight mb-1">Launch Date &amp; Time</p>
          <p className="text-xs text-stone-500 mt-1 mb-3">Schedule when the first message sends</p>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => onScheduledAtChange(e.target.value)}
            className="w-full text-sm text-stone-800 bg-white border border-stone-200 px-3 py-2.5 focus:outline-none focus:border-stone-500 transition-colors"
          />
          {!scheduledAt && (
            <p className="text-[10px] text-stone-400 mt-1.5">Leave empty to send immediately after launch.</p>
          )}
        </div>

      </div>

      {/* ── Sticky footer ──────────────────────────────────────── */}
      <div className="px-5 py-4 border-t border-stone-200 bg-white shrink-0 flex gap-3">
        <button
          onClick={onPreviewFlow}
          className="flex items-center gap-2 px-4 py-3 border border-stone-300 text-stone-700 font-black text-xs uppercase tracking-wider hover:border-stone-500 hover:text-stone-900 transition-colors cursor-pointer shrink-0"
        >
          <Eye className="w-3.5 h-3.5" /> Preview
        </button>
        <button
          onClick={onPreviewFlow}
          disabled={isLaunching}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider py-3 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {isLaunching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <><Send className="w-4 h-4" /> Review &amp; Launch</>
          )}
        </button>
      </div>
    </div>
  );
};

// ── Campaign Flow Simulator Modal ────────────────────────────────────────────

type SimMsg =
  | { id: number; dir: "out"; kind: "template"; body: string; buttons: string[] }
  | { id: number; dir: "out"; kind: "question"; text: string; options: string[]; disqualifyOn: string[] }
  | { id: number; dir: "out"; kind: "text"; text: string }
  | { id: number; dir: "in"; kind: "text"; text: string };

interface SimulatorModalProps {
  strategy: CampaignStrategy;
  qualifier: QualifierConfig | null;
  qualifierEnabled: boolean;
  sequenceSteps: string[];
  sequenceEnabled: boolean;
  isLaunching: boolean;
  onClose: () => void;
  onLaunch: () => void;
}

let simMsgId = 0;

const SimulatorModal: React.FC<SimulatorModalProps> = ({
  strategy, qualifier, qualifierEnabled, sequenceSteps, sequenceEnabled, isLaunching, onClose, onLaunch,
}) => {
  const [msgs, setMsgs] = useState<SimMsg[]>([]);
  const [typingDir, setTypingDir] = useState<"in" | "out" | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildScript = useCallback(() => {
    type Step = { type: string; delay: number; [k: string]: unknown };
    const s: Step[] = [];
    const rawButtons = strategy.template.buttons ?? [];
    const simButtons = rawButtons.length > 0
      ? rawButtons
      : qualifierEnabled && qualifier
        ? [(qualifier.triggerKeyword || "Interested").replace(/^\w/, (c) => c.toUpperCase()), "Not Interested"]
        : [];
    s.push({ type: "out-template", body: strategy.template.body, buttons: simButtons, delay: 700 });
    if (qualifierEnabled && qualifier && qualifier.questions.length > 0) {
      s.push({ type: "typing-in", delay: 1600 });
      s.push({ type: "in", text: qualifier.triggerKeyword || "Interested", delay: 1100 });
      for (const q of qualifier.questions) {
        s.push({ type: "typing-out", delay: 800 });
        s.push({ type: "out-question", text: q.text, options: q.options, disqualifyOn: q.disqualifyOn ?? [], delay: 950 });
        const answer = q.options.find((o) => !(q.disqualifyOn ?? []).includes(o)) ?? q.options[0] ?? "Yes";
        s.push({ type: "typing-in", delay: 1400 });
        s.push({ type: "in", text: answer, delay: 750 });
      }
      s.push({ type: "typing-out", delay: 700 });
      s.push({ type: "out", text: `Great! You've been added to our qualified leads 🎉 We'll be in touch soon.`, delay: 1100 });
    }
    if (sequenceEnabled && sequenceSteps[0]) {
      const delayMins = strategy.sequence.steps[0]?.delayMinutes ?? 5;
      const label = delayMins >= 1440 ? `Day ${Math.round(delayMins / 1440)}` : `+${delayMins}m`;
      s.push({ type: "in", text: `⏱ ${label} later…`, delay: 900 });
      s.push({ type: "typing-out", delay: 700 });
      s.push({ type: "out", text: sequenceSteps[0], delay: 950 });
    }
    s.push({ type: "reset", delay: 4000 });
    return s;
  }, [strategy, qualifier, qualifierEnabled, sequenceSteps, sequenceEnabled]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMsgs([]);
    setTypingDir(null);
    const script = buildScript();
    let i = 0;
    let cancelled = false;
    const runNext = () => {
      if (cancelled || i >= script.length) return;
      const step = script[i++];
      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        if (step.type === "out-template") {
          setTypingDir(null);
          setMsgs((prev) => [...prev, { id: ++simMsgId, dir: "out", kind: "template", body: step.body as string, buttons: step.buttons as string[] }]);
        } else if (step.type === "out-question") {
          setTypingDir(null);
          setMsgs((prev) => [...prev, { id: ++simMsgId, dir: "out", kind: "question", text: step.text as string, options: step.options as string[], disqualifyOn: step.disqualifyOn as string[] }]);
        } else if (step.type === "out") {
          setTypingDir(null);
          setMsgs((prev) => [...prev, { id: ++simMsgId, dir: "out", kind: "text", text: step.text as string }]);
        } else if (step.type === "in") {
          setTypingDir(null);
          setMsgs((prev) => [...prev, { id: ++simMsgId, dir: "in", kind: "text", text: step.text as string }]);
        } else if (step.type === "typing-in") {
          setTypingDir("in");
        } else if (step.type === "typing-out") {
          setTypingDir("out");
        } else if (step.type === "reset") {
          setMsgs([]); setTypingDir(null); i = 0;
        }
        runNext();
      }, step.delay as number);
    };
    runNext();
    return () => { cancelled = true; if (timerRef.current) clearTimeout(timerRef.current); };
  }, [sessionKey, buildScript]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typingDir]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-[390px] flex flex-col overflow-hidden max-h-[92vh] shadow-2xl" style={{ background: "#0B141A", border: "2px solid #2A3942" }}>

        {/* WA-style top bar */}
        <div className="flex items-center gap-3 px-3 py-2.5 shrink-0" style={{ background: "#1F2C34" }}>
          <button onClick={onClose} className="text-white/60 hover:text-white/90 transition-colors cursor-pointer -ml-1 p-1">
            <X className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">LC</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-none">LeapCreww Business</p>
            <p className="text-emerald-400 text-[10px] mt-0.5">Campaign Flow Preview</p>
          </div>
          <button onClick={() => setSessionKey((k) => k + 1)} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-white/40 hover:text-white/80 transition-colors cursor-pointer shrink-0">
            <Play className="w-3 h-3" /> Replay
          </button>
        </div>

        {/* Chat */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-2 min-h-[380px]" style={{ background: "#0B141A" }}>
          <div className="flex justify-center py-1">
            <span className="text-[9px] font-mono text-white/25 bg-white/5 px-2 py-0.5 rounded-full tracking-widest">SIMULATION</span>
          </div>

          <AnimatePresence initial={false}>
            {msgs.map((msg) => {
              if (msg.dir === "out" && msg.kind === "template") {
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="flex justify-end">
                    <div className="max-w-[88%] overflow-hidden shadow-lg" style={{ background: "#005C4B", borderRadius: "8px 2px 8px 8px" }}>
                      <div className="px-3 py-2 flex items-center gap-2" style={{ background: "#004A3D" }}>
                        <div className="w-5 h-5 rounded-full bg-[#25d366] flex items-center justify-center text-white text-[8px] font-black shrink-0">LC</div>
                        <span className="text-[10px] font-bold text-white/90">LeapCreww Business</span>
                        <span className="text-[9px] text-emerald-300/60 ml-auto">✓ Verified</span>
                      </div>
                      <div className="px-3 pt-2.5 pb-1.5">
                        <p className="text-[13px] text-white/90 leading-relaxed">{msg.body}</p>
                      </div>
                      {msg.buttons.length > 0 && (
                        <div className="mx-0 border-t border-white/10 flex flex-col">
                          {msg.buttons.map((btn) => (
                            <div key={btn} className="text-center text-[12px] font-bold text-[#53BDEB] py-2 border-b border-white/8 last:border-b-0 bg-white/5">{btn}</div>
                          ))}
                        </div>
                      )}
                      <div className="px-3 pb-1.5 text-right"><span className="text-[9px] text-white/35">✓✓</span></div>
                    </div>
                  </motion.div>
                );
              }
              if (msg.dir === "out" && msg.kind === "question") {
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="flex justify-end">
                    <div className="max-w-[88%] shadow-lg" style={{ background: "#005C4B", borderRadius: "8px 2px 8px 8px" }}>
                      <div className="px-3 py-2.5 space-y-2">
                        <p className="text-[13px] text-white/90 leading-relaxed font-medium">{msg.text}</p>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {msg.options.map((opt) => (
                            <span key={opt} className={`text-[11px] px-2.5 py-1 font-medium ${msg.disqualifyOn.includes(opt) ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded" : "bg-white/10 text-[#53BDEB] border border-white/20 rounded"}`}>{opt}</span>
                          ))}
                        </div>
                      </div>
                      <div className="px-3 pb-1.5 text-right"><span className="text-[9px] text-white/35">✓✓</span></div>
                    </div>
                  </motion.div>
                );
              }
              if (msg.dir === "out" && msg.kind === "text") {
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8, x: 8 }} animate={{ opacity: 1, y: 0, x: 0 }} transition={{ duration: 0.2 }} className="flex justify-end">
                    <div className="px-3 py-2 max-w-[88%] shadow-md" style={{ background: "#005C4B", borderRadius: "8px 2px 8px 8px" }}>
                      <p className="text-[13px] text-white/90 leading-relaxed">{msg.text}</p>
                      <div className="text-right mt-0.5"><span className="text-[9px] text-white/35">✓✓</span></div>
                    </div>
                  </motion.div>
                );
              }
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 6, x: -8 }} animate={{ opacity: 1, y: 0, x: 0 }} transition={{ duration: 0.2 }} className="flex justify-start">
                  <div className="px-3 py-2 max-w-[80%] shadow-md" style={{ background: "#1F2C34", borderRadius: "2px 8px 8px 8px" }}>
                    <p className="text-[13px] text-white/80 leading-relaxed">{msg.text}</p>
                    <div className="mt-0.5"><span className="text-[9px] text-white/25">received</span></div>
                  </div>
                </motion.div>
              );
            })}
            {typingDir && (
              <motion.div key="typing" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`flex ${typingDir === "out" ? "justify-end" : "justify-start"}`}>
                <div className="px-4 py-3 flex items-center gap-1.5 shadow-md" style={{ background: typingDir === "out" ? "#005C4B" : "#1F2C34", borderRadius: typingDir === "out" ? "8px 2px 8px 8px" : "2px 8px 8px 8px" }}>
                  {[0, 160, 320].map((d) => <span key={d} className="w-2 h-2 rounded-full bg-white/55 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* WA input bar (decorative) */}
        <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ background: "#1F2C34", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex-1 rounded-full px-4 py-1.5 flex items-center" style={{ background: "#2A3942" }}>
            <span className="text-[11px] text-white/30 flex-1">Type a message</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#00A884] flex items-center justify-center text-white shrink-0">
            <Mic className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Launch footer */}
        <div className="px-4 py-3 shrink-0 flex gap-3" style={{ background: "#171A19", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-black uppercase tracking-wider text-white/55 border border-white/15 hover:border-white/35 hover:text-white/80 transition-colors cursor-pointer">
            Edit
          </button>
          <button onClick={onLaunch} disabled={isLaunching} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider py-2.5 flex items-center justify-center gap-2 transition-all cursor-pointer">
            {isLaunching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Launch Campaign</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Other right-panel modes ───────────────────────────────────────────────────

interface AutomationPanelProps {
  onNavigate?: (tab: string) => void;
}

const AutomationPanel: React.FC<AutomationPanelProps> = ({ onNavigate }) => {
  const steps = [
    { emoji: "⚡", label: "TRIGGER EVENT", desc: "Contact joins a tag", gradient: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/40", text: "text-amber-200" },
    { emoji: "📨", label: "MESSAGE SENT", desc: "Welcome message fires", gradient: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/40", text: "text-emerald-200" },
    { emoji: "📨", label: "FOLLOW-UP (DAY 1)", desc: "Nurture sequence continues", gradient: "from-teal-500/20 to-cyan-500/20", border: "border-teal-500/40", text: "text-teal-200" },
  ];
  return (
    <div className="p-5 flex flex-col gap-3">
      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Automation Flow</span>
      {steps.map((step, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className={`w-full bg-gradient-to-r ${step.gradient} border ${step.border} px-4 py-3 flex items-center gap-3`}>
            <span className="text-base leading-none">{step.emoji}</span>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-wider ${step.text}`}>{step.label}</p>
              <p className="text-[10px] text-stone-400 mt-0.5">{step.desc}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className="flex flex-col items-center">
              <div className="w-px h-3 bg-stone-600" />
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-stone-500" />
            </div>
          )}
        </div>
      ))}
      <button
        onClick={() => onNavigate?.("campaigns")}
        className="mt-auto w-full border border-emerald-500/40 text-emerald-400 font-black text-[10px] uppercase tracking-wider py-2.5 hover:bg-emerald-500/10 transition-colors cursor-pointer"
      >
        View Automations →
      </button>
    </div>
  );
};

interface ChatbotPanelProps {
  onNavigate?: (tab: string) => void;
}

const ChatbotPanel: React.FC<ChatbotPanelProps> = ({ onNavigate }) => (
  <div className="p-5 flex flex-col gap-4">
    <span className="text-[10px] font-black uppercase tracking-wider text-violet-600">Chatbot Preview</span>
    <PhoneMockup>
      <InboundBubble text="Hi! 👋" />
      <OutboundBubble text="Welcome! How can I help?" />
      <div className="flex justify-end flex-wrap gap-1">
        {["Track Order", "Browse", "Support"].map((b) => (
          <span key={b} className="text-[9px] border border-stone-300 bg-white px-1.5 py-0.5 text-stone-700">{b}</span>
        ))}
      </div>
      <InboundBubble text="Track Order" />
      <OutboundBubble text="Please share your order number!" />
    </PhoneMockup>
    <button
      onClick={() => onNavigate?.("chatbot")}
      className="mt-auto w-full border border-violet-500/40 text-violet-400 font-black text-[10px] uppercase tracking-wider py-2.5 hover:bg-violet-500/10 transition-colors cursor-pointer"
    >
      Build Chatbot →
    </button>
  </div>
);

interface TemplatePanelProps {
  onNavigate?: (tab: string) => void;
}

const TemplatePanel: React.FC<TemplatePanelProps> = ({ onNavigate }) => (
  <div className="p-5 flex flex-col gap-4">
    <span className="text-[10px] font-black uppercase tracking-wider text-sky-600">Template Preview</span>
    <div className="bg-white border border-stone-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5">
          Marketing
        </span>
      </div>
      <p className="text-[11px] font-black text-stone-500 font-mono">your_template_name</p>
      <p className="text-sm text-stone-800 leading-relaxed">
        Hi <span className="bg-amber-100 text-amber-800 px-1 font-semibold">{"{{1}}"}</span>, check out our latest offer! 🎉
      </p>
      <div className="border-t border-stone-100 pt-3 flex flex-wrap gap-1.5">
        {["Shop Now", "Learn More"].map((btn) => (
          <span key={btn} className="text-[11px] font-bold border border-stone-300 text-stone-700 px-3 py-1">{btn}</span>
        ))}
      </div>
    </div>
    <button
      onClick={() => onNavigate?.("templates")}
      className="mt-auto w-full border border-sky-500/40 text-sky-400 font-black text-[10px] uppercase tracking-wider py-2.5 hover:bg-sky-500/10 transition-colors cursor-pointer"
    >
      Create Template →
    </button>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export const OverviewTab: React.FC<OverviewTabProps> = ({ onNavigate }) => {
  const { organization, contacts, campaigns, templates, systemLogs, refreshWorkspace } = useApp();

  const params = useParams();
  const orgId = params.orgId as string;

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

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Mode switcher
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Right panel
  const [rightPanel, setRightPanel] = useState<RightPanelMode>("stats");
  const [strategy, setStrategy] = useState<CampaignStrategy | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [lastCampaignPrompt, setLastCampaignPrompt] = useState<string>("");

  // Editable campaign fields (populated when strategy loads)
  const [sequenceEnabled, setSequenceEnabled] = useState(true);
  const [sequenceSteps, setSequenceSteps] = useState<string[]>([]);
  const [qualifierEnabled, setQualifierEnabled] = useState(false);
  const [qualifier, setQualifier] = useState<QualifierConfig | null>(null);
  const [isGeneratingQualifier, setIsGeneratingQualifier] = useState(false);
  const [qualifierError, setQualifierError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<DbSegment | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string>("");

  // Refs
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derived stats
  const totalContacts = contacts.length;
  const totalCampaigns = campaigns.length;
  const totalMessages = campaigns.reduce((sum, c) => sum + (c.sent || 0), 0);
  const fbConnected = !!(organization?.whatsappConnected || organization?.whatsappBusinessAccountId);
  const orgInitial = (organization?.name ?? "W").charAt(0).toUpperCase();

  // All unique CRM tags for the audience selector
  const availableTags = useMemo(
    () => [...new Set((contacts as Array<{ tags?: string[] }>).flatMap((c) => c.tags ?? []))].filter(Boolean),
    [contacts]
  );

  // Scroll chat container (not the page) on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // ── Qualifier toggle (async — generates questions on first enable) ──────────

  const generateQualifier = useCallback(async () => {
    if (!orgId || !strategy) return;
    setIsGeneratingQualifier(true);
    setQualifierError(null);
    try {
      const r = await fetch("/api/ai/lead-qualifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          templateBody: strategy.template.body,
          templateName: strategy.template.name,
        }),
      });
      const d = (await r.json()) as { config?: QualifierConfig; error?: string };
      if (!r.ok) {
        const msg = d.error ?? "Generation failed";
        console.error("[lead-qualifier] HTTP", r.status, msg);
        throw new Error(`${msg} (HTTP ${r.status})`);
      }
      if (!d.config) throw new Error("No config returned from AI");
      setQualifier(d.config);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate questions";
      console.error("[lead-qualifier] Frontend error:", msg, err);
      setQualifierError(msg);
    } finally {
      setIsGeneratingQualifier(false);
    }
  }, [orgId, strategy]);

  const handleQualifierToggle = useCallback(async () => {
    const next = !qualifierEnabled;
    setQualifierEnabled(next);
    if (next && !qualifier) {
      await generateQualifier();
    }
  }, [qualifierEnabled, qualifier, generateQualifier]);

  // ── Handle action execution ────────────────────────────────────────────────

  const handleAction = useCallback(
    async (
      action: "campaign" | "automation" | "chatbot" | "template",
      params: { prompt?: string }
    ) => {
      if (action === "campaign") {
        const prompt = params.prompt ?? "";
        setLastCampaignPrompt(prompt);
        setRightPanel("campaign-loading");
        const loadingId = `loading-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { id: loadingId, role: "assistant", content: "Building your strategy…", isLoading: true },
        ]);
        try {
          const res = await fetch("/api/ai/campaign-strategist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "generate", orgId, prompt }),
          });
          const data = (await res.json()) as { strategy?: CampaignStrategy; error?: string };
          if (!res.ok) throw new Error(data.error ?? "Failed to generate");
          if (!data.strategy) throw new Error("No strategy returned");
          const s = data.strategy;
          // Ensure there are always 3 follow-up steps even if AI returned none
          if (s.sequence.steps.length === 0) {
            s.sequence.steps = [
              { order: 0, delayMinutes: 5, actionType: "send_message", message: "Hey! Just checking in — did you see our latest offer? 😊" },
              { order: 1, delayMinutes: 1440, actionType: "send_message", message: "Don't miss out! This offer is still available — reply to learn more." },
              { order: 2, delayMinutes: 2880, actionType: "send_message", message: "Last chance! This special offer expires soon. Tap to take action now." },
            ];
          }
          setStrategy(s);
          // Populate editable fields from the strategy
          setSequenceSteps(s.sequence.steps.map((step) => step.message ?? ""));
          setScheduledAt(toDatetimeLocal(s.schedule.scheduledAt ?? ""));
          const firstRule = (s.segment.rules as { all?: Array<{ field: string; op: string; value: string }> })?.all?.[0];
          setSelectedTags(firstRule?.value ? firstRule.value.split(",").filter(Boolean) : []);
          setQualifierEnabled(false);
          setQualifier(null);
          setSequenceEnabled(true);
          setRightPanel("campaign-preview");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingId
                ? {
                    ...m,
                    content: "Your campaign is ready — edit details in the panel, then launch when ready.",
                    isLoading: false,
                    strategyReady: s,
                  }
                : m
            )
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          console.error("[campaign-strategist] Frontend error:", msg, err);
          setRightPanel("stats");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === loadingId
                ? {
                    ...m,
                    isLoading: false,
                    content:
                      msg.includes("unavailable") || msg.includes("rate") || msg.includes("limit") || msg.toLowerCase() === "failed"
                        ? "The AI is a bit busy right now — tap Retry to try again in a moment."
                        : "I couldn't build the strategy. Tap Retry or rephrase your goal.",
                    suggestions: ["Retry"],
                  }
                : m
            )
          );
        }
      } else if (action === "automation") {
        setRightPanel("automation");
      } else if (action === "chatbot") {
        setRightPanel("chatbot");
      } else if (action === "template") {
        setRightPanel("template");
      }
    },
    [orgId]
  );

  // ── Core copilot fetch (defined after handleAction so it can reference it directly) ────

  const callCopilot = useCallback(
    async (newMessages: ChatMessage[]) => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/ai/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = (await res.json()) as {
          type?: "question" | "action";
          text?: string;
          suggestions?: string[];
          action?: "campaign" | "automation" | "chatbot" | "template";
          params?: { prompt?: string };
          summary?: string;
          error?: string;
        };

        if (!res.ok || !data.type) {
          const msg = res.status === 429
            ? "You've sent a lot of AI requests today — limit resets tomorrow. Try again later."
            : "Something went wrong. Please try again.";
          setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: msg }]);
          return;
        }

        if (data.type === "question") {
          setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: data.text ?? "", suggestions: data.suggestions ?? [] }]);
        } else if (data.type === "action" && data.action) {
          const actionMsg: ChatMessage = { id: Date.now().toString(), role: "assistant", content: data.summary ?? `Ready to build your ${data.action}!`, isAction: true, action: data.action, summary: data.summary };
          setMessages((prev) => [...prev, actionMsg]);
          await handleAction(data.action!, data.params ?? {});
        }
      } catch (err) {
        console.error("[copilot] fetch error:", err);
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: "Sorry, I hit a snag. Please try again." }]);
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId, handleAction]
  );

  // ── handleSend ─────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !orgId) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    await callCopilot(newMessages);
  }, [input, messages, isLoading, orgId, callCopilot]);

  // ── handleSuggestion ───────────────────────────────────────────────────────

  const handleSuggestion = useCallback(
    async (text: string) => {
      if (isLoading || !orgId) return;
      if (text === "Retry" && lastCampaignPrompt) {
        await handleAction("campaign", { prompt: lastCampaignPrompt });
        return;
      }
      const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      await callCopilot(newMessages);
    },
    [messages, isLoading, orgId, callCopilot, lastCampaignPrompt, handleAction]
  );

  // ── handleLaunch ───────────────────────────────────────────────────────────

  const handleLaunch = useCallback(async () => {
    if (!strategy || !orgId) return;
    setIsLaunching(true);
    // Merge edited values into strategy before sending
    const editedStrategy: CampaignStrategy = {
      ...strategy,
      schedule: {
        ...strategy.schedule,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : strategy.schedule.scheduledAt,
      },
      segment:
        selectedSegment
          ? { name: selectedSegment.name, rules: selectedSegment.rules as CampaignStrategy["segment"]["rules"] }
          : selectedTags.length > 0
            ? { ...strategy.segment, rules: { all: [{ field: "tags", op: "in", value: selectedTags.join(",") }] } }
            : strategy.segment,
    };
    const editedSequence = sequenceEnabled
      ? {
          ...strategy.sequence,
          steps: strategy.sequence.steps.map((step, i) => ({
            ...step,
            message: sequenceSteps[i] ?? step.message,
          })),
        }
      : null;
    const editedQualifier = qualifierEnabled && qualifier ? { ...qualifier } : null;

    try {
      const res = await fetch("/api/ai/campaign-strategist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          orgId,
          template: editedStrategy.template,
          segment: editedStrategy.segment,
          schedule: editedStrategy.schedule,
          sequence: editedSequence,
          leadQualifier: editedQualifier,
        }),
      });
      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error ?? "Launch failed");
      }
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "🎉 Campaign launched! Your message is on its way. Check the Campaigns tab for live delivery stats.",
        },
      ]);
      // Refresh context so the Campaigns tab shows the new campaign immediately
      void refreshWorkspace(orgId);
      setRightPanel("stats");
      setStrategy(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Launch failed";
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: `Launch failed: ${msg}` },
      ]);
    } finally {
      setIsLaunching(false);
    }
  }, [strategy, orgId, scheduledAt, selectedTags, sequenceEnabled, sequenceSteps, qualifierEnabled, qualifier]);

  // ── Reset conversation ─────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setMessages([INITIAL_GREETING]);
    setRightPanel("stats");
    setStrategy(null);
    setInput("");
    setSequenceSteps([]);
    setScheduledAt("");
    setSelectedTags([]);
    setQualifier(null);
    setQualifierEnabled(false);
    setQualifierError(null);
    setSequenceEnabled(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // ── Render right panel ─────────────────────────────────────────────────────

  const renderRightPanel = () => {
    switch (rightPanel) {
      case "stats":
        return (
          <StatsPanel
            totalContacts={totalContacts}
            totalCampaigns={totalCampaigns}
            totalMessages={totalMessages}
            templateCount={templates.length}
            onNavigate={onNavigate}
          />
        );
      case "campaign-loading":
        return <CampaignLoadingPanel />;
      case "campaign-preview":
        return strategy ? (
          <CampaignPreviewPanel
            strategy={strategy}
            orgId={orgId ?? ""}
            sequenceEnabled={sequenceEnabled}
            onSequenceEnabledChange={setSequenceEnabled}
            sequenceSteps={sequenceSteps}
            onSequenceStepsChange={setSequenceSteps}
            qualifierEnabled={qualifierEnabled}
            onQualifierEnabledChange={() => void handleQualifierToggle()}
            qualifier={qualifier}
            onQualifierQuestionsChange={(qs) =>
              setQualifier((prev) => (prev ? { ...prev, questions: qs } : null))
            }
            isGeneratingQualifier={isGeneratingQualifier}
            qualifierError={qualifierError}
            onRetryQualifier={() => void generateQualifier()}
            availableTags={availableTags}
            selectedTags={selectedTags}
            onSelectedTagsChange={setSelectedTags}
            selectedSegmentId={selectedSegment?.id ?? null}
            onSelectedSegmentChange={setSelectedSegment}
            scheduledAt={scheduledAt}
            onScheduledAtChange={setScheduledAt}
            onLaunch={handleLaunch}
            isLaunching={isLaunching}
            onPreviewFlow={() => setIsSimulatorOpen(true)}
          />
        ) : (
          <CampaignLoadingPanel />
        );
      case "automation":
        return <AutomationPanel onNavigate={onNavigate} />;
      case "chatbot":
        return <ChatbotPanel onNavigate={onNavigate} />;
      case "template":
        return <TemplatePanel onNavigate={onNavigate} />;
      default:
        return null;
    }
  };

  const recentLogs = systemLogs.slice(0, 8);

  const quickActions = [
    { label: "Import Contacts", icon: Users, action: () => setIsCSVModalOpen(true) },
    { label: "New Campaign", icon: Send, action: () => onNavigate?.("campaigns") },
    { label: "Create Template", icon: FileText, action: () => onNavigate?.("templates") },
    { label: "Build Chatbot", icon: Bot, action: () => onNavigate?.("chatbot") },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#fafaf9] space-y-5 custom-scrollbar pb-12">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-5">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Workspace Overview</span>
          <h1 className="text-2xl font-black tracking-tight text-stone-900">{organization?.name ?? "Your Workspace"}</h1>
          <div className="flex items-center gap-1.5 pt-0.5">
            {fbConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs text-emerald-700 font-semibold">WhatsApp Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-xs text-stone-400 font-semibold">Not connected</span>
                <button
                  onClick={() => onNavigate?.("settings")}
                  className="text-xs text-stone-500 underline ml-1 cursor-pointer hover:text-stone-900 transition-colors"
                >
                  Connect now
                </button>
              </>
            )}
          </div>
        </div>

        {fbConnected ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-2 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">WhatsApp Active</span>
          </div>
        ) : (
          <button
            onClick={() => onNavigate?.("settings")}
            className="bg-stone-950 text-white text-xs font-black uppercase tracking-wider px-4 py-2 hover:bg-stone-800 transition-colors cursor-pointer flex items-center gap-2 border border-stone-950"
          >
            <Wifi className="w-4 h-4" />
            Connect WhatsApp
          </button>
        )}
      </div>

      {/* ── AI Command Center ── */}
      <div className="border border-stone-200 overflow-hidden flex flex-col">
        {/* Panel label bar */}
        <div className="bg-white border-b border-stone-200 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-wa-green" />
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-700">Command Center</span>
          </div>
          {/* Mode switcher */}
          <div className="flex bg-stone-100 p-0.5 gap-0">
            <button
              onClick={() => setMode("ai")}
              className={`px-4 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${mode === "ai" ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-800"}`}
            >
              AI Mode
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`px-4 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${mode === "manual" ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-800"}`}
            >
              Manual
            </button>
          </div>
        </div>

        {/* Split panels — always side-by-side */}
        {mode === "ai" && (
        <div className="flex flex-row h-[640px] overflow-hidden">
          {/* ── LEFT — Chat (55%) ── */}
          <div className="flex-[55] flex flex-col bg-gradient-to-b from-indigo-950 via-slate-900 to-violet-950 min-h-0 min-w-0">
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-2 h-2 bg-emerald-400 absolute -top-0.5 -right-0.5 animate-pulse" />
                  <div className="w-7 h-7 bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-white font-black text-sm uppercase tracking-wider leading-none">AI Copilot</p>
                  <p className="text-stone-400 text-[10px] mt-0.5">Your WhatsApp marketing assistant</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                title="New conversation"
              >
                <RotateCcw className="w-3 h-3" />
                New
              </button>
            </div>

            {/* Chat thread */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
              {messages.map((message) => {
                if (message.role === "assistant") {
                  const ActionIcon = message.action ? actionIcons[message.action] : null;
                  return (
                    <div key={message.id} className="flex items-start gap-2.5 mb-4">
                      {/* AI avatar */}
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Bubble */}
                        <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-3.5 py-2.5 inline-flex items-center gap-2 max-w-[85%]">
                          {message.isLoading && (
                            <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin shrink-0" />
                          )}
                          <p className="text-sm text-white leading-relaxed">{message.content}</p>
                        </div>

                        {/* Compact strategy-ready card */}
                        {message.strategyReady && (
                          <div className="mt-3 max-w-[95%] border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
                            <div className="px-3.5 py-2.5 border-b border-emerald-500/20">
                              <div className="flex items-center gap-2 mb-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">
                                  Strategy Ready
                                </span>
                              </div>
                              <div className="space-y-0.5 text-[11px]">
                                <p className="text-white/60">
                                  <span className="text-white/30 font-bold">Template: </span>
                                  {message.strategyReady.template.name}
                                </p>
                                <p className="text-white/60">
                                  <span className="text-white/30 font-bold">Segment: </span>
                                  {message.strategyReady.segment.name}
                                </p>
                                <p className="text-white/60">
                                  <span className="text-white/30 font-bold">Sequence: </span>
                                  {message.strategyReady.sequence.steps.length} follow-ups
                                </p>
                              </div>
                            </div>
                            <div className="px-3.5 py-2.5 flex items-center gap-2">
                              <button
                                onClick={handleLaunch}
                                disabled={isLaunching}
                                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-[10px] font-black uppercase tracking-wider py-1.5 flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer transition-all"
                              >
                                {isLaunching
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <><Send className="w-3 h-3" /> Quick Launch</>
                                }
                              </button>
                              <span className="text-[10px] text-white/30 shrink-0">Edit in panel →</span>
                            </div>
                          </div>
                        )}

                        {/* Action card */}
                        {message.isAction && message.action && ActionIcon && (
                          <div className={`mt-2 border px-3 py-2.5 flex items-center gap-2.5 max-w-[85%] ${actionColors[message.action]}`}>
                            <ActionIcon className="w-4 h-4 shrink-0" />
                            <div>
                              <p className="text-xs font-black uppercase tracking-wider">{actionLabels[message.action]}</p>
                              {message.summary && <p className="text-[11px] mt-0.5 opacity-80">{message.summary}</p>}
                            </div>
                          </div>
                        )}

                        {/* Suggestion chips */}
                        {message.suggestions && message.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {message.suggestions.map((s, i) => (
                              <button
                                key={s}
                                onClick={() => handleSuggestion(s)}
                                disabled={isLoading}
                                className={`text-xs font-bold px-3 py-1.5 border cursor-pointer transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed ${chipColors[i % chipColors.length]}`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // User message
                return (
                  <div key={message.id} className="flex items-start gap-2.5 mb-4 flex-row-reverse">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-white text-[11px] font-black">{orgInitial}</span>
                    </div>
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2.5 max-w-[80%]">
                      <p className="text-sm text-white leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex items-start gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-white/10 border border-white/20 px-3.5 py-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-white/10 p-3 flex gap-2 shrink-0">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Tell me what you want to do…"
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm px-3 py-2 focus:outline-none focus:border-teal-400/60 transition-colors"
                disabled={isLoading}
              />
              <button
                onClick={() => void handleSend()}
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider px-4 py-2 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5" />Send</>}
              </button>
            </div>
          </div>

          {/* ── RIGHT — Editing workbench (45%) ── */}
          <div className="flex-[45] flex flex-col bg-white border-l border-stone-200 overflow-hidden min-w-0">
            {renderRightPanel()}
          </div>
        </div>
        )}

        {/* ── MANUAL MODE ── */}
        {mode === "manual" && (
          <div className="bg-[#fafaf9] p-6 space-y-8">
            {/* 4 Action Tiles */}
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: Send,
                  label: "Campaign",
                  title: "Send a Campaign",
                  description: "Broadcast WhatsApp messages to your entire contact list or a specific audience segment.",
                  cta: "Launch Campaign",
                  tab: "campaigns",
                  gradient: "from-amber-500 to-orange-500",
                  borderTop: "border-t-amber-500",
                },
                {
                  icon: Zap,
                  label: "Automation",
                  title: "Set Up Automation",
                  description: "Build automated follow-up sequences that run on autopilot based on contact actions.",
                  cta: "View Automations",
                  tab: "campaigns",
                  gradient: "from-emerald-500 to-teal-500",
                  borderTop: "border-t-emerald-500",
                },
                {
                  icon: Bot,
                  label: "Chatbot",
                  title: "Build a Chatbot",
                  description: "Design conversational flows with a visual drag-and-drop node builder for WhatsApp.",
                  cta: "Open Builder",
                  tab: "chatbot",
                  gradient: "from-violet-500 to-purple-500",
                  borderTop: "border-t-violet-500",
                },
                {
                  icon: FileText,
                  label: "Template",
                  title: "Create Template",
                  description: "Design and submit Meta-approved WhatsApp message templates with buttons and media.",
                  cta: "Manage Templates",
                  tab: "templates",
                  gradient: "from-sky-500 to-blue-500",
                  borderTop: "border-t-sky-500",
                },
              ].map(({ icon: Icon, label, title, description, cta, tab, gradient, borderTop }) => (
                <button
                  key={label}
                  onClick={() => onNavigate?.(tab)}
                  className={`bg-white border border-stone-200 border-t-4 ${borderTop} p-6 text-left cursor-pointer hover:shadow-md transition-all group flex flex-col gap-4 relative`}
                >
                  <ArrowUpRight className="w-4 h-4 text-stone-300 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className={`w-11 h-11 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">{label}</p>
                    <p className="text-base font-black text-stone-900 tracking-tight mb-2">{title}</p>
                    <p className="text-sm text-stone-500 leading-relaxed">{description}</p>
                  </div>
                  <div className={`text-[11px] font-black uppercase tracking-wider bg-gradient-to-r ${gradient} bg-clip-text text-transparent flex items-center gap-1`}>
                    {cta} <ArrowUpRight className="w-3 h-3 opacity-60" />
                  </div>
                </button>
              ))}
            </div>

            {/* One-Click Automations */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-4 border-b border-stone-200 pb-2">
                One-Click Automations
              </h3>
              <RecipesSection hideHeader />
            </div>
          </div>
        )}
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
            <div className="lg:col-span-2 bg-white border border-stone-200 p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {quickActions.map(({ label, icon: Icon, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="w-full flex items-center gap-3 p-3 border border-stone-100 hover:border-stone-300 hover:bg-stone-50 transition-colors text-left cursor-pointer group"
                  >
                    <Icon className="w-4 h-4 text-stone-500" />
                    <span className="text-sm font-semibold text-stone-700 flex-1">{label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 bg-white border border-stone-200 p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-4">Recent Activity</h3>
              {recentLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <MessageCircle className="w-8 h-8 text-stone-200 mb-2" />
                  <p className="text-sm text-stone-400">No activity yet.</p>
                  <p className="text-xs text-stone-400 mt-1">Actions will appear here as you use LeapCreww.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <span className="text-[10px] text-stone-400 mt-0.5 shrink-0 font-mono w-14">{log.timestamp}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 shrink-0 mt-0.5 ${
                        log.type === "campaign" ? "bg-blue-50 text-blue-600"
                          : log.type === "chat" ? "bg-emerald-50 text-emerald-600"
                          : log.type === "integration" ? "bg-purple-50 text-purple-600"
                          : "bg-stone-100 text-stone-500"
                      }`}>
                        {log.type}
                      </span>
                      <p className="text-xs text-stone-600 leading-relaxed flex-1">{log.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Campaign Flow Simulator Modal */}
      {isSimulatorOpen && strategy && (
        <SimulatorModal
          strategy={strategy}
          qualifier={qualifier}
          qualifierEnabled={qualifierEnabled}
          sequenceSteps={sequenceSteps}
          sequenceEnabled={sequenceEnabled}
          isLaunching={isLaunching}
          onClose={() => setIsSimulatorOpen(false)}
          onLaunch={() => { void handleLaunch(); setIsSimulatorOpen(false); }}
        />
      )}

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
