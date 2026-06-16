"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  ThumbsUp,
  Loader,
  ChevronDown,
  Plus,
} from "lucide-react";
import { useApp } from "@/shared/context/AppContext";
import { notify } from "@/shared/lib/toast";
import { UploadButton } from "@/shared/lib/uploadthing";

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  /** Fires with the formatted (snake_case) template name once submitted. */
  onCreated?: (templateName: string) => void;
}

/**
 * Self-contained "Create WhatsApp template" wizard — the Meta-compliant form,
 * the Brand-Aware AI generator, and the AI compliance auditor.
 *
 * Lives as a standalone component so it can be reused both on the Templates tab
 * and inline inside the Campaign builder (consolidated "create" actions), without
 * forcing the user to navigate away mid-flow.
 */
export const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({
  isOpen,
  onClose,
  orgId,
  onCreated,
}) => {
  const { submitMetaTemplate, addSystemLog } = useApp();

  // Wizard form state
  const [templateName, setTemplateName] = useState("");
  const [category, setCategory] = useState("Marketing");
  const [bodyText, setBodyText] = useState("");
  const [mediaType, setMediaType] = useState("none");
  const [mediaUrl, setMediaUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Buttons Builder
  const [buttonsList, setButtonsList] = useState<string[]>([]);
  const [newButtonText, setNewButtonText] = useState("");

  // AI Compliance Copilot state
  const [aiOptimizing, setAiOptimizing] = useState(false);
  const [complianceScore, setComplianceScore] = useState<number | null>(null);
  const [complianceFeedback, setComplianceFeedback] = useState<string[]>([]);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [categoryReasoning, setCategoryReasoning] = useState<string | null>(null);
  const [categoryApplied, setCategoryApplied] = useState(false);

  // Client-side quick validation rules
  const [clientWarnings, setClientWarnings] = useState<string[]>([]);

  // Brand-Aware AI generator (topic + URL → body copy)
  const [showGenerator, setShowGenerator] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genUrl, setGenUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Lock body scroll while open — restores the previous value so this works
  // even when nested above another modal (e.g. the campaign builder).
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Real-time client-side compliance scanning
  useEffect(() => {
    const timer = setTimeout(() => {
      const warnings: string[] = [];
      if (!bodyText) {
        setClientWarnings([]);
        return;
      }

      // 1. Text Length check (Meta limit: 1024 characters for body)
      if (bodyText.length > 1024) {
        warnings.push("Body text length exceeds Meta limit of 1024 characters.");
      }

      // 2. Variable formatting checks
      const varRegex = /\{\{(\d+)\}\}/g;
      const matches = Array.from(bodyText.matchAll(varRegex)).map((m) => parseInt(m[1]));

      if (matches.length > 0) {
        // Check if variables are sequential starting at 1 e.g. {{1}}, {{2}}
        const sorted = [...matches].sort((a, b) => a - b);
        const isSequential = sorted.every((val, idx) => val === idx + 1);

        if (!isSequential) {
          warnings.push("Variables must start at {{1}} and be sequential (e.g. {{1}}, {{2}}, {{3}}).");
        }

        // Check for back-to-back variables like {{1}}{{2}}
        if (/\{\{\d\}\}\s*\{\{\d\}\}/.test(bodyText)) {
          warnings.push("Meta rejects back-to-back variables (e.g., '{{1}}{{2}}'). Add surrounding descriptive words.");
        }
      }

      // 3. Prohibited terms check for Utility category
      if (category === "Utility") {
        const promotionalTerms = ["discount", "offer", "sale", "coupon", "promo", "free", "buy"];
        const containsPromo = promotionalTerms.some((term) => bodyText.toLowerCase().includes(term));
        if (containsPromo) {
          warnings.push("Utility templates cannot contain promotional language (e.g., 'discount', 'coupon', 'sale'). Submissions may be rejected.");
        }
      }

      setClientWarnings(warnings);
    }, 0);
    return () => clearTimeout(timer);
  }, [bodyText, category]);

  const resetWizard = () => {
    setTemplateName("");
    setBodyText("");
    setButtonsList([]);
    setNewButtonText("");
    setMediaType("none");
    setMediaUrl("");
    setCategory("Marketing");
    setComplianceScore(null);
    setComplianceFeedback([]);
    setSuggestedCategory(null);
    setCategoryReasoning(null);
    setCategoryApplied(false);
    setShowGenerator(false);
    setGenTopic("");
    setGenUrl("");
    setGenError(null);
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  // AI Optimize Call
  const handleAIOptimize = async () => {
    if (!bodyText.trim()) return;
    setAiOptimizing(true);
    try {
      const res = await fetch("/api/whatsapp/optimize-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftText: bodyText, category }),
      });
      if (res.ok) {
        const data = await res.json();
        setBodyText(data.optimizedText);
        setComplianceScore(data.complianceScore);
        setComplianceFeedback(data.feedback);
        setSuggestedCategory(data.categoryFit);
        setCategoryReasoning(data.categoryReasoning || null);
        setCategoryApplied(false);
        addSystemLog("crm", "Template body optimized via LeapCreww AI Copilot");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiOptimizing(false);
    }
  };

  // Brand-Aware AI Generation Call
  const handleGenerateWithAI = async () => {
    if (!genTopic.trim() || !orgId) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/ai/generate-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: genTopic.trim(), url: genUrl.trim(), orgId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || "Generation failed. Please try again.");
        return;
      }
      setBodyText(data.generatedText);
      addSystemLog("crm", "Template body generated via Brand-Aware AI");
      setShowGenerator(false);
      setGenTopic("");
      setGenUrl("");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Network error during generation.");
    } finally {
      setGenerating(false);
    }
  };

  // Submit Template
  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !bodyText.trim() || !orgId || submitting) return;

    // Standardize template name snake_case
    const formattedName = templateName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_");

    setSubmitting(true);
    try {
      await submitMetaTemplate({
        name: formattedName,
        category,
        body: bodyText,
        buttons: buttonsList,
        mediaType,
        mediaUrl: mediaType !== "none" ? mediaUrl.trim() : undefined,
        organizationId: orgId,
      });

      onCreated?.(formattedName);
      resetWizard();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden animate-slide-up bg-white shadow-2xl border border-stone-200 max-h-[92vh]">

        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-base text-stone-900 tracking-tight">New Template</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">Build a Meta-compliant WhatsApp message</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmitTemplate} className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">

          {/* Name + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Template Name</label>
              <input
                type="text"
                required
                placeholder="e.g. black_friday_discount"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-wa-green transition-colors"
              />
              <span className="text-[10px] text-stone-400 font-medium">Saved as lowercase snake_case</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Compliance Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-wa-green transition-colors cursor-pointer pr-9"
                >
                  <option value="Marketing">Marketing (Offers, updates)</option>
                  <option value="Utility">Utility (Transactions, alerts)</option>
                  <option value="Authentication">Authentication (OTPs, codes)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Media Header */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Media Header (optional)</label>
            <div className="flex gap-1.5 bg-stone-100 p-1 rounded-xl">
              {["none", "image", "video", "document"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setMediaType(type); if (type === "none") setMediaUrl(""); }}
                  className={`flex-1 py-2 text-center text-[11px] font-bold rounded-lg capitalize cursor-pointer transition-all ${
                    mediaType === type
                      ? "bg-wa-green text-white shadow-sm"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            {mediaType !== "none" && (
              <div className="space-y-1.5">
                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    placeholder={`Sample ${mediaType} URL — e.g. https://cdn.mysite.com/banner.${mediaType === "image" ? "jpg" : mediaType === "video" ? "mp4" : "pdf"}`}
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-wa-green transition-colors flex-1"
                  />
                  <UploadButton
                    endpoint="mediaUploader"
                    onClientUploadComplete={(res) => {
                      if (res && res[0]) {
                        setMediaUrl(res[0].url);
                        notify.success("Upload complete", "Your media sample is attached to the template.");
                      }
                    }}
                    onUploadError={(error: Error) => {
                      notify.error("Upload failed", error.message);
                    }}
                    appearance={{
                      button: "bg-wa-green hover:bg-wa-green-dark text-white rounded-xl text-xs font-bold px-4 py-2.5 cursor-pointer shrink-0 flex items-center justify-center border-0 transition-all",
                      allowedContent: "hidden",
                    }}
                  />
                </div>
                <p className="text-[10px] text-stone-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Meta uploads this sample to approve the header. Each broadcast can override the actual {mediaType}.
                </p>
              </div>
            )}
          </div>

          {/* Body text */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Message Body</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setShowGenerator((v) => !v); setGenError(null); }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-wa-green hover:text-wa-green-dark transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate with AI
                </button>
                <span className="text-[10px] text-stone-400">{bodyText.length} / 1024</span>
              </div>
            </div>

            {/* AI Generator panel */}
            {showGenerator && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h6 className="text-[10px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-wa-green" />
                    Brand-Aware AI Generator
                  </h6>
                  <button type="button" onClick={() => setShowGenerator(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer p-1 rounded-lg hover:bg-stone-200 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  Uses your Brand Profile (Settings) to write copy in your brand&apos;s tone.
                </p>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Topic / offer — e.g. 50% off Diwali Sale"
                    value={genTopic}
                    onChange={(e) => setGenTopic(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-wa-green transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="URL to embed (optional)"
                    value={genUrl}
                    onChange={(e) => setGenUrl(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-wa-green transition-colors"
                  />
                </div>
                {genError && (
                  <div className="text-[11px] text-red-600 font-semibold flex items-start gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {genError}
                  </div>
                )}
                <button
                  type="button"
                  disabled={!genTopic.trim() || generating}
                  onClick={handleGenerateWithAI}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-bold py-2.5 bg-wa-green hover:bg-wa-green-dark text-white rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {generating ? <><Loader className="w-3.5 h-3.5 animate-spin" /> Writing in your brand voice…</> : <><Sparkles className="w-3.5 h-3.5" /> Generate Copy</>}
                </button>
              </div>
            )}

            <textarea
              required
              rows={4}
              placeholder="Hey {{1}}, here is your discount code {{2}} — valid today only!"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-wa-green transition-colors resize-none"
            />
          </div>

          {/* Quick Reply Buttons */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Quick Reply Buttons (optional, max 3)</label>
            {buttonsList.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {buttonsList.map((btn, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold border border-[#53bdeb] text-[#0a7abf] bg-white pl-3 pr-2 py-1 rounded-full"
                  >
                    {btn}
                    <button
                      type="button"
                      onClick={() => setButtonsList((prev) => prev.filter((_, idx) => idx !== index))}
                      className="hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {buttonsList.length < 3 ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Button label — e.g. Shop Now"
                  value={newButtonText}
                  onChange={(e) => setNewButtonText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!newButtonText.trim()) return;
                      setButtonsList((prev) => [...prev, newButtonText.trim()]);
                      setNewButtonText("");
                    }
                  }}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-wa-green transition-colors flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newButtonText.trim()) return;
                    setButtonsList((prev) => [...prev, newButtonText.trim()]);
                    setNewButtonText("");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 border border-stone-200 bg-white text-stone-700 hover:border-stone-300 rounded-xl transition-all cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-stone-400 italic">Max 3 quick replies reached.</p>
            )}
          </div>

          {/* AI Compliance Auditor */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-wa-green" />
                AI Compliance Auditor
              </h5>
              {complianceScore !== null && (
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                  complianceScore > 85
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {complianceScore}% approval probability
                </span>
              )}
            </div>

            {clientWarnings.length > 0 && (
              <div className="space-y-1.5">
                {clientWarnings.map((w, idx) => (
                  <div key={idx} className="text-[11px] text-amber-700 font-semibold flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}

            {suggestedCategory && suggestedCategory !== category && !categoryApplied && (
              <div className="bg-white border border-stone-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-stone-800 font-black text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-wa-green" />
                  AI suggests: <span className="text-wa-green-dark">{suggestedCategory}</span>
                </div>
                {categoryReasoning && <p className="text-[11px] text-stone-500 leading-relaxed">{categoryReasoning}</p>}
                <p className="text-[10px] text-stone-400 font-semibold">Utility templates get approved 2–3× faster than Marketing.</p>
                <button
                  type="button"
                  onClick={() => { setCategory(suggestedCategory); setCategoryApplied(true); }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-wa-green hover:bg-wa-green-dark text-white rounded-lg transition-colors cursor-pointer"
                >
                  Apply &quot;{suggestedCategory}&quot;
                </button>
              </div>
            )}

            {complianceFeedback.length > 0 && (
              <div className="bg-white border border-stone-200 rounded-xl p-3 space-y-1.5 text-[11px] text-stone-600 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">
                <div className="font-bold text-stone-700 flex items-center gap-1 mb-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  AI feedback
                </div>
                {complianceFeedback.map((fb, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-wa-green font-bold shrink-0">•</span>
                    {fb}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] text-stone-400 flex items-center gap-1 leading-relaxed">
                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                Verifies copy to promise zero Meta rejection rates.
              </p>
              <button
                type="button"
                disabled={!bodyText.trim() || aiOptimizing}
                onClick={handleAIOptimize}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-wa-green hover:bg-wa-green-dark text-white rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
              >
                {aiOptimizing ? <><Loader className="w-3.5 h-3.5 animate-spin" /> Auditing…</> : <><Sparkles className="w-3.5 h-3.5" /> AI Audit</>}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 border border-stone-200 bg-white text-stone-700 hover:border-stone-300 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || clientWarnings.length > 0 || !templateName.trim() || !bodyText.trim() || (mediaType !== "none" && !mediaUrl.trim())}
              className="inline-flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 bg-wa-green hover:bg-wa-green-dark text-white rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
              Submit for Meta Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
