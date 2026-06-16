"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/shared/context/AppContext";
import { useConfirm } from "@/shared/components/ui/ConfirmDialog";
import {
  Loader, Zap, CheckCircle2, XCircle, Sparkles, X, Plus,
} from "lucide-react";
import type { RecipeWithStatus } from "../types";

const ALL = "All";

const CATEGORY_COLOR: Record<string, { bg: string; text: string; bar: string }> = {
  "E-Commerce":       { bg: "bg-blue-50",   text: "text-blue-700",   bar: "bg-blue-400" },
  "Engagement":       { bg: "bg-violet-50", text: "text-violet-700", bar: "bg-violet-400" },
  "Lead Generation":  { bg: "bg-amber-50",  text: "text-amber-700",  bar: "bg-amber-400" },
  "Customer Success": { bg: "bg-emerald-50",text: "text-emerald-700",bar: "bg-emerald-400" },
  "Retention":        { bg: "bg-red-50",    text: "text-red-700",    bar: "bg-red-400" },
  "Launches":         { bg: "bg-orange-50", text: "text-orange-700", bar: "bg-orange-400" },
  "Fulfillment":      { bg: "bg-sky-50",    text: "text-sky-700",    bar: "bg-sky-400" },
  "Personalisation":  { bg: "bg-pink-50",   text: "text-pink-700",   bar: "bg-pink-400" },
};

const catStyle = (cat?: string) =>
  CATEGORY_COLOR[cat ?? ""] ?? { bg: "bg-stone-100", text: "text-stone-500", bar: "bg-stone-300" };

interface RecipesSectionProps {
  hideHeader?: boolean;
}

export const RecipesSection: React.FC<RecipesSectionProps> = ({ hideHeader = false }) => {
  const { organization } = useApp();
  const orgId = organization?.id;

  const [recipes, setRecipes] = useState<RecipeWithStatus[] | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI Composer modal
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerPrompt, setComposerPrompt] = useState("");
  const [composerLoading, setComposerLoading] = useState(false);
  const [composerResult, setComposerResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const confirm = useConfirm();

  const fetchRecipes = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/org/${orgId}/recipes`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.recipes);
      }
    } catch { /* silent */ }
  }, [orgId]);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  const handleInstall = async (recipe: RecipeWithStatus) => {
    if (!orgId) return;
    setBusyId(recipe.id); setError(null);
    try {
      const res = await fetch(`/api/org/${orgId}/recipes/${recipe.id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `Failed to enable ${recipe.title}.`); return; }
      await fetchRecipes();
    } catch { setError("Network error. Please try again."); }
    finally { setBusyId(null); }
  };

  const handleUninstall = async (recipe: RecipeWithStatus) => {
    if (!orgId) return;
    const confirmed = await confirm({
      title: `Disable ${recipe.title}?`,
      description: "The automation sequence will be removed. Templates already submitted to Meta are kept.",
      tone: "danger",
      confirmLabel: "Disable",
    });
    if (!confirmed) return;
    setBusyId(recipe.id); setError(null);
    try {
      const res = await fetch(`/api/org/${orgId}/recipes/${recipe.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error || `Failed to disable ${recipe.title}.`); return; }
      await fetchRecipes();
    } catch { setError("Network error. Please try again."); }
    finally { setBusyId(null); }
  };

  const handleCompose = async () => {
    if (!orgId || !composerPrompt.trim()) return;
    setComposerLoading(true); setComposerResult(null);
    try {
      const res = await fetch(`/api/org/${orgId}/recipes/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: composerPrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setComposerResult({ ok: false, msg: data.error || "Failed to generate recipe." });
        return;
      }
      setComposerResult({ ok: true, msg: `Recipe installed! Sequence: "${data.sequenceName}" with ${data.stepCount} step(s).` });
      setComposerPrompt("");
      await fetchRecipes();
    } catch {
      setComposerResult({ ok: false, msg: "Network error. Please try again." });
    } finally {
      setComposerLoading(false);
    }
  };

  if (!recipes) return null;

  const categories = [ALL, ...Array.from(new Set(recipes.map((r) => r.category).filter(Boolean)))];
  const filtered = activeCategory === ALL ? recipes : recipes.filter((r) => r.category === activeCategory);
  const activeCount = recipes.filter((r) => r.installed).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-stone-100 animate-slide-up">

      {/* ── Sticky header ── */}
      {!hideHeader && (
        <div className="shrink-0 bg-white border-b border-stone-200 px-4 sm:px-8">
          <div className="flex items-center justify-between py-4 gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-black tracking-tight text-stone-900">Automations</h2>
              <p className="text-stone-500 text-xs mt-0.5">
                Event-triggered sequences · {activeCount} active of {recipes.length}
              </p>
            </div>
            <button
              onClick={() => { setComposerOpen(true); setComposerResult(null); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-wa-green hover:bg-wa-green-dark text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              New Recipe
            </button>
          </div>

          {/* Category filter pills */}
          <div className="flex items-center gap-1.5 pb-3 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                  activeCategory === cat
                    ? "bg-wa-green text-white border-wa-green"
                    : "text-stone-500 border-stone-300 hover:border-stone-500 bg-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 py-6 space-y-4">

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 font-medium">
            <XCircle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((recipe) => {
            const busy = busyId === recipe.id;
            const cs = catStyle(recipe.category);
            return (
              <div
                key={recipe.id}
                className={`bg-white flex flex-col overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-md ${
                  recipe.installed ? "border-2 border-emerald-300" : "border border-stone-200"
                }`}
              >
                {/* Colour accent bar */}
                <div className={`h-1 shrink-0 ${cs.bar}`} />

                {/* Card header */}
                <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-stone-100">
                  <span className="text-2xl leading-none">{recipe.emoji}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {recipe.category && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cs.bg} ${cs.text} border-current/20`}>
                        {recipe.category}
                      </span>
                    )}
                    {recipe.installed && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 flex-1 space-y-1.5">
                  <p className="text-sm font-black text-stone-900 leading-snug">{recipe.title}</p>
                  <p className="text-xs text-stone-500 leading-relaxed">{recipe.tagline}</p>
                  <p className="text-[11px] text-stone-400 leading-relaxed pt-1">
                    <span className="font-bold text-stone-500">Fires when:</span>{" "}
                    {recipe.firesWhen}
                  </p>
                </div>

                {/* Footer */}
                <div className="px-5 pb-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-stone-400 font-medium">
                    {recipe.stepCount} step{recipe.stepCount === 1 ? "" : "s"}
                    {recipe.templateCount > 0 && ` · ${recipe.templateCount} template`}
                  </span>

                  {recipe.installed ? (
                    <button
                      onClick={() => handleUninstall(recipe)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      {busy ? <Loader className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                      {busy ? "Disabling…" : "Disable"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInstall(recipe)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-wa-green hover:bg-wa-green-dark text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {busy ? <Loader className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      {busy ? "Enabling…" : "Enable"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── AI Recipe Composer Modal ── */}
      {composerOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setComposerOpen(false)} />
          <div className="relative bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col">

            {/* Header */}
            <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                  <h3 className="text-base font-black text-stone-900">AI Recipe Composer</h3>
                </div>
                <p className="text-xs text-stone-500 mt-1">Describe your use case — AI will build and install a custom automation</p>
              </div>
              <button
                onClick={() => setComposerOpen(false)}
                className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <textarea
                autoFocus
                value={composerPrompt}
                onChange={(e) => setComposerPrompt(e.target.value)}
                placeholder="e.g. Send a welcome message to new leads from Instagram ads, then follow up 2 hours later with a product video link"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-wa-green resize-none min-h-[110px] transition-colors"
              />

              {composerResult && (
                <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs font-medium border ${
                  composerResult.ok
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}>
                  {composerResult.ok
                    ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  {composerResult.msg}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setComposerOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCompose}
                disabled={composerLoading || !composerPrompt.trim()}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {composerLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {composerLoading ? "Generating…" : "Generate & Install"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
