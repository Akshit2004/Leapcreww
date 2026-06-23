"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Zap, Plus, Trash2, ToggleLeft, ToggleRight,
  Tag, MessageSquare, UserPlus, MousePointerClick,
  ChevronDown, X, Loader2, Clock, CheckCircle2, ArrowRight,
} from "lucide-react";
import { useApp } from "@/shared/context/AppContext";
import { useParams } from "next/navigation";
import type { CatalogAutomation } from "@/features/automations/config/catalog";
import { CATALOG_CATEGORIES } from "@/features/automations/config/catalog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutomationStep {
  type: "send_template" | "add_tag" | "remove_tag";
  templateName?: string;
  templateParams?: string[];
  tag?: string;
  delayMinutes: number;
}

interface Automation {
  id: string;
  name: string;
  triggerType: "keyword" | "welcome" | "tag_added" | "button_reply";
  triggerConfig: Record<string, unknown>;
  steps: AutomationStep[];
  templateName: string;
  isActive: boolean;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIGGER_META: Record<string, { label: string; icon: React.ReactNode; color: string; borderColor: string; description: string }> = {
  keyword:      { label: "Keyword",      icon: <MessageSquare className="w-3.5 h-3.5" />, color: "text-blue-600 bg-blue-50 border-blue-200",      borderColor: "#2563eb", description: "Contact sends a specific word or phrase" },
  welcome:      { label: "Welcome",      icon: <UserPlus className="w-3.5 h-3.5" />,      color: "text-green-700 bg-green-50 border-green-200",   borderColor: "#15803d", description: "First-ever message from a new contact" },
  tag_added:    { label: "Tag Added",    icon: <Tag className="w-3.5 h-3.5" />,           color: "text-purple-700 bg-purple-50 border-purple-200", borderColor: "#7c3aed", description: "A specific tag is applied to a contact" },
  button_reply: { label: "Button Reply", icon: <MousePointerClick className="w-3.5 h-3.5" />, color: "text-orange-700 bg-orange-50 border-orange-200", borderColor: "#c2410c", description: "Contact taps a specific quick-reply button" },
};

const DELAY_OPTIONS = [
  { label: "Immediately", value: 0 },
  { label: "30 minutes",  value: 30 },
  { label: "1 hour",      value: 60 },
  { label: "2 hours",     value: 120 },
  { label: "4 hours",     value: 240 },
  { label: "8 hours",     value: 480 },
  { label: "1 day",       value: 1440 },
  { label: "2 days",      value: 2880 },
  { label: "3 days",      value: 4320 },
  { label: "7 days",      value: 10080 },
];

const CATEGORY_COLOR: Record<string, string> = {
  "Basics":          "bg-stone-100 text-stone-700 border-stone-300",
  "E-commerce":      "bg-blue-50 text-blue-700 border-blue-200",
  "Lead Generation": "bg-amber-50 text-amber-700 border-amber-200",
  "Finance":         "bg-green-50 text-green-700 border-green-200",
  "Healthcare":      "bg-red-50 text-red-700 border-red-200",
  "HR":              "bg-violet-50 text-violet-700 border-violet-200",
  "Travel":          "bg-sky-50 text-sky-700 border-sky-200",
  "Real Estate":     "bg-orange-50 text-orange-700 border-orange-200",
};

const CATEGORY_COUNT: Record<string, number> = {
  "Basics": 4, "E-commerce": 5, "Lead Generation": 3,
  "Finance": 2, "Healthcare": 2, "HR": 2, "Travel": 1, "Real Estate": 1,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEffectiveSteps(a: Automation): AutomationStep[] {
  if (Array.isArray(a.steps) && a.steps.length > 0) return a.steps;
  if (a.templateName) return [{ type: "send_template", templateName: a.templateName, delayMinutes: 0 }];
  return [];
}

function triggerSummary(a: Automation): string {
  if (a.triggerType === "keyword") {
    const cfg = a.triggerConfig as { keywords?: string[]; matchType?: string };
    return `"${(cfg.keywords ?? []).join(", ")}" (${cfg.matchType ?? "exact"})`;
  }
  if (a.triggerType === "tag_added") return `Tag: ${(a.triggerConfig as { tag?: string }).tag ?? "—"}`;
  if (a.triggerType === "button_reply") return `Payload: ${(a.triggerConfig as { payloadId?: string }).payloadId ?? "—"}`;
  return "First message from new contact";
}

function stepLabel(step: AutomationStep): string {
  if (step.type === "send_template") return `Send "${(step.templateName ?? "").replace(/_/g, " ")}"`;
  if (step.type === "add_tag") return `Add tag "${step.tag}"`;
  if (step.type === "remove_tag") return `Remove tag "${step.tag}"`;
  return step.type;
}

function formatDelay(mins: number): string {
  return DELAY_OPTIONS.find((d) => d.value === mins)?.label ?? `${mins}m`;
}

// ─── Step editor ──────────────────────────────────────────────────────────────

interface StepEditorProps {
  step: AutomationStep;
  index: number;
  templates: { name: string; metaStatus?: string; body?: string }[];
  onChange: (s: AutomationStep) => void;
  onRemove: () => void;
  isFirst: boolean;
}

function StepEditor({ step, index, templates, onChange, onRemove, isFirst }: StepEditorProps) {
  const approvedTemplates = Array.from(
    new Map(templates.filter((t) => t.metaStatus === "approved").map((t) => [t.name, t])).values()
  );
  const selectedTemplate = approvedTemplates.find((t) => t.name === step.templateName);
  const paramCount = selectedTemplate?.body
    ? new Set(Array.from(selectedTemplate.body.matchAll(/\{\{(\d+)\}\}/g)).map((m) => parseInt(m[1]))).size
    : 0;

  return (
    <div className="border border-stone-200 rounded-xl bg-stone-50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[10px] font-black flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
            {isFirst ? "First Action (Immediate)" : "Follow-up Action"}
          </span>
        </div>
        {!isFirst && (
          <button onClick={onRemove} className="p-1 text-stone-400 hover:text-red-500 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!isFirst && (
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-1">Delay from trigger</label>
          <div className="relative">
            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
            <select
              value={step.delayMinutes}
              onChange={(e) => onChange({ ...step, delayMinutes: Number(e.target.value) })}
              className="w-full pl-8 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-stone-900 appearance-none"
            >
              {DELAY_OPTIONS.filter((d) => d.value > 0).map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
          </div>
        </div>
      )}

      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-1">Action type</label>
        <div className="flex gap-2 flex-wrap">
          {(["send_template", "add_tag", "remove_tag"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ ...step, type, templateName: undefined, tag: undefined })}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border rounded-full transition-colors cursor-pointer ${step.type === type ? "bg-stone-900 text-white border-stone-900" : "border-stone-200 text-stone-600 hover:border-stone-400 bg-white"}`}
            >
              {type === "send_template" ? "Send Template" : type === "add_tag" ? "Add Tag" : "Remove Tag"}
            </button>
          ))}
        </div>
      </div>

      {step.type === "send_template" && (
        <div className="space-y-2">
          <div className="relative">
            <select
              value={step.templateName ?? ""}
              onChange={(e) => onChange({ ...step, templateName: e.target.value, templateParams: [] })}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-stone-900 appearance-none pr-8"
            >
              <option value="">Select approved template…</option>
              {approvedTemplates.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
          </div>
          {paramCount > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-stone-400">Use <code className="text-[10px]">{"{{contact.name}}"}</code> or <code className="text-[10px]">{"{{contact.phone}}"}</code></p>
              {Array.from({ length: paramCount }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-stone-400 w-8 shrink-0">{`{{${i + 1}}}`}</span>
                  <input
                    value={(step.templateParams ?? [])[i] ?? ""}
                    onChange={(e) => {
                      const next = [...(step.templateParams ?? Array(paramCount).fill(""))];
                      next[i] = e.target.value;
                      onChange({ ...step, templateParams: next });
                    }}
                    placeholder={`Value for {{${i + 1}}}`}
                    className="flex-1 border border-stone-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-stone-900"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(step.type === "add_tag" || step.type === "remove_tag") && (
        <input
          value={step.tag ?? ""}
          onChange={(e) => onChange({ ...step, tag: e.target.value })}
          placeholder="Tag name, e.g. VIP"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-stone-900"
        />
      )}
    </div>
  );
}

// ─── Create modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  orgId: string;
  templates: { name: string; metaStatus?: string; body?: string }[];
  onClose: () => void;
  onCreated: (a: Automation) => void;
}

function CreateAutomationModal({ orgId, templates, onClose, onCreated }: CreateModalProps) {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("keyword");
  const [keywords, setKeywords] = useState("");
  const [matchType, setMatchType] = useState("exact");
  const [tag, setTag] = useState("");
  const [payloadId, setPayloadId] = useState("");
  const [steps, setSteps] = useState<AutomationStep[]>([
    { type: "send_template", templateName: "", templateParams: [], delayMinutes: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const buildTriggerConfig = () => {
    if (triggerType === "keyword") return { keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean), matchType };
    if (triggerType === "tag_added") return { tag: tag.trim() };
    if (triggerType === "button_reply") return { payloadId: payloadId.trim() };
    return {};
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Name is required"); return; }
    if (triggerType === "keyword" && !keywords.trim()) { setError("Enter at least one keyword"); return; }
    if (triggerType === "tag_added" && !tag.trim()) { setError("Enter a tag"); return; }
    if (triggerType === "button_reply" && !payloadId.trim()) { setError("Enter a button payload ID"); return; }
    const hasValidStep = steps.some((s) =>
      (s.type === "send_template" && s.templateName) ||
      ((s.type === "add_tag" || s.type === "remove_tag") && s.tag)
    );
    if (!hasValidStep) { setError("Configure at least one valid action step"); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/org/${orgId}/automations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), triggerType, triggerConfig: buildTriggerConfig(), steps }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create automation"); return; }
      onCreated(data.automation);
      onClose();
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl border border-stone-200 shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 shrink-0">
          <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2"><Zap className="w-4 h-4" /> New Automation</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 custom-scrollbar p-6 space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-1.5">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cart Recovery Sequence"
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-stone-900" />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-1.5">Trigger</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TRIGGER_META).map(([type, meta]) => (
                <button key={type} type="button" onClick={() => setTriggerType(type)}
                  className={`flex items-start gap-2 p-3 border rounded-xl text-left transition-colors cursor-pointer ${triggerType === type ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 hover:border-stone-400"}`}>
                  <span className={`mt-0.5 ${triggerType === type ? "text-white" : ""}`}>{meta.icon}</span>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider">{meta.label}</div>
                    <div className={`text-[10px] mt-0.5 leading-snug ${triggerType === type ? "text-stone-300" : "text-stone-500"}`}>{meta.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {triggerType === "keyword" && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-1.5">Keywords <span className="font-normal normal-case">(comma-separated)</span></label>
                <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="PRICE, MENU, HELP"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-stone-900" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-1.5">Match Type</label>
                <div className="relative">
                  <select value={matchType} onChange={(e) => setMatchType(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-stone-900 appearance-none bg-white pr-8">
                    <option value="exact">Exact match</option>
                    <option value="contains">Contains</option>
                    <option value="starts_with">Starts with</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}
          {triggerType === "tag_added" && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-1.5">Tag Name</label>
              <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="VIP"
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-stone-900" />
            </div>
          )}
          {triggerType === "button_reply" && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-1.5">Button Payload ID</label>
              <input value={payloadId} onChange={(e) => setPayloadId(e.target.value)} placeholder="confirm_order"
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-stone-900" />
            </div>
          )}

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-2">Actions</label>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <StepEditor key={i} step={step} index={i} templates={templates}
                  onChange={(s) => setSteps((prev) => prev.map((x, j) => (j === i ? s : x)))}
                  onRemove={() => setSteps((prev) => prev.filter((_, j) => j !== i))}
                  isFirst={i === 0} />
              ))}
            </div>
            <button type="button"
              onClick={() => setSteps((prev) => [...prev, { type: "send_template", templateName: "", templateParams: [], delayMinutes: 1440 }])}
              className="mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-stone-600 border border-dashed border-stone-300 rounded-xl px-4 py-2.5 hover:border-stone-500 hover:text-stone-900 transition-colors cursor-pointer w-full justify-center">
              <Plus className="w-3.5 h-3.5" /> Add follow-up step
            </button>
          </div>

          {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-stone-200 rounded-xl py-2.5 text-sm font-bold hover:bg-stone-50 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-stone-900 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-stone-700 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? "Saving…" : "Create Automation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export const AutomationsTab: React.FC = () => {
  const { templates, addSystemLog } = useApp();
  const params = useParams();
  const orgId = params.orgId as string;

  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loadingAutomations, setLoadingAutomations] = useState(true);
  const [filterType, setFilterType] = useState("all");

  const [catalog, setCatalog] = useState<CatalogAutomation[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [activeCatalogCategory, setActiveCatalogCategory] = useState("All");
  const [busyInstallId, setBusyInstallId] = useState<string | null>(null);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [stepPickerItem, setStepPickerItem] = useState<CatalogAutomation | null>(null);
  const [stepPickerEnabled, setStepPickerEnabled] = useState<boolean[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsCreateOpen(true);
    window.addEventListener("leapcreww:quickaction", handler);
    return () => window.removeEventListener("leapcreww:quickaction", handler);
  }, []);

  // Load automations + catalog in parallel on mount
  const fetchAutomations = useCallback(async () => {
    setLoadingAutomations(true);
    try {
      const res = await fetch(`/api/org/${orgId}/automations`);
      const data = await res.json();
      setAutomations(data.automations ?? []);
    } catch { /* no-op */ }
    finally { setLoadingAutomations(false); }
  }, [orgId]);

  useEffect(() => {
    fetchAutomations();
    fetch(`/api/org/${orgId}/automations/catalog`)
      .then((r) => r.json())
      .then((d) => setCatalog(d.catalog ?? []))
      .catch(() => {})
      .finally(() => setLoadingCatalog(false));
  }, [orgId, fetchAutomations]);

  const toggleActive = async (a: Automation) => {
    const next = !a.isActive;
    setAutomations((prev) => prev.map((x) => (x.id === a.id ? { ...x, isActive: next } : x)));
    await fetch(`/api/org/${orgId}/automations/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    addSystemLog("crm", `Automation "${a.name}" ${next ? "enabled" : "paused"}.`);
  };

  const handleDelete = async (a: Automation) => {
    if (!confirm(`Delete "${a.name}"?`)) return;
    setAutomations((prev) => prev.filter((x) => x.id !== a.id));
    await fetch(`/api/org/${orgId}/automations/${a.id}`, { method: "DELETE" });
    addSystemLog("crm", `Automation "${a.name}" deleted.`);
  };

  const openStepPicker = (item: CatalogAutomation) => {
    setStepPickerItem(item);
    setStepPickerEnabled(item.steps.map(() => true));
  };

  const confirmInstall = async () => {
    const item = stepPickerItem;
    if (!item || busyInstallId) return;
    const selectedSteps = item.steps.filter((_, i) => stepPickerEnabled[i]);
    if (selectedSteps.length === 0) return;

    setBusyInstallId(item.id);
    setStepPickerItem(null);
    try {
      const res = await fetch(`/api/org/${orgId}/automations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.title,
          triggerType: item.triggerType,
          triggerConfig: item.triggerConfig,
          steps: selectedSteps,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInstalledIds((prev) => new Set([...prev, item.id]));
        setAutomations((prev) => [...prev, data.automation]);
        addSystemLog("crm", `Automation "${item.title}" installed from catalog.`);
      }
    } catch { /* silent */ }
    finally { setBusyInstallId(null); }
  };

  const handleInstall = async (item: CatalogAutomation) => {
    if (busyInstallId) return;
    // Single-step items: install directly. Multi-step: open picker.
    if (item.steps.length <= 1) {
      setBusyInstallId(item.id);
      try {
        const res = await fetch(`/api/org/${orgId}/automations/catalog`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ catalogId: item.id }),
        });
        const data = await res.json();
        if (res.ok) {
          setInstalledIds((prev) => new Set([...prev, item.id]));
          setAutomations((prev) => [...prev, data.automation]);
          addSystemLog("crm", `Automation "${item.title}" installed from catalog.`);
        }
      } catch { /* silent */ }
      finally { setBusyInstallId(null); }
      return;
    }
    openStepPicker(item);
  };

  const filteredAutomations = automations.filter((a) =>
    filterType === "all" || a.triggerType === filterType
  );

  const filteredCatalog = activeCatalogCategory === "All"
    ? catalog
    : catalog.filter((c) => c.category === activeCatalogCategory);

  const activeCount = automations.filter((a) => a.isActive).length;
  const totalRuns = automations.reduce((sum, a) => sum + a.runCount, 0);

  return (
    <div className="h-full flex flex-col bg-[#fafaf9] overflow-y-auto custom-scrollbar">
      {/* ── Header ── */}
      <div className="border-b border-stone-200 bg-white px-6 pt-5 pb-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-stone-900 flex items-center gap-2">
              <Zap className="w-5 h-5" /> Automations
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Auto-send messages, add tags, and run sequences when contacts trigger an event
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 bg-stone-900 text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-stone-700 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>

        {/* Stats strip */}
        <div className="mt-4 bg-stone-50 border border-stone-200 px-4 py-2 flex gap-6">
          <div className="flex flex-col">
            <span className="text-lg font-black text-stone-900 leading-none">{activeCount}</span>
            <span className="text-[10px] uppercase tracking-wider text-stone-500 mt-0.5">Active</span>
          </div>
          <div className="w-px bg-stone-200" />
          <div className="flex flex-col">
            <span className="text-lg font-black text-stone-900 leading-none">{totalRuns.toLocaleString()}</span>
            <span className="text-[10px] uppercase tracking-wider text-stone-500 mt-0.5">Total Runs</span>
          </div>
          <div className="w-px bg-stone-200" />
          <div className="flex flex-col">
            <span className="text-lg font-black text-stone-900 leading-none">20</span>
            <span className="text-[10px] uppercase tracking-wider text-stone-500 mt-0.5">Catalog</span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 space-y-8">

        {/* ── Active automations ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-stone-900 border-l-4 border-stone-900 pl-3">
              Your Automations
              {automations.length > 0 && <span className="ml-2 text-stone-400 font-bold">({automations.length})</span>}
            </h2>
            {/* Trigger filter chips */}
            {automations.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {["all", "keyword", "welcome", "tag_added", "button_reply"].map((type) => (
                  <button key={type} onClick={() => setFilterType(type)}
                    className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border transition-colors cursor-pointer ${filterType === type ? "bg-stone-900 text-white border-stone-900" : "border-stone-200 text-stone-500 hover:border-stone-400 bg-white"}`}>
                    {type === "all" ? "All" : TRIGGER_META[type]?.label ?? type}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loadingAutomations ? (
            <div className="flex items-center gap-2 text-xs text-stone-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : filteredAutomations.length === 0 ? (
            <div className="border border-dashed border-stone-200 rounded-xl px-6 py-8 text-center bg-white">
              <Zap className="w-8 h-8 text-stone-200 mx-auto mb-2" />
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                {automations.length === 0 ? "No automations yet" : "No results for this filter"}
              </p>
              <p className="text-[11px] text-stone-400 mt-1">
                {automations.length === 0 ? "Install one from the catalog below, or create your own." : "Try a different filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAutomations.map((a) => {
                const meta = TRIGGER_META[a.triggerType];
                const steps = getEffectiveSteps(a);
                return (
                  <div
                    key={a.id}
                    className={`bg-white border-l-[3px] border border-stone-200 rounded-r-xl p-4 transition-opacity ${a.isActive ? "" : "opacity-60"}`}
                    style={{ borderLeftColor: meta?.borderColor ?? "#78716c" }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-stone-900">{a.name}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-full ${meta?.color ?? ""}`}>
                            {meta?.icon}{meta?.label}
                          </span>
                          {!a.isActive && <span className="text-[10px] font-bold text-stone-400 border border-stone-200 rounded-full px-2 py-0.5">Paused</span>}
                        </div>
                        <p className="mt-1.5 text-xs text-stone-500">
                          <span className="font-bold text-stone-700">When: </span>{triggerSummary(a)}
                        </p>
                        {steps.length > 0 && (
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            {steps.slice(0, 3).map((step, i) => (
                              <React.Fragment key={i}>
                                {i > 0 && <ArrowRight className="w-2.5 h-2.5 text-stone-300 shrink-0" />}
                                <span className="text-[10px] text-stone-500 bg-stone-100 rounded px-1.5 py-0.5">
                                  {step.delayMinutes > 0 && <span className="text-stone-400">{formatDelay(step.delayMinutes)}: </span>}
                                  {stepLabel(step)}
                                </span>
                              </React.Fragment>
                            ))}
                            {steps.length > 3 && <span className="text-[10px] text-stone-400">+{steps.length - 3} more</span>}
                          </div>
                        )}
                        <p className="mt-1.5 text-[10px] text-stone-400">
                          Fired <span className="font-black text-stone-900">{a.runCount}</span>&times;
                          {a.lastRunAt ? ` · Last ${new Date(a.lastRunAt).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => toggleActive(a)} title={a.isActive ? "Pause" : "Activate"} className="p-1.5 hover:bg-stone-100 rounded-lg cursor-pointer">
                          {a.isActive ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-stone-400" />}
                        </button>
                        <button onClick={() => handleDelete(a)} className="p-1.5 hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-lg cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Catalog ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[11px] font-black uppercase tracking-widest text-stone-900 border-l-4 border-stone-900 pl-3">Automation Catalog</h2>
              <p className="text-[10px] text-stone-400 mt-1.5 pl-3">Pre-built multi-step sequences — install in one click</p>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {["All", ...CATALOG_CATEGORIES].map((cat) => (
              <button key={cat} onClick={() => setActiveCatalogCategory(cat)}
                className={`px-4 py-1.5 text-xs font-bold border transition-all cursor-pointer rounded-full ${activeCatalogCategory === cat ? "bg-stone-900 text-white border-stone-900" : "border-stone-200 text-stone-600 hover:border-stone-400 bg-white"}`}>
                {cat === "All" ? `All (20)` : `${cat}${CATEGORY_COUNT[cat] ? ` (${CATEGORY_COUNT[cat]})` : ""}`}
              </button>
            ))}
          </div>

          {loadingCatalog ? (
            <div className="flex items-center gap-2 text-xs text-stone-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading catalog…
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCatalog.map((item) => {
                const isInstalled = installedIds.has(item.id);
                const busy = busyInstallId === item.id;
                const catCls = CATEGORY_COLOR[item.category] ?? "bg-stone-100 text-stone-500 border-stone-300";
                const trigMeta = TRIGGER_META[item.triggerType];

                return (
                  <div key={item.id}
                    className={`bg-white border flex flex-col overflow-hidden transition-all hover:border-stone-300 ${isInstalled ? "border-emerald-400 bg-emerald-50/20" : "border-stone-200"}`}>
                    {/* Hero emoji area */}
                    <div className="bg-stone-50 flex items-center justify-center h-16 border-b border-stone-100 text-4xl shrink-0">
                      {item.emoji}
                    </div>

                    {/* Title + description */}
                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-black text-stone-900 leading-snug">{item.title}</p>
                        {isInstalled && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Added
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">{item.description}</p>
                    </div>

                    {/* Steps timeline */}
                    <div className="px-4 pb-3 flex flex-col gap-0">
                      {item.steps.slice(0, 3).map((step, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="flex flex-col items-center shrink-0">
                            <div className="w-2 h-2 rounded-full bg-stone-300 mt-1" />
                            {i < Math.min(item.steps.length, 3) - 1 && <div className="w-px flex-1 bg-stone-200 min-h-[14px]" />}
                          </div>
                          <span className="text-[10px] text-stone-500 pb-1.5 leading-tight">
                            {step.delayMinutes > 0 && <span className="text-stone-400 font-bold">{formatDelay(step.delayMinutes)}: </span>}
                            {step.type === "send_template"
                              ? `Send "${(step.templateName ?? "").replace(/_/g, " ")}"`
                              : step.type === "add_tag"
                              ? `Add tag "${step.tag}"`
                              : `Remove tag "${step.tag}"`}
                          </span>
                        </div>
                      ))}
                      {item.steps.length > 3 && (
                        <span className="text-[10px] text-stone-400 ml-4">+{item.steps.length - 3} more steps</span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-stone-100 mt-auto gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catCls}`}>{item.category}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 border rounded-full ${trigMeta?.color ?? "bg-stone-50 text-stone-600 border-stone-200"}`}>
                          {trigMeta?.icon}{trigMeta?.label}
                        </span>
                      </div>
                      <button
                        onClick={() => handleInstall(item)}
                        disabled={busy || isInstalled}
                        className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-50 transition-colors shrink-0 ${isInstalled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-stone-900 text-white hover:bg-stone-700"}`}
                      >
                        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : isInstalled ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        {busy ? "Adding…" : isInstalled ? "Added" : "Install"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {isCreateOpen && (
        <CreateAutomationModal
          orgId={orgId}
          templates={templates}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(a) => {
            setAutomations((prev) => [...prev, a]);
            addSystemLog("crm", `Automation "${a.name}" created.`);
          }}
        />
      )}

      {/* Step picker modal */}
      {stepPickerItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md border border-stone-200 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider">{stepPickerItem.emoji} {stepPickerItem.title}</h3>
                <p className="text-[10px] text-stone-400 mt-0.5">Toggle off any steps you don&apos;t need</p>
              </div>
              <button onClick={() => setStepPickerItem(null)} className="p-1.5 hover:bg-stone-100 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-2">
              {stepPickerItem.steps.map((step, i) => {
                const enabled = stepPickerEnabled[i] ?? true;
                const label = step.type === "send_template"
                  ? `Send "${(step.templateName ?? "").replace(/_/g, " ")}"`
                  : step.type === "add_tag" ? `Add tag "${step.tag}"`
                  : `Remove tag "${step.tag}"`;
                const delay = step.delayMinutes === 0 ? "Immediately" : formatDelay(step.delayMinutes);
                return (
                  <div key={i} className={`flex items-center justify-between gap-3 p-3 border rounded-xl transition-opacity ${enabled ? "border-stone-200 bg-white" : "border-stone-100 bg-stone-50 opacity-50"}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-800 truncate">{label}</p>
                        <p className="text-[10px] text-stone-400">{delay}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setStepPickerEnabled((prev) => prev.map((v, j) => j === i ? !v : v))}
                      className="cursor-pointer shrink-0"
                    >
                      {enabled
                        ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                        : <ToggleLeft className="w-6 h-6 text-stone-300" />}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setStepPickerItem(null)} className="flex-1 border border-stone-200 py-2.5 text-sm font-bold hover:bg-stone-50 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={confirmInstall}
                disabled={!stepPickerEnabled.some(Boolean)}
                className="flex-1 bg-stone-900 text-white py-2.5 text-sm font-bold hover:bg-stone-700 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-3.5 h-3.5" />
                Install {stepPickerEnabled.filter(Boolean).length} step{stepPickerEnabled.filter(Boolean).length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
