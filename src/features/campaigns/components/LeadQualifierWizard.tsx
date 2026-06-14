"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import type { LeadQualifierConfig } from "@/features/campaigns/lib/leadQualifier";

interface LeadQualifierWizardProps {
  templateBody: string;
  templateName: string;
  orgId: string;
  onChange: (config: LeadQualifierConfig | null) => void;
}

type WizardState = "off" | "loading" | "active" | "error";

export const LeadQualifierWizard: React.FC<LeadQualifierWizardProps> = ({
  templateBody,
  templateName,
  orgId,
  onChange,
}) => {
  const [state, setState] = useState<WizardState>("off");
  const [config, setConfig] = useState<LeadQualifierConfig | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const generate = async () => {
    setState("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/ai/lead-qualifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateBody, templateName, orgId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "AI failed to generate qualifier.");
      }

      const generated = data.config as LeadQualifierConfig;
      setConfig(generated);
      onChange(generated);
      setState("active");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setState("error");
    }
  };

  const handleRemove = () => {
    setConfig(null);
    onChange(null);
    setState("off");
    setErrorMessage("");
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!config) return;
    const updated: LeadQualifierConfig = {
      ...config,
      questions: config.questions.filter((q) => q.id !== questionId),
    };
    setConfig(updated);
    onChange(updated);
  };

  // ── STATE 1: OFF ────────────────────────────────────────────────────────────
  if (state === "off") {
    return (
      <div className="border border-stone-200 p-4 flex items-center justify-between gap-4 bg-[#fafaf9]">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-stone-400 shrink-0" />
          <div>
            <p className="text-xs font-black text-stone-950 uppercase tracking-tight">
              Lead Qualifier
            </p>
            <p className="text-[10px] text-stone-500 mt-0.5">
              Auto-qualify leads who click Interested
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={generate}
          className="bg-stone-950 text-white font-black text-xs px-4 py-2 rounded-none shrink-0 flex items-center gap-1.5 hover:bg-stone-800 transition-colors cursor-pointer border border-stone-950"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Generate with AI
        </button>
      </div>
    );
  }

  // ── STATE 2: LOADING ────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="border border-stone-200 p-4 flex items-center justify-between gap-4 bg-[#fafaf9]">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-stone-400 shrink-0" />
          <div>
            <p className="text-xs font-black text-stone-950 uppercase tracking-tight">
              Lead Qualifier
            </p>
            <p className="text-[10px] text-stone-500 mt-0.5">
              Auto-qualify leads who click Interested
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled
          className="bg-stone-950 text-white font-black text-xs px-4 py-2 rounded-none shrink-0 flex items-center gap-1.5 opacity-80 cursor-not-allowed border border-stone-950"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Generating questions…
        </button>
      </div>
    );
  }

  // ── STATE 4: ERROR ──────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="border border-red-200 bg-red-50 p-3 space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-red-700">
              AI generation failed
            </p>
            <p className="text-[10px] text-red-600 mt-0.5 break-words">
              {errorMessage}
            </p>
          </div>
          <button
            type="button"
            onClick={generate}
            className="bg-stone-950 text-white font-black text-[10px] px-3 py-1.5 rounded-none shrink-0 flex items-center gap-1 hover:bg-stone-800 transition-colors cursor-pointer border border-stone-950"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── STATE 3: ACTIVE ─────────────────────────────────────────────────────────
  if (!config) return null;

  const hasNoQuestions = config.questions.length === 0;

  return (
    <div className="border border-stone-200 bg-[#fafaf9] space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 px-4 pt-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-black text-emerald-700 uppercase tracking-tight">
            Lead Qualifier Active
          </span>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="text-[10px] font-black text-stone-500 hover:text-red-500 transition-colors cursor-pointer uppercase tracking-wider border border-stone-200 px-2.5 py-1 bg-white hover:border-red-200 hover:bg-red-50"
        >
          Remove
        </button>
      </div>

      {/* Trigger pill */}
      <div className="px-4">
        <span className="text-[10px] text-stone-500 font-bold mr-1.5">
          Trigger:
        </span>
        <span className="bg-stone-100 text-stone-600 text-[10px] px-2 py-0.5 font-black border border-stone-200 inline-block">
          &ldquo;{config.triggerKeyword}&rdquo;
        </span>
      </div>

      {/* Zero-questions warning */}
      {hasNoQuestions && (
        <div className="mx-4 flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p className="text-[10px] font-bold text-amber-700">
            All questions removed. Qualifier is still active but will not score
            leads.
          </p>
        </div>
      )}

      {/* Question cards */}
      {config.questions.length > 0 && (
        <div className="px-4 space-y-2">
          {config.questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white border border-stone-100 p-3 space-y-1.5 relative"
            >
              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDeleteQuestion(q.id)}
                title="Remove question"
                className="absolute top-2 right-2 text-stone-300 hover:text-red-400 cursor-pointer transition-colors p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Question header */}
              <div className="flex items-start gap-2 pr-6">
                <span className="bg-stone-950 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-xs font-bold text-stone-950 leading-snug">
                  {q.text}
                </p>
              </div>

              {/* Options */}
              <div className="flex flex-wrap gap-1 pl-7">
                {q.options.map((opt) => (
                  <span
                    key={opt}
                    className="text-[10px] bg-stone-50 border border-stone-200 px-2 py-0.5 text-stone-600"
                  >
                    {opt}
                  </span>
                ))}
              </div>

              {/* Disqualify row */}
              {q.disqualifyOn && q.disqualifyOn.length > 0 && (
                <div className="flex items-center gap-1.5 pl-7">
                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="text-[10px] text-amber-600 font-bold">
                    Disqualify if:{" "}
                    {q.disqualifyOn.join(", ")}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tags row */}
      <div className="px-4 pb-4 flex items-center gap-2 text-[10px] font-bold">
        <span className="text-stone-400 uppercase tracking-wider">Tags:</span>
        <span className="text-emerald-600">{config.qualifiedTag}</span>
        <span className="text-stone-300">·</span>
        <span className="text-stone-400">{config.disqualifiedTag}</span>
      </div>
    </div>
  );
};
