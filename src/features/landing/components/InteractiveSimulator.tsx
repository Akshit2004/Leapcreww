"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, MessageSquare, Megaphone, Cpu, Terminal, Zap, Sliders, Play, type LucideIcon } from "lucide-react";
import WhatsAppInbox from "./WhatsAppInbox";

function SimButton({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title: string }) {
  return (
    <button onClick={onClick} title={title} className={`p-2.5 rounded-lg transition-all ${active ? "bg-[#2E4A3F] text-[#FAF7F2]" : "text-[#FAF7F2]/40 hover:text-[#FAF7F2] hover:bg-[#FAF7F2]/5"}`}>
      {children}
    </button>
  );
}

function StatBox({ label, value, hint, tone }: { label: string; value: number; hint: string; tone: "paper" | "emerald" | "terracotta" | "amber" }) {
  const colorMap = { paper: "text-[#FAF7F2]", emerald: "text-emerald-400", terracotta: "text-[#D05E3C]", amber: "text-amber-400" };
  return (
    <div className="bg-[#171A19] border border-[#FAF7F2]/5 rounded-lg p-3 space-y-1">
      <div className="text-[9px] font-mono tracking-widest text-[#FAF7F2]/40 uppercase">{label}</div>
      <div className={`text-xl font-bold font-mono ${colorMap[tone]}`}>{value}</div>
      <div className="text-[9px] text-[#FAF7F2]/30">{hint}</div>
    </div>
  );
}

function FlowNode({ active, color, Icon, label, title }: { active: boolean; color: string; Icon: LucideIcon; label: string; title: string }) {
  return (
    <div className={`z-10 w-[90%] bg-[#171A19] border-2 rounded-lg p-3 flex items-center gap-3 transition-all duration-300 ${active ? "shadow-lg scale-[1.02]" : ""}`}
      style={{ borderColor: active ? color : "rgba(250,247,242,0.1)", boxShadow: active ? `0 8px 24px ${color}25` : "none" }}>
      <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}26` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-[9px] font-mono text-[#FAF7F2]/45 uppercase tracking-wider">{label}</div>
        <div className="text-xs font-bold truncate" dangerouslySetInnerHTML={{ __html: title }} />
      </div>
    </div>
  );
}

function FlowConnector({ active }: { active: boolean }) {
  return (
    <div className="relative w-px h-3">
      <div className="absolute inset-0 bg-[#FAF7F2]/10" />
      {active && <div className="absolute inset-0 bg-[#D05E3C] animate-pulse" />}
    </div>
  );
}

export default function InteractiveSimulator() {
  const [activeTab, setActiveTab] = useState<"inbox" | "campaigns" | "chatbot">("inbox");
  const [campaignProgress, setCampaignProgress] = useState(85);
  const [campaignStats, setCampaignStats] = useState({ sent: 3420, delivered: 3392, read: 2914, clicks: 1256 });
  const [campaignRunning, setCampaignRunning] = useState(false);
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [botLog, setBotLog] = useState<string[]>(["System initialized. Waiting for trigger..."]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (campaignRunning) {
      interval = setInterval(() => {
        setCampaignProgress((prev) => { if (prev >= 100) { setCampaignRunning(false); return 100; } return prev + 1.5; });
        setCampaignStats((prev) => ({ sent: 3420, delivered: Math.min(3420, prev.delivered + Math.floor(Math.random() * 3) + 1), read: Math.min(3392, prev.read + Math.floor(Math.random() * 4) + 1), clicks: Math.min(2914, prev.clicks + Math.floor(Math.random() * 2) + 1) }));
      }, 300);
    }
    return () => clearInterval(interval);
  }, [campaignRunning]);

  const runCampaignSimulation = () => { setCampaignProgress(85); setCampaignStats({ sent: 3420, delivered: 3380, read: 2880, clicks: 1220 }); setCampaignRunning(true); };

  const runChatbotSimulation = () => {
    setActiveNode(1);
    setBotLog(["[Node 1] Incoming Customer Message: 'Join'", "Analyzing trigger criteria..."]);
    setTimeout(() => {
      setActiveNode(2);
      setBotLog((prev) => [...prev, "[Node 2] Filter passed: customer tag 'vip' matches.", "Retrieving metadata payloads..."]);
      setTimeout(() => {
        setActiveNode(3);
        setBotLog((prev) => [...prev, "[Node 3] Action dispatched: WhatsApp Template sent.", "[Node 3] Outbound Shopify Webhook fired! (Status 200 OK)"]);
        setTimeout(() => { setActiveNode(null); setBotLog((prev) => [...prev, "Simulation finished successfully. Flow idle."]); }, 1200);
      }, 1200);
    }, 1200);
  };

  return (
    <div className="bg-[#1D211F] text-[#FAF7F2] rounded-xl overflow-hidden shadow-2xl border border-[#FAF7F2]/10 flex flex-col h-[540px] transition-all duration-300">
      <div className="bg-[#171A19] px-4 py-3 border-b border-[#FAF7F2]/8 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D05E3C]/80" /><span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" /><span className="w-2.5 h-2.5 rounded-full bg-[#2E4A3F]/80" />
        </div>
        <div className="bg-[#1D211F] rounded-md px-3 py-1 text-[10px] font-mono tracking-wider text-[#FAF7F2]/50 border border-[#FAF7F2]/5 w-[50%] text-center truncate">leapcreww.app/workspace/active</div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-ring" />
          <span className="font-mono text-[9px] text-emerald-400 tracking-wider">LIVE</span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-14 sm:w-16 bg-[#171A19] border-r border-[#FAF7F2]/8 flex flex-col items-center py-6 gap-6 shrink-0">
          <SimButton active={activeTab === "inbox"} onClick={() => setActiveTab("inbox")} title="Shared Inbox"><MessageSquare className="w-5 h-5" /></SimButton>
          <SimButton active={activeTab === "campaigns"} onClick={() => setActiveTab("campaigns")} title="Campaigns"><Megaphone className="w-5 h-5" /></SimButton>
          <SimButton active={activeTab === "chatbot"} onClick={() => setActiveTab("chatbot")} title="Chatbot"><Bot className="w-5 h-5" /></SimButton>
          <div className="mt-auto p-2 text-[#FAF7F2]/20"><Terminal className="w-4 h-4" /></div>
        </div>

        <div className="flex-1 flex flex-col bg-[#1D211F] p-4 sm:p-5 overflow-y-auto custom-scrollbar min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === "inbox" && (
              <motion.div key="inbox" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="flex flex-col h-full">
                <WhatsAppInbox />
              </motion.div>
            )}

            {activeTab === "campaigns" && (
              <motion.div key="campaigns" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="flex flex-col h-full space-y-4">
                <div className="flex items-center justify-between border-b border-[#FAF7F2]/8 pb-2 shrink-0">
                  <div><div className="font-bold text-xs tracking-wide">PostgreSQL Campaign Synced</div><div className="text-[10px] text-[#FAF7F2]/50 font-mono">Table: `waba_broadcasts`</div></div>
                  <button onClick={runCampaignSimulation} disabled={campaignRunning} className="bg-[#2E4A3F] hover:bg-[#3d6354] disabled:opacity-50 disabled:cursor-not-allowed text-[#FAF7F2] font-semibold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors">
                    <Play className="w-3 h-3 fill-current" /><span>Run Campaign</span>
                  </button>
                </div>
                <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="bg-[#171A19] border border-[#FAF7F2]/5 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-[#FAF7F2]/60 uppercase tracking-wider">Broadcast dispatch progress</span>
                      <span className="font-bold text-emerald-400">{Math.floor(campaignProgress)}%</span>
                    </div>
                    <div className="w-full bg-[#1D211F] h-1.5 rounded overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-300 ease-out" style={{ width: `${campaignProgress}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <StatBox label="Sent Queue" value={campaignStats.sent} hint="Target: `shopify-active`" tone="paper" />
                    <StatBox label="Delivered" value={campaignStats.delivered} hint={`${((campaignStats.delivered / campaignStats.sent) * 100).toFixed(1)}% Rate`} tone="emerald" />
                    <StatBox label="Read Confirmation" value={campaignStats.read} hint={`${((campaignStats.read / Math.max(campaignStats.delivered, 1)) * 100).toFixed(1)}% Read Index`} tone="terracotta" />
                    <StatBox label="Interactive Clicks" value={campaignStats.clicks} hint={`${((campaignStats.clicks / Math.max(campaignStats.read, 1)) * 100).toFixed(1)}% CTR`} tone="amber" />
                  </div>
                  <div className="bg-[#171A19] border border-[#FAF7F2]/5 rounded-lg p-3 space-y-1.5">
                    <div className="text-[9px] font-mono text-[#FAF7F2]/40 uppercase tracking-wider">Meta Broadcast Template Preview:</div>
                    <p className="text-xs bg-[#1D211F] rounded p-2 text-[#FAF7F2]/80 border border-[#FAF7F2]/5 leading-relaxed font-mono">
                      &quot;Hello <span className="text-[#D05E3C] font-bold">{"{customer_name}"}</span>, your subscription is ready. Log in to <span className="text-emerald-400">leapcreww.app/verify</span> to authorize access.&quot;
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "chatbot" && (
              <motion.div key="chatbot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="flex flex-col h-full space-y-4">
                <div className="flex items-center justify-between border-b border-[#FAF7F2]/8 pb-2 shrink-0">
                  <div><div className="font-bold text-xs tracking-wide">Automated Chatbot Logic</div><div className="text-[10px] text-[#FAF7F2]/50 font-mono">Node Flow Router</div></div>
                  <button onClick={runChatbotSimulation} className="bg-[#2E4A3F] hover:bg-[#3d6354] text-[#FAF7F2] font-semibold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors">
                    <Zap className="w-3 h-3 text-amber-400 fill-current" /><span>Trigger Flow</span>
                  </button>
                </div>
                <div className="flex-1 flex flex-col justify-between py-2 space-y-3 min-h-0 overflow-y-auto custom-scrollbar">
                  <div className="relative flex flex-col gap-4 items-center py-2 shrink-0">
                    <FlowNode active={activeNode === 1} color="#D05E3C" Icon={MessageSquare} label="Trigger event" title='User message contains "Join"' />
                    <FlowConnector active={(activeNode ?? 0) >= 2} />
                    <FlowNode active={activeNode === 2} color="#FBBF24" Icon={Sliders} label="Conditional filter" title='Validate user tag: "vip"' />
                    <FlowConnector active={activeNode === 3} />
                    <FlowNode active={activeNode === 3} color="#34D399" Icon={Cpu} label="Action dispatched" title="Sync webhook &amp; dispatch template" />
                  </div>
                  <div className="bg-[#171A19] border border-[#FAF7F2]/5 rounded-lg p-3 font-mono text-[10px] text-[#FAF7F2]/60 space-y-1">
                    <div className="text-[8px] text-[#FAF7F2]/30 uppercase tracking-widest pb-1 border-b border-[#FAF7F2]/5">Execution Log Console:</div>
                    <div className="h-20 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {botLog.map((log, idx) => (
                        <div key={idx} className={log.includes("OK") || log.includes("successfully") ? "text-emerald-400" : log.includes("Filter") ? "text-amber-300" : "text-[#FAF7F2]/70"}>&gt; {log}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-[#171A19] border-t border-[#FAF7F2]/8 px-4 py-2 flex items-center justify-between text-[9px] font-mono text-[#FAF7F2]/40 shrink-0 select-none">
        <span>ENV: POSIX // NODE_ENV = PROD</span>
        <span>CONVERSATIONS: ACTIVE</span>
      </div>
    </div>
  );
}
