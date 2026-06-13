"use client";

import React, { useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { Sparkles, ArrowRight, Wand2 } from "lucide-react";

const EXAMPLES = [
  "Send a 20% Diwali discount to people who haven't bought in 3 months",
  "Win back leads who never replied with a free shipping offer",
  "Announce our new product launch to all VIP customers",
];

export const DoneForYouCopilot: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const orgId = params.orgId as string;

  const [goal, setGoal] = useState("");
  const [focused, setFocused] = useState(false);

  const launch = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !orgId) return;
    router.push(`${pathname}?tab=campaigns&goal=${encodeURIComponent(trimmed)}`, { scroll: false });
  };

  return (
    <div className="bg-white border border-stone-200 p-6 sm:p-8 space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            AI Copilot
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
          What do you want to achieve today?
        </h2>
        <p className="text-sm text-stone-500 max-w-2xl leading-relaxed">
          Describe your goal in plain English — the AI drafts the audience segment, writes the
          template, and pre-fills the campaign. You just review and hit{" "}
          <span className="font-semibold text-stone-700">Approve &amp; Launch</span>.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); launch(goal); }}
        className="flex flex-col gap-3"
      >
        {/* gradient border wrapper — animates on focus */}
        <div className={`p-[2px] transition-all duration-500 ${focused ? "animate-gradient-x bg-gradient-to-r from-emerald-400 via-wa-green to-teal-400" : "bg-stone-200"}`}>
          <div className="relative bg-stone-50">
            <Wand2 className={`w-4 h-4 absolute left-4 top-4 pointer-events-none transition-colors duration-300 ${focused ? "text-emerald-500" : "text-stone-400"}`} />
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  launch(goal);
                }
              }}
              placeholder="e.g. Re-engage customers who went quiet in the last 60 days…"
              rows={4}
              className="w-full bg-transparent py-4 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-stone-400">⌘ Enter to submit</span>
          <button
            type="submit"
            disabled={!goal.trim()}
            className="bg-stone-950 hover:bg-stone-800 disabled:opacity-40 disabled:hover:bg-stone-950 text-white font-black text-xs uppercase tracking-wider px-6 py-3 flex items-center gap-2 border border-stone-950 transition-colors cursor-pointer shrink-0"
          >
            Build campaign
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => { setGoal(ex); launch(ex); }}
            className="text-xs text-stone-500 border border-stone-200 hover:border-stone-400 hover:bg-stone-50 px-3 py-1.5 transition-colors cursor-pointer text-left"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
};
