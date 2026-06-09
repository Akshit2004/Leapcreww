"use client";

import React, { useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { Sparkles, ArrowRight, Wand2 } from "lucide-react";

const EXAMPLES = [
  "Send a 20% Diwali discount to people who haven't bought in 3 months",
  "Win back leads who never replied with a free shipping offer",
  "Announce our new product launch to all VIP customers",
];

/**
 * "Done-For-You" AI Copilot — the headline action on the dashboard.
 *
 * The user describes a goal in plain English; we hand it off to the AI Campaign
 * Strategist (?tab=campaigns&goal=...), which drafts the segment, template,
 * schedule, and follow-up sequence ready for a single "Approve & Launch".
 */
export const DoneForYouCopilot: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const orgId = params.orgId as string;

  const [goal, setGoal] = useState("");

  const launch = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !orgId) return;
    router.push(`${pathname}?tab=campaigns&goal=${encodeURIComponent(trimmed)}`, { scroll: false });
  };

  return (
    <div className="bg-white border border-stone-200 p-5 sm:p-6 space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            AI Copilot
          </span>
        </div>
        <h2 className="text-lg font-bold text-stone-900">What do you want to achieve today?</h2>
        <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
          Describe your goal in plain English — the AI drafts the audience segment, writes the
          template, and pre-fills the campaign. You just review and hit{" "}
          <span className="font-semibold text-stone-700">Approve &amp; Launch</span>.
        </p>
      </div>

      {/* Goal input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          launch(goal);
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <div className="relative flex-1">
          <Wand2 className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Re-engage customers who went quiet in the last 60 days…"
            className="w-full bg-white border border-stone-200 rounded-none py-2.5 pl-9 pr-4 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={!goal.trim()}
          className="bg-stone-950 hover:bg-stone-900 disabled:opacity-40 disabled:hover:bg-stone-950 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 flex items-center justify-center gap-2 border border-stone-950 transition-colors cursor-pointer shrink-0"
        >
          Build campaign
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Example prompts */}
      <div className="flex flex-wrap items-center gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setGoal(ex);
              launch(ex);
            }}
            className="text-[11px] text-stone-600 border border-stone-200 hover:border-stone-400 hover:bg-stone-50 px-2.5 py-1 transition-colors cursor-pointer text-left"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
};
