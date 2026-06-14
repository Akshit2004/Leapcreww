"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/shared/context/AppContext";
import { useConfirm } from "@/shared/components/ui/ConfirmDialog";
import { useRouter, usePathname } from "next/navigation";
import { Loader, Zap, CheckCircle2, XCircle, Sparkles, ChevronRight, Send } from "lucide-react";
import type { RecipeWithStatus } from "../types";

const ALL = "All";

interface RecipesSectionProps {
  hideHeader?: boolean;
}

export const RecipesSection: React.FC<RecipesSectionProps> = ({ hideHeader = false }) => {
  const { organization } = useApp();
  const orgId = organization?.id;
  const router = useRouter();
  const pathname = usePathname();

  const [recipes, setRecipes] = useState<RecipeWithStatus[] | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [campaignBusyId, setCampaignBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerPrompt, setComposerPrompt] = useState("");
  const [composerLoading, setComposerLoading] = useState(false);
  const [composerResult, setComposerResult] = useState<string | null>(null);

  const confirm = useConfirm();

  const fetchRecipes = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/org/${orgId}/recipes`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.recipes);
      }
    } catch {
      // silent
    }
  }, [orgId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecipes();
  }, [fetchRecipes]);

  const handleInstall = async (recipe: RecipeWithStatus) => {
    if (!orgId) return;
    setBusyId(recipe.id);
    setError(null);
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
    setBusyId(recipe.id);
    setError(null);
    try {
      const res = await fetch(`/api/org/${orgId}/recipes/${recipe.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error || `Failed to disable ${recipe.title}.`); return; }
      await fetchRecipes();
    } catch { setError("Network error. Please try again."); }
    finally { setBusyId(null); }
  };

  const handleLaunchCampaign = async (recipe: RecipeWithStatus) => {
    if (!orgId || !recipe.firstTemplateName) return;
    setCampaignBusyId(recipe.id);
    setError(null);
    try {
      // Auto-install the automation if not already active
      if (!recipe.installed) {
        const installRes = await fetch(`/api/org/${orgId}/recipes/${recipe.id}`, { method: "POST" });
        if (!installRes.ok) {
          const d = await installRes.json();
          setError(d.error || "Failed to enable automation.");
          return;
        }
      }
      // Navigate to Campaigns tab and open the launch modal with template pre-selected
      router.push(`${pathname}?tab=campaigns&launchTemplate=${encodeURIComponent(recipe.firstTemplateName)}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCampaignBusyId(null);
    }
  };

  const handleCompose = async () => {
    if (!orgId || !composerPrompt.trim()) return;
    setComposerLoading(true);
    setComposerResult(null);
    try {
      const res = await fetch(`/api/org/${orgId}/recipes/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: composerPrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setComposerResult(`Error: ${data.error || "Failed to generate recipe."}`);
        return;
      }
      setComposerResult(`Recipe installed! Sequence: "${data.sequenceName}" with ${data.stepCount} step(s).`);
      setComposerPrompt("");
    } catch {
      setComposerResult("Network error. Please try again.");
    } finally {
      setComposerLoading(false);
    }
  };

  if (!recipes) return null;

  const categories = [ALL, ...Array.from(new Set(recipes.map((r) => r.category).filter(Boolean)))];
  const filtered = activeCategory === ALL ? recipes : recipes.filter((r) => r.category === activeCategory);

  return (
    <div>
      {!hideHeader && (
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-3">
          One-Click Automations
        </h3>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-4 py-2.5 mb-3 flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Category filter tabs */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeCategory === cat
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {filtered.map((recipe) => {
          const busy = busyId === recipe.id;
          return (
            <div
              key={recipe.id}
              className={`bg-white border p-4 flex flex-col gap-3 transition-colors ${
                recipe.installed ? "border-emerald-300" : "border-stone-200 hover:border-stone-400"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl leading-none">{recipe.emoji}</span>
                <div className="flex items-center gap-2">
                  {recipe.category && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400 bg-stone-100 px-1.5 py-0.5">
                      {recipe.category}
                    </span>
                  )}
                  {recipe.installed && (
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-1">
                <p className="text-sm font-bold text-stone-900">{recipe.title}</p>
                <p className="text-xs text-stone-500 leading-relaxed">{recipe.tagline}</p>
                <p className="text-[10px] text-stone-400 leading-relaxed pt-1">
                  <span className="font-bold uppercase tracking-wider">Fires when:</span>{" "}
                  {recipe.firesWhen}
                </p>
              </div>

              <div className="pt-1 border-t border-stone-100 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-stone-400 font-medium">
                    {recipe.stepCount} step{recipe.stepCount === 1 ? "" : "s"}
                    {recipe.templateCount > 0 && ` · ${recipe.templateCount} template`}
                  </span>
                  {recipe.installed ? (
                    <button
                      onClick={() => handleUninstall(recipe)}
                      disabled={busy}
                      className="flex items-center gap-1 text-[10px] font-bold text-stone-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {busy ? <Loader className="w-3 h-3 animate-spin" /> : null}
                      Disable
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInstall(recipe)}
                      disabled={busy}
                      className="flex items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-stone-900 border border-stone-200 px-2 py-1 transition-colors cursor-pointer disabled:opacity-50 bg-white hover:bg-stone-50"
                    >
                      {busy ? <Loader className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      {busy ? "Enabling..." : "Enable Automation"}
                    </button>
                  )}
                </div>

                {/* Launch Campaign CTA */}
                {recipe.firstTemplateName && (
                  <button
                    onClick={() => handleLaunchCampaign(recipe)}
                    disabled={campaignBusyId === recipe.id}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-950 hover:bg-stone-800 text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {campaignBusyId === recipe.id
                      ? <><Loader className="w-3 h-3 animate-spin" /> Opening...</>
                      : <><Send className="w-3 h-3" /> Launch Campaign →</>
                    }
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Recipe Composer */}
      <div className="mt-6 border border-dashed border-stone-300 bg-white p-4">
        <button
          onClick={() => setComposerOpen((v) => !v)}
          className="flex items-center gap-2 w-full text-left cursor-pointer group"
        >
          <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
          <span className="text-sm font-bold text-stone-700">AI Recipe Composer</span>
          <span className="text-xs text-stone-400 flex-1">Generate a custom automation from a description</span>
          <ChevronRight
            className={`w-4 h-4 text-stone-400 transition-transform ${composerOpen ? "rotate-90" : ""}`}
          />
        </button>

        {composerOpen && (
          <div className="mt-4 space-y-3">
            <textarea
              value={composerPrompt}
              onChange={(e) => setComposerPrompt(e.target.value)}
              placeholder="Describe your use case, e.g. 'Send a welcome message to new leads from Instagram ads, then follow up 2 hours later with a product video link'"
              className="w-full h-24 text-sm text-stone-800 placeholder:text-stone-400 bg-stone-50 border border-stone-200 px-3 py-2 resize-none focus:outline-none focus:border-stone-400"
            />
            {composerResult && (
              <div className={`text-xs font-medium px-3 py-2 ${
                composerResult.startsWith("Error") || composerResult.startsWith("Network")
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}>
                {composerResult}
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={handleCompose}
                disabled={composerLoading || !composerPrompt.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer"
              >
                {composerLoading ? <Loader className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {composerLoading ? "Generating..." : "Generate & Install"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
