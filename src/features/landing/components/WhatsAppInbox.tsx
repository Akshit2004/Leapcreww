"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Video, MoreVertical, ArrowLeft, Smile, Paperclip, Mic, Check, CheckCheck, ShoppingBag, ExternalLink, Image as ImageIcon } from "lucide-react";

type MsgStatus = "sent" | "delivered" | "read";
type MsgDir = "in" | "out";
type MsgKind = "text" | "product";

interface Msg {
  id: number;
  dir: MsgDir;
  kind: MsgKind;
  text?: string;
  product?: { name: string; price: string; img: string };
  time: string;
  status?: MsgStatus;
}

const SCRIPT = [
  { type: "in", text: "Hey 👋 quick Q — is the Aurora hoodie still available in olive size M?", delay: 900 },
  { type: "typing-on", delay: 600 },
  { type: "typing-off", delay: 1500 },
  { type: "out", text: "Hi Maya ✨ Yes! Olive M and L are both in stock. Want me to hold one for you?", delay: 150 },
  { type: "in", text: "Yes please, size M 🙏", delay: 1700 },
  { type: "typing-on", delay: 500 },
  { type: "typing-off", delay: 1200 },
  { type: "out", text: "Locked it for 15 mins. Sending the secure checkout link now…", delay: 100 },
  { type: "out-product", product: { name: "Aurora Hoodie · Olive M", price: "₹2,899", img: "aurora" }, delay: 800 },
  { type: "in", text: "Paid ✅", delay: 2400 },
  { type: "typing-on", delay: 400 },
  { type: "typing-off", delay: 1000 },
  { type: "out", text: "Got it! Order #WF-2249 confirmed 🎉", delay: 150 },
  { type: "out", text: "Tracking link incoming via Shopify webhook — shipping in 24h 🚚", delay: 900 },
  { type: "in", text: "Amazing, thank you! 💚", delay: 1800 },
  { type: "reset", delay: 3500 },
];

const initialTime = () => {
  const d = new Date();
  const hh = d.getHours() % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

let msgId = 1000;

function StatusTicks({ status }: { status?: MsgStatus }) {
  if (!status || status === "sent") return <Check className="w-3 h-3 text-white/55" strokeWidth={2.5} />;
  if (status === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-white/55" strokeWidth={2.5} />;
  return <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" strokeWidth={2.5} />;
}

function TagBadge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="shrink-0 font-mono text-[9px] tracking-widest uppercase font-semibold px-2 py-0.5 rounded border" style={{ color, borderColor: `${color}55`, backgroundColor: `${color}1A` }}>
      {children}
    </span>
  );
}

function MessageBubble({ msg, isLastOfGroup }: { msg: Msg; isLastOfGroup: boolean }) {
  const isOut = msg.dir === "out";
  if (msg.kind === "product") {
    return (
      <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25 }} className="flex justify-end">
        <div className="bg-[#005C4B] text-white rounded-lg rounded-tr-sm shadow-sm max-w-[78%] overflow-hidden">
          <div className="p-1.5 bg-[#004A3D]">
            <div className="w-full h-24 rounded-md bg-gradient-to-br from-[#2E4A3F] via-[#3D6354] to-[#1D211F] relative overflow-hidden flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-white/70" />
              <span className="absolute top-1.5 right-1.5 bg-black/50 text-[8px] font-mono uppercase tracking-widest text-white/80 px-1.5 py-0.5 rounded">In stock</span>
              <span className="absolute bottom-1.5 left-1.5 bg-white/10 backdrop-blur-sm text-[9px] font-mono text-white/90 px-1.5 py-0.5 rounded flex items-center gap-1">
                <ImageIcon className="w-2.5 h-2.5" /> aurora-olive.jpg
              </span>
            </div>
          </div>
          <div className="px-3 py-2 space-y-1">
            <div className="text-[11px] font-bold leading-snug">{msg.product?.name}</div>
            <div className="text-[10px] text-white/70">Olive · 100% organic cotton</div>
            <div className="flex items-end justify-between pt-1">
              <span className="text-base font-semibold">{msg.product?.price}</span>
              <span className="text-[9px] text-white/60">2 min ago</span>
            </div>
            <button className="w-full mt-1 bg-white/10 hover:bg-white/15 text-[10px] uppercase tracking-widest font-bold py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors">
              View Product <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div className="px-3 pb-1.5 flex items-center justify-end gap-1">
            <span className="text-[9px] text-white/55">{msg.time}</span>
            <StatusTicks status={msg.status} />
          </div>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 6, x: isOut ? 10 : -10 }} animate={{ opacity: 1, y: 0, x: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] px-3 py-1.5 shadow-sm relative ${isOut ? `bg-[#005C4B] text-white ${isLastOfGroup ? "rounded-lg rounded-tr-sm" : "rounded-lg"}` : `bg-[#1F2C34] text-[#FAF7F2] ${isLastOfGroup ? "rounded-lg rounded-tl-sm" : "rounded-lg"}`}`}>
        <p className="text-[12.5px] leading-snug whitespace-pre-wrap">{msg.text}</p>
        <div className={`flex items-center justify-end gap-1 -mt-0.5 mb-0.5 ${isOut ? "text-white/55" : "text-[#FAF7F2]/45"}`}>
          <span className="text-[9px]">{msg.time}</span>
          {isOut && <StatusTicks status={msg.status} />}
        </div>
      </div>
    </motion.div>
  );
}

export default function WhatsAppInbox() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushMessage = useCallback((data: Omit<Msg, "id" | "time">) => {
    const id = ++msgId;
    const time = initialTime();
    setMessages((prev) => [...prev, { id, time, ...data } as Msg]);
    if (data.dir === "out") {
      setTimeout(() => setMessages((prev) => prev.map((m) => m.id === id ? { ...m, status: "delivered" as MsgStatus } : m)), 700);
      setTimeout(() => setMessages((prev) => prev.map((m) => m.id === id ? { ...m, status: "read" as MsgStatus } : m)), 1500);
    }
  }, []);

  useEffect(() => {
    const run = () => {
      const step = SCRIPT[stepRef.current % SCRIPT.length];
      timeoutRef.current = setTimeout(() => {
        if (step.type === "in") pushMessage({ dir: "in", kind: "text", text: step.text });
        else if (step.type === "out") pushMessage({ dir: "out", kind: "text", text: step.text });
        else if (step.type === "out-product") pushMessage({ dir: "out", kind: "product", product: step.product });
        else if (step.type === "typing-on") setTyping(true);
        else if (step.type === "typing-off") setTyping(false);
        else if (step.type === "reset") { setMessages([]); setTyping(false); }
        stepRef.current = (stepRef.current + 1) % SCRIPT.length;
        run();
      }, step.delay);
    };
    run();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [pushMessage]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  return (
    <div className="flex flex-col h-full bg-[#0B141A] -m-4 sm:-m-5 rounded-md overflow-hidden border border-[#FAF7F2]/5">
      <div className="bg-[#1F2C34] px-3 py-2.5 flex items-center gap-3 shrink-0 border-b border-black/20">
        <button className="text-[#FAF7F2]/70 hover:text-[#FAF7F2] -ml-1 sm:hidden"><ArrowLeft className="w-4 h-4" /></button>
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D05E3C] to-[#FBBF24] flex items-center justify-center text-white font-bold text-xs ring-2 ring-[#0B141A]">MS</div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#1F2C34]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-[#FAF7F2] truncate">Maya Sharma</div>
          <div className="text-[10px] text-emerald-300 font-medium tracking-wide">
            {typing ? <span className="flex items-center gap-1">typing<span className="inline-flex"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></span></span> : "online · last seen just now"}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[#FAF7F2]/70">
          <Video className="w-4 h-4 hover:text-[#FAF7F2] cursor-pointer" />
          <Phone className="w-4 h-4 hover:text-[#FAF7F2] cursor-pointer" />
          <MoreVertical className="w-4 h-4 hover:text-[#FAF7F2] cursor-pointer" />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar relative" style={{ backgroundImage: "radial-gradient(circle at 20% 20%,rgba(37,211,102,0.04),transparent 50%),radial-gradient(circle at 80% 70%,rgba(208,94,60,0.04),transparent 50%)", backgroundColor: "#0B141A" }}>
        <div className="flex justify-center py-2"><span className="bg-[#1F2C34] text-[#FAF7F2]/60 font-mono text-[9px] px-2 py-0.5 rounded tracking-wider">TODAY</span></div>
        <div className="flex justify-center pb-2"><span className="bg-[#1F2C34]/80 text-amber-200/70 text-[9px] px-2.5 py-1 rounded max-w-[80%] text-center leading-snug">🔒 Messages and calls are end-to-end encrypted. LeapCreww Business verified ✓</span></div>
        <AnimatePresence initial={false}>
          {messages.map((m, idx) => (
            <MessageBubble key={m.id} msg={m} isLastOfGroup={idx === messages.length - 1 || messages[idx + 1]?.dir !== m.dir} />
          ))}
          {typing && (
            <motion.div key="typing" initial={{ opacity: 0, y: 4, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} className="flex justify-end">
              <div className="bg-[#005C4B] text-white px-3.5 py-2.5 rounded-lg rounded-tr-sm flex items-center gap-1.5 shadow-sm">
                <span className="typing-dot" style={{ background: "rgba(255,255,255,0.85)" }} /><span className="typing-dot" style={{ background: "rgba(255,255,255,0.85)" }} /><span className="typing-dot" style={{ background: "rgba(255,255,255,0.85)" }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-[#1F2C34] px-2 py-2 flex items-center gap-2 shrink-0 border-t border-black/30">
        <button className="text-[#FAF7F2]/55 hover:text-[#FAF7F2] p-1.5"><Smile className="w-5 h-5" /></button>
        <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-1.5 flex items-center gap-2 min-w-0">
          <span className="text-[11px] text-[#FAF7F2]/40 truncate flex-1">Message Maya Sharma</span>
          <Paperclip className="w-4 h-4 text-[#FAF7F2]/50 rotate-[-45deg] shrink-0" />
        </div>
        <button className="w-9 h-9 rounded-full bg-[#00A884] flex items-center justify-center text-white shrink-0 hover:bg-[#06b193] transition-colors" aria-label="Voice">
          <Mic className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-[#0B141A] px-3 py-2 flex items-center gap-2 border-t border-black/30 shrink-0 overflow-x-auto no-scrollbar">
        <span className="font-mono text-[8px] tracking-widest text-[#FAF7F2]/30 uppercase shrink-0">Tags:</span>
        <TagBadge color="#D05E3C">shopify-active</TagBadge>
        <TagBadge color="#FBBF24">vip</TagBadge>
        <TagBadge color="#34D399">order-confirmed</TagBadge>
        <TagBadge color="#60A5FA">agent:alex</TagBadge>
      </div>
    </div>
  );
}
