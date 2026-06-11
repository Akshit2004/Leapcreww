"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/shared/context/AppContext";
import {
  Code2,
  Copy,
  CheckCircle2,
  XCircle,
  Loader,
  Save,
  MessageCircle,
  MousePointerClick,
} from "lucide-react";

interface WidgetState {
  publicKey: string;
  enabled: boolean;
  phoneNumber: string;
  position: string;
  color: string;
  greeting: string;
  prefilledText: string;
  showGreeting: boolean;
  clicks: number;
}

const COLOR_PRESETS = ["#25D366", "#1c1917", "#1877F2", "#7c3aed", "#e11d48"];

/**
 * Website Chat Button configurator — Settings card.
 * Lets an admin style the embeddable widget, preview it live, and copy the
 * one-line snippet. The config row (and its publicKey) is auto-created by the
 * GET endpoint on first load, so the snippet works immediately.
 */
export const WidgetCard: React.FC = () => {
  const { organization } = useApp();
  const orgId = organization?.id;

  const [widget, setWidget] = useState<WidgetState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchWidget = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/org/${orgId}/widget`);
      if (res.ok) {
        const data = await res.json();
        setWidget(data.widget);
      }
    } catch {
      console.error("Failed to load widget config");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    // Fetch-on-mount: synchronizing with the persisted widget config.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWidget();
  }, [fetchWidget]);

  const set = <K extends keyof WidgetState>(key: K, value: WidgetState[K]) =>
    setWidget((w) => (w ? { ...w, [key]: value } : w));

  const handleSave = async () => {
    if (!orgId || !widget) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/org/${orgId}/widget`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: widget.enabled,
          phoneNumber: widget.phoneNumber,
          position: widget.position,
          color: widget.color,
          greeting: widget.greeting,
          prefilledText: widget.prefilledText,
          showGreeting: widget.showGreeting,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save widget settings.");
        return;
      }
      setWidget(data.widget);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const snippet = widget
    ? `<script src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.js" data-wf="${widget.publicKey}" async></script>`
    : "";

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't access the clipboard — copy the snippet manually.");
    }
  };

  const liveReady = Boolean(widget?.enabled && widget?.phoneNumber);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-stone-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Website Chat Button</h3>
              <p className="text-stone-400 text-[11px] mt-0.5">
                Paste one line on any site — every click opens a WhatsApp chat with you.
              </p>
            </div>
          </div>
          {widget && (
            <div className="flex items-center gap-2 text-stone-400">
              <MousePointerClick className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {widget.clicks} clicks
              </span>
            </div>
          )}
        </div>
      </div>

      {loading || !widget ? (
        <div className="p-8 flex items-center justify-center">
          <Loader className="w-5 h-5 animate-spin text-stone-400" />
        </div>
      ) : (
        <div className="p-6 space-y-5">
          {/* Embed snippet — the headline act, shown first. */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
              Embed Snippet
            </label>
            <div className="flex items-stretch gap-2">
              <code className="flex-1 bg-stone-900 text-emerald-300 rounded-xl px-4 py-3 text-[11px] font-mono overflow-x-auto whitespace-nowrap">
                {snippet}
              </code>
              <button
                onClick={copySnippet}
                className="flex items-center gap-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            {!liveReady && (
              <p className="text-[11px] text-amber-600 font-medium">
                Add a WhatsApp number and enable the widget below to make the snippet live.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ─── Configurator ─────────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-stone-50 border border-stone-100 rounded-xl px-4 py-3">
                <span className="text-xs font-bold text-stone-700">Widget enabled</span>
                <button
                  onClick={() => set("enabled", !widget.enabled)}
                  className={`relative w-10 h-5.5 rounded-full transition-all cursor-pointer ${widget.enabled ? "bg-emerald-500" : "bg-stone-300"}`}
                  aria-label="Toggle widget"
                >
                  <span
                    className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all ${widget.enabled ? "left-5" : "left-0.5"}`}
                  />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  WhatsApp Number (with country code)
                </label>
                <input
                  type="tel"
                  value={widget.phoneNumber}
                  onChange={(e) => set("phoneNumber", e.target.value)}
                  placeholder="e.g. 919876543210"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                    Position
                  </label>
                  <div className="flex gap-2">
                    {(["bottom-left", "bottom-right"] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => set("position", pos)}
                        className={`flex-1 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                          widget.position === pos
                            ? "bg-stone-900 text-white border-stone-900"
                            : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        {pos === "bottom-left" ? "Left" : "Right"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                    Button Color
                  </label>
                  <div className="flex items-center gap-1.5">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => set("color", c)}
                        style={{ backgroundColor: c }}
                        className={`w-7 h-7 rounded-full cursor-pointer transition-all ${
                          widget.color === c ? "ring-2 ring-offset-2 ring-stone-900" : "hover:scale-110"
                        }`}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Greeting Bubble
                </label>
                <input
                  type="text"
                  value={widget.greeting}
                  onChange={(e) => set("greeting", e.target.value)}
                  maxLength={120}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Prefilled Visitor Message
                </label>
                <input
                  type="text"
                  value={widget.prefilledText}
                  onChange={(e) => set("prefilledText", e.target.value)}
                  maxLength={200}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900 transition-all"
                />
              </div>

              <div className="flex items-center justify-between bg-stone-50 border border-stone-100 rounded-xl px-4 py-3">
                <span className="text-xs font-bold text-stone-700">Show greeting bubble</span>
                <button
                  onClick={() => set("showGreeting", !widget.showGreeting)}
                  className={`relative w-10 h-5.5 rounded-full transition-all cursor-pointer ${widget.showGreeting ? "bg-emerald-500" : "bg-stone-300"}`}
                  aria-label="Toggle greeting bubble"
                >
                  <span
                    className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all ${widget.showGreeting ? "left-5" : "left-0.5"}`}
                  />
                </button>
              </div>
            </div>

            {/* ─── Live Preview ─────────────────────────────────── */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                Live Preview
              </label>
              <div className="relative h-full min-h-[320px] bg-stone-100 border border-stone-200 rounded-xl overflow-hidden">
                {/* Mock website chrome */}
                <div className="bg-white border-b border-stone-200 px-4 py-2.5 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-200" />
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-200" />
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-200" />
                  <span className="ml-3 text-[10px] text-stone-400 font-mono">yourwebsite.com</span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="h-3 w-2/3 bg-stone-200 rounded" />
                  <div className="h-3 w-1/2 bg-stone-200 rounded" />
                  <div className="h-20 w-full bg-stone-200/60 rounded-lg" />
                </div>

                {/* Widget preview */}
                <div
                  className={`absolute bottom-4 flex flex-col gap-2 ${
                    widget.position === "bottom-left" ? "left-4 items-start" : "right-4 items-end"
                  }`}
                >
                  {widget.showGreeting && widget.greeting && (
                    <div className="max-w-[200px] bg-white rounded-xl shadow-lg px-3 py-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">
                        {organization?.name || "Your Brand"}
                      </p>
                      <p className="text-[11px] text-stone-800 leading-snug">{widget.greeting}</p>
                    </div>
                  )}
                  <div
                    style={{ backgroundColor: widget.color }}
                    className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
                  >
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-4 py-2.5 rounded-xl flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving..." : "Save Widget"}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Saved
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
