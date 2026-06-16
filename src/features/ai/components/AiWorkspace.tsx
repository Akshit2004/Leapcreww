"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, Loader2, RotateCcw, X, Eye, Play,
  CheckCircle2, Bot, FileText, Zap, ChevronLeft,
  Megaphone, Users, Layers, TrendingUp, Mic, ArrowRight,
} from "lucide-react";
import { useApp } from "@/shared/context/AppContext";
import { parseWorkspaceParams, INTENT_PROMPTS, type WorkspaceIntent } from "@/features/ai/lib/workspaceRouting";
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
  isLoading?: boolean;
  isAction?: boolean;
  action?: "campaign" | "automation" | "chatbot" | "template";
  summary?: string;
  strategyReady?: CampaignStrategy;
}

type RightPanelMode = "welcome" | "campaign-loading" | "campaign-preview" | "automation" | "chatbot" | "template" | "success";

interface DbSegment { id: string; name: string; rules: unknown }

interface AiWorkspaceProps {
  onNavigate?: (tab: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_GREETING: ChatMessage = {
  id: "init",
  role: "assistant",
  content: "Hey! 👋 What do you want to do today? Tell me your goal and I'll build a complete strategy for you — or pick a quick action above.",
};

const intentLabels: Record<WorkspaceIntent, string> = {
  broadcast_campaign: "Broadcast Campaign",
  cart_recovery:      "Cart Recovery",
  chatbot_flow:       "Chatbot Flow",
  whatsapp_template:  "WhatsApp Template",
  custom:             "AI Workspace",
};

const intentIcons: Record<WorkspaceIntent, React.ElementType> = {
  broadcast_campaign: Megaphone,
  cart_recovery:      Zap,
  chatbot_flow:       Bot,
  whatsapp_template:  FileText,
  custom:             Sparkles,
};

const actionIcons: Record<string, React.ElementType> = {
  campaign: Send, automation: Zap, chatbot: Bot, template: FileText,
};

function toDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16);
}

// ─── PillToggle ───────────────────────────────────────────────────────────────

const PillToggle: React.FC<{ on: boolean; onToggle: () => void }> = ({ on, onToggle }) => (
  <button
    onClick={onToggle}
    className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer shrink-0 ${on ? "bg-wa-green" : "bg-stone-300"}`}
    style={{ height: "22px" }}
  >
    <span
      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
      style={{ transform: on ? "translateX(18px)" : "translateX(0)" }}
    />
  </button>
);

// ─── SimulatorModal ───────────────────────────────────────────────────────────

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
      ? rawButtons.map((b: unknown) => (typeof b === "string" ? b : (b as { text?: string }).text ?? ""))
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
      s.push({ type: "out", text: "Great! You've been added to our qualified leads 🎉 We'll be in touch soon.", delay: 1100 });
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
    let msgId = 0;
    let cancelled = false;
    const runNext = () => {
      if (cancelled || i >= script.length) return;
      const step = script[i++];
      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        if (step.type === "out-template") {
          setTypingDir(null);
          setMsgs((p) => [...p, { id: ++msgId, dir: "out", kind: "template", body: step.body as string, buttons: step.buttons as string[] }]);
        } else if (step.type === "out-question") {
          setTypingDir(null);
          setMsgs((p) => [...p, { id: ++msgId, dir: "out", kind: "question", text: step.text as string, options: step.options as string[], disqualifyOn: step.disqualifyOn as string[] }]);
        } else if (step.type === "out") {
          setTypingDir(null);
          setMsgs((p) => [...p, { id: ++msgId, dir: "out", kind: "text", text: step.text as string }]);
        } else if (step.type === "in") {
          setTypingDir(null);
          setMsgs((p) => [...p, { id: ++msgId, dir: "in", kind: "text", text: step.text as string }]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-[860px] flex overflow-hidden shadow-2xl max-h-[90vh]" style={{ background: "#0B141A", border: "2px solid #2A3942" }}>

        {/* LEFT: Campaign info panel */}
        <div className="w-[260px] shrink-0 flex flex-col border-r" style={{ borderColor: "#2A3942", background: "#0d1117" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: "#2A3942" }}>
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#25d366" }}>Campaign Preview</span>
            <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1.5">Template</p>
              <p className="text-sm font-black text-white leading-tight">{strategy.template.name}</p>
              <p className="text-xs text-white/40 mt-2 leading-relaxed line-clamp-3">{strategy.template.body}</p>
            </div>
            <div className="border-t pt-4" style={{ borderColor: "#2A3942" }}>
              <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1.5">Audience</p>
              <p className="text-sm font-black text-white">{strategy.segment.name}</p>
            </div>
            <div className="border-t pt-4" style={{ borderColor: "#2A3942" }}>
              <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1.5">Sequence</p>
              <p className="text-sm font-black text-white">{strategy.sequence.steps.length} follow-up messages</p>
              {sequenceEnabled && sequenceSteps.slice(0, 2).map((step, i) => (
                <p key={i} className="text-xs text-white/35 mt-1.5 leading-snug line-clamp-2">Day {i + 1}: {step}</p>
              ))}
            </div>
            {qualifierEnabled && qualifier && (
              <div className="border-t pt-4" style={{ borderColor: "#2A3942" }}>
                <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1.5">Lead Qualifier</p>
                <p className="text-sm font-black text-white">{qualifier.questions.length} screening questions</p>
              </div>
            )}
          </div>
          <div className="p-4 flex flex-col gap-2 shrink-0 border-t" style={{ borderColor: "#2A3942" }}>
            <button onClick={onClose} className="py-2.5 text-sm font-black uppercase tracking-wider text-white/55 border border-white/15 hover:border-white/35 hover:text-white/80 transition-colors cursor-pointer">
              Edit
            </button>
            <button onClick={onLaunch} disabled={isLaunching} className="bg-gradient-to-r from-wa-green to-wa-green-dark hover:opacity-90 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider py-2.5 flex items-center justify-center gap-2 transition-all cursor-pointer">
              {isLaunching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Launch Campaign</>}
            </button>
          </div>
        </div>

        {/* RIGHT: WA phone preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* WA-style top bar */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: "#1F2C34" }}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-wa-green to-wa-green-dark flex items-center justify-center text-white text-[10px] font-black shrink-0">LC</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-none">LeapCreww Business</p>
              <p className="text-wa-green-light text-[10px] mt-0.5">Campaign Flow Preview</p>
            </div>
            <button onClick={() => setSessionKey((k) => k + 1)} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-white/40 hover:text-white/80 transition-colors cursor-pointer shrink-0">
              <Play className="w-3 h-3" /> Replay
            </button>
          </div>
        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3 min-h-0" style={{ background: "#0B141A" }}>
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
                        <p className="text-[13px] text-white/90 leading-relaxed">{msg.body.replace(/\{\{1\}\}/g, "Priya")}</p>
                      </div>
                      {msg.buttons.length > 0 && (
                        <div className="border-t border-white/10 flex flex-col">
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
                            <span key={opt} className={`text-[11px] px-2.5 py-1 font-medium rounded ${msg.disqualifyOn.includes(opt) ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-white/10 text-[#53BDEB] border border-white/20"}`}>{opt}</span>
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
          {/* Decorative WA input bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 shrink-0" style={{ background: "#1F2C34", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex-1 rounded-full px-4 py-2 flex items-center" style={{ background: "#2A3942" }}>
              <span className="text-[11px] text-white/30 flex-1">Type a message</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#00A884] flex items-center justify-center text-white shrink-0">
              <Mic className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Welcome stage (right panel default) ─────────────────────────────────────

const WelcomeStage: React.FC<{ intent: WorkspaceIntent; onSuggestionClick: (s: string) => void }> = ({ intent, onSuggestionClick }) => {
  const IntentIcon = intentIcons[intent];
  const [clickedTile, setClickedTile] = useState<string | null>(null);

  const handleTileClick = (ti: string, prompt: string) => {
    setClickedTile(ti);
    setTimeout(() => onSuggestionClick(prompt), 180);
  };

  const tiles = [
    { label: "Launch a Campaign",  desc: "Send a targeted broadcast to your contact list with AI-picked template & timing", intent: "broadcast_campaign" as WorkspaceIntent, icon: Megaphone, color: "#059669", bg: "#d1fae5", border: "#059669", shadow: "rgba(5,150,105,0.18)" },
    { label: "Recover Lost Carts", desc: "Win back customers who left items behind with a smart follow-up sequence", intent: "cart_recovery"      as WorkspaceIntent, icon: Zap,      color: "#d97706", bg: "#fef3c7", border: "#d97706", shadow: "rgba(217,119,6,0.18)"  },
    { label: "Build a Chatbot",    desc: "Create a 24/7 auto-reply flow that qualifies leads and answers FAQs", intent: "chatbot_flow"       as WorkspaceIntent, icon: Bot,      color: "#7c3aed", bg: "#ede9fe", border: "#7c3aed", shadow: "rgba(124,58,237,0.18)" },
    { label: "Create a Template",  desc: "Design a Meta-approved WhatsApp message ready for campaigns", intent: "whatsapp_template"  as WorkspaceIntent, icon: FileText, color: "#0891b2", bg: "#e0f2fe", border: "#0891b2", shadow: "rgba(8,145,178,0.18)"  },
  ];
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-6 text-center">
      {intent !== "custom" ? (
        /* Non-custom intent: show icon + status message */
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-wa-green bg-wa-green/8 flex items-center justify-center">
            <IntentIcon className="w-5 h-5 text-wa-green-dark" />
          </div>
          <p className="text-sm text-stone-500 max-w-xs leading-relaxed">
            Your {intentLabels[intent]} is being prepared. The strategy will appear here once ready.
          </p>
        </div>
      ) : (
        /* Custom intent: tiles grid only — greeting is already in the chat below */
        <div className="w-full max-w-xl">
          <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-4">Quick start — pick a goal</p>
          <div className="grid grid-cols-2 gap-px bg-stone-200 border border-stone-200">
            {tiles.map(({ label, desc, intent: ti, icon: Icon, color, bg, border, shadow }) => {
              const isClicked = clickedTile === ti;
              return (
                <button
                  key={ti}
                  onClick={() => handleTileClick(ti, INTENT_PROMPTS[ti])}
                  disabled={!!clickedTile}
                  className="bg-white p-5 text-left cursor-pointer group transition-all duration-200 relative overflow-hidden hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-default"
                  style={{ boxShadow: isClicked ? `0 0 0 2px ${border}, 0 8px 24px ${shadow}` : undefined }}
                  onMouseEnter={(e) => { if (!clickedTile) (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 20px ${shadow}`; }}
                  onMouseLeave={(e) => { if (!clickedTile) (e.currentTarget as HTMLButtonElement).style.boxShadow = ""; }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 transition-all duration-200 group-hover:w-1" style={{ background: border }} />
                  <div className="w-9 h-9 flex items-center justify-center mb-3 rounded-lg transition-transform duration-200 group-hover:scale-110" style={{ background: bg }}>
                    {isClicked
                      ? <Loader2 className="w-4 h-4 animate-spin" style={{ color }} />
                      : <Icon className="w-4 h-4" style={{ color }} />
                    }
                  </div>
                  <span className="text-xs font-black text-stone-800 group-hover:text-stone-950 uppercase tracking-wide leading-tight block mb-1.5">{label}</span>
                  <span className="text-[11px] text-stone-500 leading-snug block pr-6">{desc}</span>
                  <ArrowRight
                    className="absolute bottom-4 right-4 w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5"
                    style={{ color: border }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Campaign loading panel ───────────────────────────────────────────────────

const CampaignLoadingPanel: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-full gap-5 py-12">
    <div className="w-14 h-14 rounded-2xl bg-wa-green/10 flex items-center justify-center">
      <Loader2 className="w-7 h-7 text-wa-green animate-spin" />
    </div>
    <div className="text-center space-y-1.5">
      <p className="font-black text-stone-900 text-sm uppercase tracking-wide">Building strategy…</p>
      <p className="text-xs text-stone-500">Picking the right template, audience, and sequence</p>
    </div>
    <div className="flex gap-1.5 mt-2">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-2 h-2 rounded-full bg-wa-green animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </div>
  </div>
);

// ─── Navigation panels ────────────────────────────────────────────────────────

const NavPanel: React.FC<{ icon: React.ElementType; title: string; desc: string; cta: string; onClick: () => void }> = ({ icon: Icon, title, desc, cta, onClick }) => (
  <div className="flex flex-col items-center justify-center min-h-full gap-6 p-12">
    <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center">
      <Icon className="w-8 h-8 text-stone-600" />
    </div>
    <div className="text-center space-y-2">
      <p className="font-black text-stone-900 text-lg">{title}</p>
      <p className="text-sm text-stone-500 max-w-xs leading-relaxed">{desc}</p>
    </div>
    <button onClick={onClick} className="ds-btn ds-btn-primary px-8">
      {cta}
    </button>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const AiWorkspace: React.FC<AiWorkspaceProps> = ({ onNavigate }) => {
  const params     = useParams();
  const searchParamsObj = useSearchParams();
  const orgId      = params.orgId as string;

  const { organization, contacts, templates, refreshWorkspace } = useApp();

  // Parse intent/prompt from URL
  const { prompt: initialPrompt, intent } = useMemo(
    () => parseWorkspaceParams(searchParamsObj),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [messages, setMessages]               = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [input, setInput]                     = useState("");
  const [isLoading, setIsLoading]             = useState(false);

  // ── Right-panel state ───────────────────────────────────────────────────────
  const [rightPanel, setRightPanel]           = useState<RightPanelMode>("welcome");
  const [strategy, setStrategy]               = useState<CampaignStrategy | null>(null);
  const [isLaunching, setIsLaunching]         = useState(false);
  const [lastCampaignPrompt, setLastCampaignPrompt] = useState("");
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Editable campaign fields
  const [sequenceEnabled, setSequenceEnabled] = useState(true);
  const [sequenceSteps, setSequenceSteps]     = useState<string[]>([]);
  const [qualifierEnabled, setQualifierEnabled] = useState(false);
  const [qualifier, setQualifier]             = useState<QualifierConfig | null>(null);
  const [isGeneratingQualifier, setIsGeneratingQualifier] = useState(false);
  const [qualifierError, setQualifierError]   = useState<string | null>(null);
  const [selectedTags, setSelectedTags]       = useState<string[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<DbSegment | null>(null);
  const [scheduledAt, setScheduledAt]         = useState("");

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLTextAreaElement>(null);
  const autoFiredRef  = useRef(false);

  const availableTags = useMemo(
    () => [...new Set((contacts as Array<{ tags?: string[] }>).flatMap((c) => c.tags ?? []))].filter(Boolean),
    [contacts]
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages]);

  // ── handleAction ────────────────────────────────────────────────────────────

  const handleAction = useCallback(async (
    action: "campaign" | "automation" | "chatbot" | "template",
    actionParams: { prompt?: string }
  ) => {
    if (action === "campaign") {
      const prompt = actionParams.prompt ?? "";
      setLastCampaignPrompt(prompt);
      setRightPanel("campaign-loading");
      const loadingId = `loading-${Date.now()}`;
      setMessages((prev) => [...prev, { id: loadingId, role: "assistant", content: "Building your strategy…", isLoading: true }]);
      try {
        const res  = await fetch("/api/ai/campaign-strategist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate", orgId, prompt }),
        });
        const data = (await res.json()) as { strategy?: CampaignStrategy; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to generate");
        if (!data.strategy) throw new Error("No strategy returned");
        const s = data.strategy;
        if (s.sequence.steps.length === 0) {
          s.sequence.steps = [
            { order: 0, delayMinutes: 5,    actionType: "send_message", message: "Hey! Just checking in — did you see our latest offer? 😊" },
            { order: 1, delayMinutes: 1440, actionType: "send_message", message: "Don't miss out! This offer is still available — reply to learn more." },
            { order: 2, delayMinutes: 2880, actionType: "send_message", message: "Last chance! This special offer expires soon. Tap to take action now." },
          ];
        }
        setStrategy(s);
        setSequenceSteps(s.sequence.steps.map((st) => st.message ?? ""));
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
              ? { ...m, content: "Your campaign is ready — edit details on the right, then launch when ready.", isLoading: false, strategyReady: s }
              : m
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setRightPanel("welcome");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? { ...m, isLoading: false, content: msg.includes("rate") || msg.includes("limit") || msg === "Failed"
                  ? "The AI is a bit busy right now — tap Retry to try again."
                  : "Couldn't build the strategy. Tap Retry or rephrase your goal.",
                suggestions: ["Retry"] }
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
  }, [orgId]);

  // ── callCopilot ─────────────────────────────────────────────────────────────

  const callCopilot = useCallback(async (history: ChatMessage[]) => {
    setIsLoading(true);
    try {
      const res  = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          context: {
            contactCount:   contacts.length,
            templateCount:  templates.length,
            whatsappConnected: !!(organization?.whatsappConnected),
          },
        }),
      });
      const data = (await res.json()) as { type: string; text?: string; action?: string; summary?: string; suggestions?: string[]; params?: Record<string, string> };
      if (!res.ok) throw new Error("Copilot error");
      if (data.type === "text") {
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: data.text ?? "", suggestions: data.suggestions ?? [] }]);
      } else if (data.type === "action" && data.action) {
        const actionMsg: ChatMessage = { id: Date.now().toString(), role: "assistant", content: data.summary ?? `Ready to build your ${data.action}!`, isAction: true, action: data.action as ChatMessage["action"], summary: data.summary };
        setMessages((prev) => [...prev, actionMsg]);
        await handleAction(data.action as "campaign" | "automation" | "chatbot" | "template", data.params ?? {});
      }
    } catch {
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: "Sorry, I hit a snag. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, contacts, templates, organization, handleAction]);

  // ── handleSend ──────────────────────────────────────────────────────────────

  const handleSend = useCallback(async (overrideText?: string) => {
    const trimmed = (overrideText ?? input).trim();
    if (!trimmed || isLoading || !orgId) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    await callCopilot(newMessages);
  }, [input, messages, isLoading, orgId, callCopilot]);

  // ── handleSuggestion ────────────────────────────────────────────────────────

  const handleSuggestion = useCallback(async (text: string) => {
    if (isLoading || !orgId) return;
    if (text === "Retry" && lastCampaignPrompt) { await handleAction("campaign", { prompt: lastCampaignPrompt }); return; }
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    await callCopilot(newMessages);
  }, [messages, isLoading, orgId, callCopilot, lastCampaignPrompt, handleAction]);

  // ── handleLaunch ────────────────────────────────────────────────────────────

  const handleLaunch = useCallback(async () => {
    if (!strategy || !orgId) return;
    setIsLaunching(true);
    const editedStrategy: CampaignStrategy = {
      ...strategy,
      schedule: { ...strategy.schedule, scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : strategy.schedule.scheduledAt },
      segment: selectedSegment
        ? { name: selectedSegment.name, rules: selectedSegment.rules as CampaignStrategy["segment"]["rules"] }
        : selectedTags.length > 0
          ? { ...strategy.segment, rules: { all: [{ field: "tags", op: "in", value: selectedTags.join(",") }] } }
          : strategy.segment,
    };
    const editedSequence = sequenceEnabled
      ? { ...strategy.sequence, steps: strategy.sequence.steps.map((st, i) => ({ ...st, message: sequenceSteps[i] ?? st.message })) }
      : null;
    const editedQualifier = qualifierEnabled && qualifier ? { ...qualifier } : null;
    try {
      const res = await fetch("/api/ai/campaign-strategist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", orgId, template: editedStrategy.template, segment: editedStrategy.segment, schedule: editedStrategy.schedule, sequence: editedSequence, leadQualifier: editedQualifier }),
      });
      if (!res.ok) { const d = (await res.json()) as { error?: string }; throw new Error(d.error ?? "Launch failed"); }
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: "🎉 Campaign launched! Check the Campaigns tab for live delivery stats." }]);
      void refreshWorkspace(orgId);
      setRightPanel("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Launch failed";
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: `Launch failed: ${msg}` }]);
    } finally {
      setIsLaunching(false);
    }
  }, [strategy, orgId, scheduledAt, selectedTags, sequenceEnabled, sequenceSteps, qualifierEnabled, qualifier, selectedSegment, refreshWorkspace]);

  // ── Qualifier generation ─────────────────────────────────────────────────────

  const generateQualifier = useCallback(async () => {
    if (!orgId || !strategy) return;
    setIsGeneratingQualifier(true);
    setQualifierError(null);
    try {
      const r = await fetch("/api/ai/lead-qualifier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId, templateBody: strategy.template.body, templateName: strategy.template.name }) });
      const d = (await r.json()) as { config?: QualifierConfig; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Generation failed");
      if (!d.config) throw new Error("No config returned");
      setQualifier(d.config);
    } catch (err) {
      setQualifierError(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsGeneratingQualifier(false);
    }
  }, [orgId, strategy]);

  const handleQualifierToggle = useCallback(async () => {
    const next = !qualifierEnabled;
    setQualifierEnabled(next);
    if (next && !qualifier) await generateQualifier();
  }, [qualifierEnabled, qualifier, generateQualifier]);

  // ── handleReset ─────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setMessages([INITIAL_GREETING]);
    setRightPanel("welcome");
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

  // ── Auto-fire initial prompt ─────────────────────────────────────────────────

  useEffect(() => {
    if (initialPrompt && !autoFiredRef.current) {
      autoFiredRef.current = true;
      void handleSend(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render right panel ───────────────────────────────────────────────────────

  const renderRightPanel = () => {
    switch (rightPanel) {
      case "welcome":
        return <WelcomeStage intent={intent} onSuggestionClick={(s) => void handleSuggestion(s)} />;
      case "campaign-loading":
        return <CampaignLoadingPanel />;
      case "campaign-preview":
        return strategy ? <CampaignRightPanel strategy={strategy} orgId={orgId} sequenceEnabled={sequenceEnabled} onSequenceEnabledChange={setSequenceEnabled} sequenceSteps={sequenceSteps} onSequenceStepsChange={setSequenceSteps} qualifierEnabled={qualifierEnabled} onQualifierEnabledChange={() => void handleQualifierToggle()} qualifier={qualifier} onQualifierQuestionsChange={(qs) => setQualifier((p) => p ? { ...p, questions: qs } : null)} isGeneratingQualifier={isGeneratingQualifier} qualifierError={qualifierError} onRetryQualifier={() => void generateQualifier()} availableTags={availableTags} selectedTags={selectedTags} onSelectedTagsChange={setSelectedTags} selectedSegmentId={selectedSegment?.id ?? null} onSelectedSegmentChange={setSelectedSegment} scheduledAt={scheduledAt} onScheduledAtChange={setScheduledAt} onLaunch={handleLaunch} isLaunching={isLaunching} onPreviewFlow={() => setIsSimulatorOpen(true)} /> : null;
      case "automation":
        return <NavPanel icon={Layers} title="Automation Flows" desc="Build automated message sequences with visual node editor." cta="Open Flows Builder" onClick={() => onNavigate?.("flows")} />;
      case "chatbot":
        return <NavPanel icon={Bot} title="Chatbot Builder" desc="Create interactive chatbot flows your customers can navigate via WhatsApp." cta="Open Chatbot Builder" onClick={() => onNavigate?.("chatbot")} />;
      case "template":
        return <NavPanel icon={FileText} title="Template Builder" desc="Create Meta-approved WhatsApp message templates." cta="Open Templates" onClick={() => onNavigate?.("templates")} />;
      case "success":
        return (
          <div className="flex flex-col items-center justify-center min-h-full gap-8 p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-wa-green/10 border-2 border-wa-green flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-wa-green" />
            </div>
            <div className="space-y-2">
              <p className="font-black text-stone-900 text-xl">Campaign Launched!</p>
              {strategy && (
                <p className="text-sm text-stone-500">{strategy.template.name} — now broadcasting to your audience.</p>
              )}
              <p className="text-xs text-stone-400 mt-2">Head to Campaigns to track delivery in real time.</p>
            </div>
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <button onClick={() => onNavigate?.("campaigns")} className="ds-btn ds-btn-primary w-full">View Campaigns</button>
              <button onClick={() => { setRightPanel("welcome"); setStrategy(null); }} className="ds-btn ds-btn-secondary w-full">Start Another</button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const orgInitial = (organization?.name ?? "W").charAt(0).toUpperCase();

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden relative">

      {/* ── TOP: Main stage ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-stone-100 min-h-0">
        {/* Stage header */}
        <div className="h-14 px-6 bg-white border-b border-stone-200 flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(90deg, rgba(37,211,102,0.06) 0%, transparent 40%)" }} />
          <div className="relative flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-wa-green" />
            <div>
              <span className="text-sm font-black text-stone-700 uppercase tracking-wide">
                {rightPanel === "campaign-preview" && strategy ? `Campaign — ${strategy.template.name}` :
                 rightPanel === "campaign-loading" ? "Building Strategy…" :
                 rightPanel === "success" ? "Campaign Launched" :
                 rightPanel === "automation" ? "Automation Flows" :
                 rightPanel === "chatbot" ? "Chatbot Builder" :
                 rightPanel === "template" ? "Template Builder" :
                 "AI Workspace"}
              </span>
              {rightPanel === "welcome" && (
                <p className="text-[10px] text-stone-400 leading-none mt-0.5 font-normal normal-case tracking-normal">Pick a goal or describe it below</p>
              )}
            </div>
          </div>
          {rightPanel === "campaign-preview" && strategy && (
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="ds-btn ds-btn-secondary ds-btn-sm flex items-center gap-1.5 relative"
            >
              <Play className="w-3.5 h-3.5" />
              Simulate Flow
            </button>
          )}
        </div>
        {/* Stage body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {renderRightPanel()}
        </div>
      </div>

      {/* ── BOTTOM: Chat panel ──────────────────────────────────────────────── */}
      <div className="flex flex-col bg-white border-t border-stone-200 shrink-0" style={{ height: "360px" }}>
        {/* Chat header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full bg-wa-green-light absolute -top-0.5 -right-0.5 animate-pulse" />
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-wa-green to-wa-green-dark flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
            <span className="text-xs font-black text-stone-900 uppercase tracking-wider">AI Copilot</span>
            <span className="text-[10px] text-stone-400 hidden sm:block">WhatsApp marketing assistant</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border" style={{ background: "rgba(37,211,102,0.1)", borderColor: "rgba(37,211,102,0.35)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-wa-green-light animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#25d366" }}>Live</span>
            </div>
            <button onClick={handleReset} className="flex items-center gap-1 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer text-[10px] font-black uppercase tracking-wider">
              <RotateCcw className="w-3 h-3" /> New
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar flex flex-col bg-stone-50 min-h-0">
          <div className="flex-1" />
          <div className="space-y-3">
            {messages.map((message) => {
              if (message.role === "assistant") {
                const ActionIcon = message.action ? actionIcons[message.action] : null;
                return (
                  <div key={message.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-lg bg-wa-green flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-white border border-stone-200 rounded-xl px-3 py-2 inline-flex items-center gap-2 max-w-[80%]">
                        {message.isLoading && <Loader2 className="w-3 h-3 text-wa-green animate-spin shrink-0" />}
                        <p className="text-sm text-stone-800 leading-snug">{message.content}</p>
                      </div>
                      {message.strategyReady && (
                        <div className="mt-2 max-w-sm border border-wa-green/40 bg-wa-green/10 rounded-xl overflow-hidden">
                          <div className="px-3 py-2 border-b border-wa-green/30">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 className="w-3 h-3 text-wa-green-dark shrink-0" />
                              <span className="text-[10px] font-black text-wa-green-dark uppercase tracking-wider">Strategy Ready</span>
                            </div>
                            <div className="space-y-0.5 text-[11px]">
                              <p className="text-stone-500">Template: <span className="text-stone-800 font-semibold">{message.strategyReady.template.name}</span></p>
                              <p className="text-stone-500">Segment: <span className="text-stone-800 font-semibold">{message.strategyReady.segment.name}</span></p>
                              <p className="text-stone-500">Sequence: <span className="text-stone-800 font-semibold">{message.strategyReady.sequence.steps.length} follow-ups</span></p>
                            </div>
                          </div>
                          <div className="px-3 py-2 flex items-center gap-2">
                            <button onClick={() => setIsSimulatorOpen(true)} className="flex-1 border border-wa-green/40 text-wa-green-dark text-[10px] font-black uppercase tracking-wider py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer hover:bg-wa-green/10 transition-colors">
                              <Eye className="w-3 h-3" /> Simulate
                            </button>
                            <button onClick={handleLaunch} disabled={isLaunching} className="flex-1 bg-wa-green hover:bg-wa-green-dark text-white text-[10px] font-black uppercase tracking-wider py-1.5 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer transition-colors">
                              {isLaunching ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3" /> Launch</>}
                            </button>
                          </div>
                        </div>
                      )}
                      {message.isAction && message.action && ActionIcon && (
                        <div className="mt-1.5 border border-stone-200 rounded-xl px-3 py-2 inline-flex items-center gap-2 max-w-sm bg-white">
                          <ActionIcon className="w-3.5 h-3.5 shrink-0 text-wa-green" />
                          <div>
                            <p className="text-xs font-black uppercase tracking-wider text-stone-800">{message.action}</p>
                            {message.summary && <p className="text-[11px] mt-0.5 text-stone-500">{message.summary}</p>}
                          </div>
                        </div>
                      )}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {message.suggestions.map((s) => (
                            <button key={s} onClick={() => void handleSuggestion(s)} disabled={isLoading} className="text-xs font-bold px-3 py-1.5 rounded-full border cursor-pointer transition-colors disabled:opacity-40 bg-white border-stone-200 text-stone-600 hover:border-wa-green hover:text-wa-green-dark hover:bg-wa-green/10">
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return (
                <div key={message.id} className="flex items-start gap-2 flex-row-reverse">
                  <div className="w-6 h-6 rounded-lg bg-stone-200 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-stone-700 text-[10px] font-black">{orgInitial}</span>
                  </div>
                  <div className="flex flex-col items-end min-w-0">
                    <div className="bg-wa-green/20 border border-wa-green/30 rounded-xl px-3 py-2 max-w-[80%]">
                      <p className="text-sm text-stone-900 leading-snug">{message.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-lg bg-wa-green flex items-center justify-center shrink-0">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="bg-white border border-stone-200 rounded-xl px-3 py-2.5 flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-wa-green-light animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-stone-200 px-3 py-2.5 flex gap-2 items-center shrink-0 bg-white">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
            rows={3}
            placeholder="Tell me what you want to do… (Enter to send, Shift+Enter for new line)"
            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 text-sm px-3.5 py-2.5 focus:outline-none focus:border-wa-green/70 transition-colors resize-none custom-scrollbar"
            disabled={isLoading}
          />
          <button
            onClick={() => void handleSend()}
            disabled={isLoading || !input.trim()}
            className="bg-wa-green hover:bg-wa-green-dark disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Simulator Modal ──────────────────────────────────────────────────── */}
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
    </div>
  );
};

// ─── CampaignRightPanel (moved from OverviewTab for self-contained workspace) ──

interface CampaignRightPanelProps {
  strategy: CampaignStrategy;
  orgId: string;
  sequenceEnabled: boolean; onSequenceEnabledChange: (v: boolean) => void;
  sequenceSteps: string[]; onSequenceStepsChange: (s: string[]) => void;
  qualifierEnabled: boolean; onQualifierEnabledChange: () => void;
  qualifier: QualifierConfig | null; onQualifierQuestionsChange: (qs: QualifierQuestion[]) => void;
  isGeneratingQualifier: boolean; qualifierError: string | null; onRetryQualifier: () => void;
  availableTags: string[]; selectedTags: string[]; onSelectedTagsChange: (t: string[]) => void;
  selectedSegmentId: string | null; onSelectedSegmentChange: (s: DbSegment | null) => void;
  scheduledAt: string; onScheduledAtChange: (v: string) => void;
  onLaunch: () => void; isLaunching: boolean; onPreviewFlow: () => void;
}

const CampaignRightPanel: React.FC<CampaignRightPanelProps> = ({
  strategy, orgId, sequenceEnabled, onSequenceEnabledChange, sequenceSteps, onSequenceStepsChange,
  qualifierEnabled, onQualifierEnabledChange, qualifier, onQualifierQuestionsChange,
  isGeneratingQualifier, qualifierError, onRetryQualifier, availableTags, selectedTags,
  onSelectedTagsChange, selectedSegmentId, onSelectedSegmentChange, scheduledAt,
  onScheduledAtChange, onLaunch, isLaunching, onPreviewFlow,
}) => {
  const [audienceTab, setAudienceTab]         = useState<"tag" | "segment">("tag");
  const [segments, setSegments]               = useState<DbSegment[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [newSegName, setNewSegName]           = useState("");
  const [creatingSegment, setCreatingSegment] = useState(false);
  const [showNewSeg, setShowNewSeg]           = useState(false);

  useEffect(() => {
    if (audienceTab !== "segment" || !orgId) return;
    setSegmentsLoading(true);
    fetch(`/api/org/${orgId}/segments`).then((r) => r.json()).then((d) => setSegments(d.segments ?? [])).catch(() => {}).finally(() => setSegmentsLoading(false));
  }, [audienceTab, orgId]);

  const handleCreateSegment = async () => {
    if (!newSegName.trim() || !orgId) return;
    setCreatingSegment(true);
    try {
      const rules = selectedTags.length > 0 ? { all: [{ field: "tags", op: "in", value: selectedTags.join(",") }] } : { all: [] };
      const res = await fetch(`/api/org/${orgId}/segments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newSegName.trim(), rules, organizationId: orgId }) });
      const d = await res.json();
      if (d.segment) { const created = d.segment as DbSegment; setSegments((p) => [created, ...p]); onSelectedSegmentChange(created); setNewSegName(""); setShowNewSeg(false); }
    } catch { /* silent */ } finally { setCreatingSegment(false); }
  };

  const delayBadge = (mins: number) => mins < 60 ? `+${mins}m` : mins < 1440 ? `+${Math.round(mins / 60)}h` : `Day ${Math.round(mins / 1440)}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="px-6 pt-4 pb-3 border-b border-stone-100 flex items-center justify-between shrink-0 bg-white">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-wa-green-dark">Campaign Ready</p>
          <p className="text-base font-black text-stone-900 mt-0.5 truncate max-w-xs">{strategy.template.name}</p>
        </div>
        {strategy.templateExists
          ? <span className="ds-badge ds-badge-success">Approved</span>
          : <span className="ds-badge ds-badge-warn">Pending Meta</span>}
      </div>

      {/* Preview row */}
      <div className="px-6 py-3 border-b border-stone-100 flex items-center justify-between bg-stone-50 shrink-0">
        <span className="text-[10px] text-stone-500 font-mono truncate max-w-xs">
          {strategy.template.body.replace(/\{\{1\}\}/g, "[Name]").slice(0, 80)}{strategy.template.body.length > 80 ? "…" : ""}
        </span>
        <button onClick={onPreviewFlow} className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-stone-400 hover:text-stone-800 transition-colors cursor-pointer shrink-0 ml-4">
          <Eye className="w-3.5 h-3.5" /> Preview
        </button>
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-stone-100">

        {/* Follow-up Sequence */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-black text-stone-900 uppercase tracking-tight">Follow-up Sequence</p>
              <p className="text-xs text-stone-500 mt-1">{strategy.sequence.steps.length} automated follow-ups</p>
            </div>
            <PillToggle on={sequenceEnabled} onToggle={() => onSequenceEnabledChange(!sequenceEnabled)} />
          </div>
          {sequenceEnabled ? (
            <div className="space-y-3">
              {strategy.sequence.steps.map((step, i) => (
                <div key={i} className="kc-float p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black bg-stone-900 text-white px-2 py-0.5 rounded">{delayBadge(step.delayMinutes ?? 0)}</span>
                    <span className="text-[10px] text-stone-500 font-semibold">Step {i + 1}</span>
                  </div>
                  <textarea
                    value={sequenceSteps[i] ?? ""}
                    onChange={(e) => { const u = [...sequenceSteps]; u[i] = e.target.value; onSequenceStepsChange(u); }}
                    rows={2}
                    className="ds-input resize-none text-xs"
                    placeholder="Write your follow-up message…"
                  />
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-stone-400 italic">Disabled — only the main blast will send.</p>}
        </div>

        {/* Lead Qualifier */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-black text-stone-900 uppercase tracking-tight">Lead Qualifier</p>
              <p className="text-xs text-stone-500 mt-1">Auto-qualify leads who tap Interested</p>
            </div>
            <PillToggle on={qualifierEnabled} onToggle={onQualifierEnabledChange} />
          </div>
          {qualifierEnabled && (
            <>
              {isGeneratingQualifier && <div className="flex items-center gap-2 text-xs text-stone-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</div>}
              {!isGeneratingQualifier && qualifierError && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="flex-1 text-xs text-red-700">{qualifierError}</p>
                  <button onClick={onRetryQualifier} className="ds-btn ds-btn-danger ds-btn-sm">Retry</button>
                </div>
              )}
              {!isGeneratingQualifier && qualifier && qualifier.questions.map((q, qi) => (
                <div key={q.id} className="kc-float p-4 rounded-xl mb-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-[9px] font-black bg-wa-green text-white w-5 h-5 flex items-center justify-center rounded shrink-0 mt-0.5">{qi + 1}</span>
                    <input type="text" value={q.text} onChange={(e) => { const u = qualifier.questions.map((qq, i) => i === qi ? { ...qq, text: e.target.value } : qq); onQualifierQuestionsChange(u); }} className="flex-1 text-xs font-semibold text-stone-800 bg-transparent border-b border-stone-200 focus:border-wa-green focus:outline-none pb-0.5" />
                    <button onClick={() => onQualifierQuestionsChange(qualifier.questions.filter((_, i) => i !== qi))} className="text-stone-300 hover:text-red-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-7">
                    {q.options.map((opt, oi) => (
                      <span key={oi} className={`text-[10px] font-medium px-2 py-0.5 rounded border ${(q.disqualifyOn ?? []).includes(opt) ? "bg-stone-800 border-stone-800 text-white" : "bg-white border-stone-200 text-stone-600"}`}>{opt}</span>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
          {!qualifierEnabled && <p className="text-xs text-stone-400 italic">Toggle on to auto-qualify leads after they reply.</p>}
        </div>

        {/* Audience */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-black text-stone-900 uppercase tracking-tight">Audience</p>
              <p className="text-xs text-stone-500">Who receives this campaign</p>
            </div>
            <div className="flex bg-stone-100 p-0.5 rounded-lg">
              <button onClick={() => { setAudienceTab("tag"); onSelectedSegmentChange(null); }} className={`px-3 py-1 text-[10px] font-black uppercase tracking-wide rounded-md transition-colors cursor-pointer ${audienceTab === "tag" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>Tags</button>
              <button onClick={() => setAudienceTab("segment")} className={`px-3 py-1 text-[10px] font-black uppercase tracking-wide rounded-md transition-colors cursor-pointer ${audienceTab === "segment" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>Segments</button>
            </div>
          </div>
          {audienceTab === "tag" && (
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => onSelectedTagsChange([])} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${selectedTags.length === 0 ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}>All Contacts</button>
              {availableTags.map((tag) => (
                <button key={tag} onClick={() => { const s = selectedTags.includes(tag); onSelectedTagsChange(s ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag]); }} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${selectedTags.includes(tag) ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}>{tag}</button>
              ))}
              {availableTags.length === 0 && <span className="text-xs text-stone-400 italic">No CRM tags — will reach all contacts.</span>}
            </div>
          )}
          {audienceTab === "segment" && (
            <div className="space-y-1.5">
              {segmentsLoading && <p className="text-xs text-stone-400 italic">Loading segments…</p>}
              {!segmentsLoading && segments.map((seg) => (
                <button key={seg.id} onClick={() => onSelectedSegmentChange(selectedSegmentId === seg.id ? null : seg)} className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${selectedSegmentId === seg.id ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"}`}>
                  <span>{seg.name}</span>
                  {selectedSegmentId === seg.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
              {showNewSeg ? (
                <div className="kc-float p-4 rounded-xl space-y-2">
                  <input type="text" placeholder="Segment name…" value={newSegName} onChange={(e) => setNewSegName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void handleCreateSegment()} autoFocus className="ds-input text-xs" />
                  <div className="flex gap-2">
                    <button onClick={() => void handleCreateSegment()} disabled={!newSegName.trim() || creatingSegment} className="ds-btn ds-btn-primary ds-btn-sm flex-1">{creatingSegment ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}</button>
                    <button onClick={() => { setShowNewSeg(false); setNewSegName(""); }} className="ds-btn ds-btn-ghost ds-btn-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNewSeg(true)} className="text-[11px] font-black uppercase tracking-wider text-wa-green hover:text-wa-green-dark transition-colors cursor-pointer flex items-center gap-1.5 mt-1">+ New Segment</button>
              )}
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="px-6 py-6">
          <p className="text-sm font-black text-stone-900 uppercase tracking-tight mb-1">Launch Date &amp; Time</p>
          <p className="text-xs text-stone-500 mb-3">Schedule when the first message sends</p>
          <input type="datetime-local" value={scheduledAt} onChange={(e) => onScheduledAtChange(e.target.value)} className="ds-input" />
          {!scheduledAt && <p className="text-[10px] text-stone-400 mt-1.5">Leave empty to send immediately.</p>}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="px-6 py-4 border-t border-stone-200 bg-white shrink-0 flex gap-3">
        <button onClick={onPreviewFlow} className="ds-btn ds-btn-secondary flex items-center gap-2">
          <Eye className="w-3.5 h-3.5" /> Simulate
        </button>
        <button onClick={onLaunch} disabled={isLaunching} className="ds-btn ds-btn-primary flex-1 justify-center">
          {isLaunching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Review &amp; Launch</>}
        </button>
      </div>
    </div>
  );
};
