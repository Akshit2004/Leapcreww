"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Rocket,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  PlayCircle,
  Clock,
  CheckCircle2,
  SkipForward,
  ExternalLink,
  Calendar,
  Tag,
  Loader2,
  Save,
} from "lucide-react";
import { useApp } from "@/shared/context/AppContext";
import { useParams } from "next/navigation";
import { notify } from "@/shared/lib/toast";
import { useConfirm } from "@/shared/components/ui/ConfirmDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LaunchStep {
  id: string;
  label: string;
  offsetMinutes: number;
  message: string;
  sendAt: string;
  status: "pending" | "sent" | "skipped";
  sentCount: number;
}

interface Launch {
  id: string;
  name: string;
  description?: string;
  productUrl?: string;
  launchAt: string;
  status: "draft" | "scheduled" | "ended";
  targetTag?: string;
  steps: LaunchStep[];
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }) + " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtOffset(minutes: number): string {
  if (minutes === 0) return "At launch";
  const abs = Math.abs(minutes);
  const dir = minutes < 0 ? "before" : "after";
  if (abs < 60) return `${abs} min ${dir}`;
  if (abs < 1440) return `${Math.round(abs / 60)} hr ${dir}`;
  return `${Math.round(abs / 1440)} day${Math.round(abs / 1440) !== 1 ? "s" : ""} ${dir}`;
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function LaunchStatusBadge({ status }: { status: Launch["status"] }) {
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border border-[#1D211F]/20 text-[#1D211F]/50 bg-white">
        Draft
      </span>
    );
  }
  if (status === "scheduled") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border border-[#D05E3C]/40 text-[#D05E3C] bg-[#D05E3C]/5">
        <Clock className="w-3 h-3" />
        Scheduled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border border-[#1D211F]/20 text-[#1D211F]/40 bg-[#fafaf9]">
      <CheckCircle2 className="w-3 h-3" />
      Ended
    </span>
  );
}

function StepStatusIcon({ status }: { status: LaunchStep["status"] }) {
  if (status === "sent") return <CheckCircle2 className="w-3.5 h-3.5 text-[#D05E3C]" />;
  if (status === "skipped") return <SkipForward className="w-3.5 h-3.5 text-[#1D211F]/30" />;
  return <Clock className="w-3.5 h-3.5 text-[#1D211F]/30" />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LaunchesTab() {
  const { organization } = useApp();
  const params = useParams();
  const orgId = (params?.orgId as string) ?? organization?.id ?? "";
  const confirm = useConfirm();

  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editSteps, setEditSteps] = useState<Record<string, string>>({});
  const [savingSteps, setSavingSteps] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    productUrl: "",
    launchAt: "",
    targetTag: "",
  });

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchLaunches = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/org/${orgId}/launches`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLaunches(data.launches ?? []);
    } catch {
      notify.error("Load failed", "Could not fetch launches. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchLaunches();
  }, [fetchLaunches]);

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !form.name.trim() || !form.launchAt) return;
    setCreating(true);
    try {
      const body: Record<string, string> = {
        name: form.name.trim(),
        launchAt: new Date(form.launchAt).toISOString(),
      };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.productUrl.trim()) body.productUrl = form.productUrl.trim();
      if (form.targetTag.trim()) body.targetTag = form.targetTag.trim();

      const res = await fetch(`/api/org/${orgId}/launches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Creation failed");
      }
      const data = await res.json();
      setLaunches((prev) => [data.launch, ...prev]);
      setShowCreate(false);
      setForm({ name: "", description: "", productUrl: "", launchAt: "", targetTag: "" });
      notify.success("Launch created", `"${data.launch.name}" is ready — activate it when you're set.`);
    } catch (err: unknown) {
      notify.error("Create failed", err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  };

  // ── Activate ───────────────────────────────────────────────────────────────

  const handleActivate = async (launch: Launch) => {
    const ok = await confirm({
      title: "Activate this launch?",
      description: "Once activated, messages will fire automatically on schedule. This cannot be undone.",
      confirmLabel: "Activate",
      tone: "default",
    });
    if (!ok) return;
    setActivatingId(launch.id);
    try {
      const res = await fetch(`/api/org/${orgId}/launches/${launch.id}/activate`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Activation failed");
      }
      const data = await res.json();
      setLaunches((prev) => prev.map((l) => (l.id === launch.id ? data.launch : l)));
      notify.success("Launch activated", `"${launch.name}" is now scheduled and will fire automatically.`);
    } catch (err: unknown) {
      notify.error("Activation failed", err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setActivatingId(null);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (launch: Launch) => {
    const ok = await confirm({
      title: `Delete "${launch.name}"?`,
      description: "This permanently removes the launch and all its steps. This cannot be undone.",
      confirmLabel: "Delete launch",
      tone: "danger",
    });
    if (!ok) return;
    setDeletingId(launch.id);
    try {
      const res = await fetch(`/api/org/${orgId}/launches/${launch.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Delete failed");
      }
      setLaunches((prev) => prev.filter((l) => l.id !== launch.id));
      if (expandedId === launch.id) setExpandedId(null);
      notify.success("Launch deleted", `"${launch.name}" has been removed.`);
    } catch (err: unknown) {
      notify.error("Delete failed", err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Step editor ────────────────────────────────────────────────────────────

  const toggleExpand = (launch: Launch) => {
    if (expandedId === launch.id) {
      setExpandedId(null);
      setEditSteps({});
    } else {
      setExpandedId(launch.id);
      const init: Record<string, string> = {};
      launch.steps.forEach((s) => { init[s.id] = s.message; });
      setEditSteps(init);
    }
  };

  const handleSaveSteps = async (launch: Launch) => {
    setSavingSteps(true);
    try {
      const steps = launch.steps.map((s) => ({ id: s.id, message: editSteps[s.id] ?? s.message }));
      const res = await fetch(`/api/org/${orgId}/launches/${launch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Save failed");
      }
      const data = await res.json();
      setLaunches((prev) => prev.map((l) => (l.id === launch.id ? data.launch : l)));
      notify.success("Steps saved", "Message edits have been saved.");
    } catch (err: unknown) {
      notify.error("Save failed", err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSavingSteps(false);
    }
  };

  // ── Body scroll lock for create modal ──────────────────────────────────────

  useEffect(() => {
    document.body.style.overflow = showCreate ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showCreate]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto bg-[#fafaf9] animate-slide-up">

      {/* Header */}
      <div className="flex max-sm:flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1D211F]/10 pb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#1D211F] uppercase font-serif">
            Flash Sale &amp; Launch Sequences
          </h2>
          <p className="text-[#1D211F]/50 text-xs mt-1">
            Automated multi-step WhatsApp broadcasts wired to a countdown clock around your product launch.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#1D211F] hover:bg-[#1D211F]/80 text-white font-bold text-xs px-4 py-2.5 rounded-none border border-[#1D211F] transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          CREATE LAUNCH
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-[#1D211F]/30">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : launches.length === 0 ? (
        /* Empty state */
        <div className="border border-dashed border-[#1D211F]/15 bg-white p-16 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border border-[#1D211F]/10 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-[#1D211F]/30" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sm text-[#1D211F] uppercase tracking-wide font-serif">No launches yet</p>
            <p className="text-xs text-[#1D211F]/50 max-w-xs">
              Create a launch sequence and WappFlow will auto-fire your countdown messages — teaser, reminder, and post-launch follow-ups.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-[#D05E3C] hover:bg-[#D05E3C]/90 text-white font-bold text-xs px-5 py-2.5 rounded-none transition-colors cursor-pointer mt-2"
          >
            <Plus className="w-4 h-4" />
            CREATE LAUNCH
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {launches.map((launch) => {
            const isExpanded = expandedId === launch.id;
            const isDraft = launch.status === "draft";

            return (
              <div
                key={launch.id}
                className="bg-white border border-[#1D211F]/10 hover:border-[#1D211F]/30 transition-colors"
              >
                {/* Card header row */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">

                  {/* Left: name + meta */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-[#1D211F] leading-none">{launch.name}</span>
                      <LaunchStatusBadge status={launch.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#1D211F]/50">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(launch.launchAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {launch.targetTag ? launch.targetTag : "All contacts"}
                      </span>
                      {launch.productUrl && (
                        <a
                          href={launch.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-[#D05E3C] transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Product link
                        </a>
                      )}
                    </div>
                    {launch.description && (
                      <p className="text-[11px] text-[#1D211F]/40 leading-relaxed">{launch.description}</p>
                    )}
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isDraft && (
                      <>
                        <button
                          onClick={() => handleActivate(launch)}
                          disabled={activatingId === launch.id}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1.5 border border-[#D05E3C] text-[#D05E3C] hover:bg-[#D05E3C] hover:text-white transition-colors cursor-pointer rounded-none disabled:opacity-40"
                        >
                          {activatingId === launch.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <PlayCircle className="w-3.5 h-3.5" />}
                          Activate
                        </button>
                        <button
                          onClick={() => handleDelete(launch)}
                          disabled={deletingId === launch.id}
                          className="p-1.5 text-[#1D211F]/30 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors cursor-pointer rounded-none disabled:opacity-40"
                        >
                          {deletingId === launch.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => toggleExpand(launch)}
                      className="flex items-center gap-1 text-[10px] font-bold uppercase px-3 py-1.5 border border-[#1D211F]/15 text-[#1D211F]/60 hover:border-[#1D211F]/40 hover:text-[#1D211F] transition-colors cursor-pointer rounded-none"
                    >
                      {isExpanded ? (
                        <><ChevronUp className="w-3.5 h-3.5" /> Hide steps</>
                      ) : (
                        <><ChevronDown className="w-3.5 h-3.5" /> View steps</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Steps panel */}
                {isExpanded && (
                  <div className="border-t border-[#1D211F]/8 px-4 sm:px-5 pb-5 pt-4 space-y-3 bg-[#fafaf9]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] tracking-widest uppercase text-[#1D211F]/40">
                        {launch.steps.length} steps
                      </span>
                      <button
                        onClick={() => handleSaveSteps(launch)}
                        disabled={savingSteps}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1.5 bg-[#1D211F] text-white hover:bg-[#1D211F]/80 transition-colors cursor-pointer rounded-none disabled:opacity-40"
                      >
                        {savingSteps
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Save className="w-3 h-3" />}
                        Save messages
                      </button>
                    </div>

                    <div className="space-y-2">
                      {launch.steps.map((step, idx) => (
                        <div
                          key={step.id}
                          className="bg-white border border-[#1D211F]/8 p-3 sm:p-4 space-y-2"
                        >
                          {/* Step meta row */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[9px] tracking-widest uppercase text-[#1D211F]/30 bg-[#1D211F]/5 px-1.5 py-0.5 border border-[#1D211F]/8">
                                Step {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-[#1D211F]">{step.label}</span>
                              <span className="text-[10px] text-[#1D211F]/40">{fmtOffset(step.offsetMinutes)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <StepStatusIcon status={step.status} />
                              <span className="font-mono text-[10px] tracking-widest uppercase text-[#1D211F]/40">
                                {step.status === "sent"
                                  ? `${step.sentCount} sent`
                                  : step.status === "skipped"
                                    ? "skipped"
                                    : fmtDate(step.sendAt)}
                              </span>
                            </div>
                          </div>

                          {/* Editable message */}
                          <textarea
                            rows={3}
                            value={editSteps[step.id] ?? step.message}
                            onChange={(e) =>
                              setEditSteps((prev) => ({ ...prev, [step.id]: e.target.value }))
                            }
                            className="w-full bg-[#fafaf9] border border-[#1D211F]/10 text-[#1D211F] text-xs leading-relaxed p-2.5 resize-none focus:outline-none focus:border-[#1D211F]/40 font-medium rounded-none placeholder:text-[#1D211F]/30"
                            placeholder="Enter WhatsApp message for this step…"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Launch modal ─────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#1D211F]/20 rounded-none animate-slide-up flex flex-col overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1D211F]/10 bg-[#fafaf9] shrink-0">
              <h3 className="font-bold text-xs uppercase tracking-widest text-[#1D211F] flex items-center gap-2">
                <Rocket className="w-4 h-4" />
                New Launch Sequence
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 hover:bg-[#1D211F]/8 text-[#1D211F]/50 transition-colors cursor-pointer rounded-none border border-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">

              {/* Name */}
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] tracking-widest uppercase text-[#1D211F]/50">
                  Launch name <span className="text-[#D05E3C]">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Summer Drop 2026"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white border border-[#1D211F]/15 text-[#1D211F] placeholder:text-[#1D211F]/25 text-xs py-2.5 px-3.5 focus:outline-none focus:border-[#1D211F]/50 rounded-none"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] tracking-widest uppercase text-[#1D211F]/50">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="What are you launching?"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full bg-white border border-[#1D211F]/15 text-[#1D211F] placeholder:text-[#1D211F]/25 text-xs py-2.5 px-3.5 focus:outline-none focus:border-[#1D211F]/50 resize-none rounded-none"
                />
              </div>

              {/* Product URL */}
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] tracking-widest uppercase text-[#1D211F]/50">
                  Product URL
                </label>
                <input
                  type="url"
                  placeholder="https://yourstore.com/product"
                  value={form.productUrl}
                  onChange={(e) => setForm((f) => ({ ...f, productUrl: e.target.value }))}
                  className="w-full bg-white border border-[#1D211F]/15 text-[#1D211F] placeholder:text-[#1D211F]/25 text-xs py-2.5 px-3.5 focus:outline-none focus:border-[#1D211F]/50 rounded-none"
                />
              </div>

              {/* Launch date+time */}
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] tracking-widest uppercase text-[#1D211F]/50">
                  Launch date &amp; time <span className="text-[#D05E3C]">*</span>
                </label>
                <input
                  required
                  type="datetime-local"
                  value={form.launchAt}
                  onChange={(e) => setForm((f) => ({ ...f, launchAt: e.target.value }))}
                  className="w-full bg-white border border-[#1D211F]/15 text-[#1D211F] text-xs py-2.5 px-3.5 focus:outline-none focus:border-[#1D211F]/50 rounded-none"
                />
              </div>

              {/* Target tag */}
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] tracking-widest uppercase text-[#1D211F]/50">
                  Target tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. vip-waitlist  (leave blank = all contacts)"
                  value={form.targetTag}
                  onChange={(e) => setForm((f) => ({ ...f, targetTag: e.target.value }))}
                  className="w-full bg-white border border-[#1D211F]/15 text-[#1D211F] placeholder:text-[#1D211F]/25 text-xs py-2.5 px-3.5 focus:outline-none focus:border-[#1D211F]/50 rounded-none"
                />
                <p className="text-[10px] text-[#1D211F]/35">
                  Only contacts with this tag will receive the sequence. Leave blank to target everyone.
                </p>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#1D211F]/8">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-xs font-bold text-[#1D211F]/60 bg-white border border-[#1D211F]/15 hover:border-[#1D211F]/40 hover:text-[#1D211F] transition-colors cursor-pointer rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !form.name.trim() || !form.launchAt}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1D211F] hover:bg-[#1D211F]/80 border border-[#1D211F] disabled:opacity-40 transition-colors cursor-pointer rounded-none flex items-center gap-1.5"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                  {creating ? "Creating…" : "Create launch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
