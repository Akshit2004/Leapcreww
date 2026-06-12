"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { IndianRupee, ShoppingCart, PackageCheck, Truck } from "lucide-react";

type EventKind = "cart" | "cod" | "ndr";

interface LedgerEvent {
  id: number;
  kind: EventKind;
  customer: string;
  amount: number;
  campaign: string;
  minutesAgo: number;
}

const KIND_META: Record<EventKind, { label: string; icon: typeof ShoppingCart; color: string; bg: string }> = {
  cart: { label: "CART RECOVERED", icon: ShoppingCart, color: "text-[#2E4A3F]", bg: "bg-[#2E4A3F]/8 border-[#2E4A3F]/20" },
  cod:  { label: "COD CONFIRMED",  icon: PackageCheck, color: "text-[#D05E3C]", bg: "bg-[#D05E3C]/8 border-[#D05E3C]/20" },
  ndr:  { label: "NDR RESCUED",    icon: Truck,        color: "text-[#1D211F]", bg: "bg-[#1D211F]/5 border-[#1D211F]/15" },
};

// Scripted, loops seamlessly — feels live without claiming to be.
const SCRIPT: Omit<LedgerEvent, "id">[] = [
  { kind: "cart", customer: "Ananya S.",  amount: 2499, campaign: "Festive Drop · IG Ads",   minutesAgo: 2 },
  { kind: "cod",  customer: "Rahul M.",   amount: 1899, campaign: "Win-Back · June",         minutesAgo: 3 },
  { kind: "ndr",  customer: "Priya K.",   amount: 3250, campaign: "Launch Waitlist",         minutesAgo: 5 },
  { kind: "cart", customer: "Vikram T.",  amount: 5499, campaign: "Abandoned Cart · Auto",   minutesAgo: 6 },
  { kind: "cod",  customer: "Sneha R.",   amount: 1299, campaign: "Flash Sale · WhatsApp",   minutesAgo: 8 },
  { kind: "cart", customer: "Arjun P.",   amount: 4199, campaign: "Retarget · FB CTWA",      minutesAgo: 9 },
  { kind: "ndr",  customer: "Meera D.",   amount: 2799, campaign: "Replenishment · 30d",     minutesAgo: 11 },
  { kind: "cart", customer: "Kabir J.",   amount: 6999, campaign: "New Arrivals · Broadcast", minutesAgo: 12 },
];

const VISIBLE = 5;
const TICK_MS = 2400;

function formatINR(n: number) {
  return n.toLocaleString("en-IN");
}

export default function AttributionLive() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { margin: "-100px" });

  const [events, setEvents] = useState<LedgerEvent[]>(() =>
    SCRIPT.slice(0, VISIBLE).map((e, i) => ({ ...e, id: i }))
  );
  const [recovered, setRecovered] = useState(
    () => SCRIPT.slice(0, VISIBLE).reduce((s, e) => s + e.amount, 0)
  );
  const cursorRef = useRef(VISIBLE);
  const idRef = useRef(VISIBLE);

  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => {
      const next = SCRIPT[cursorRef.current % SCRIPT.length];
      cursorRef.current += 1;
      const id = idRef.current++;
      setEvents((prev) => [{ ...next, id }, ...prev].slice(0, VISIBLE));
      setRecovered((prev) => prev + next.amount);
    }, TICK_MS);
    return () => clearInterval(t);
  }, [inView]);

  return (
    <section ref={sectionRef} className="py-24 md:py-32 px-6 md:px-12 bg-[#FAF7F2] border-b border-[#1D211F]/8 relative overflow-hidden">
      {/* faint grid backdrop */}
      <div aria-hidden className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(to right,#1D211F 1px,transparent 1px),linear-gradient(to bottom,#1D211F 1px,transparent 1px)", backgroundSize: "56px 56px" }} />

      <div className="max-w-7xl mx-auto relative grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* ── Left: editorial pitch + running counter ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="lg:col-span-5 space-y-8 lg:sticky lg:top-28"
        >
          <div className="inline-flex items-center gap-2">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#2E4A3F] opacity-60 pulse-ring" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[#2E4A3F]" />
            </span>
            <span className="font-mono text-[10px] tracking-widest text-[#2E4A3F] uppercase font-bold">The Attribution Ledger</span>
          </div>

          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.08] text-[#1D211F]">
            Every rupee,<br />
            <span className="italic font-normal text-[#2E4A3F]">accounted for.</span>
          </h2>

          <p className="text-[#1D211F]/65 text-sm sm:text-base leading-relaxed font-medium max-w-md">
            Other platforms stop at &ldquo;delivered&rdquo; and &ldquo;read.&rdquo; LeapCrew follows the money — every recovered cart, confirmed COD order, and rescued delivery is tied back to the exact campaign that earned it.
          </p>

          {/* Running recovered-revenue counter */}
          <div className="border border-[#1D211F]/12 bg-white/60 backdrop-blur-sm p-6 space-y-1.5 max-w-md">
            <div className="font-mono text-[9px] tracking-widest text-[#1D211F]/40 uppercase">Revenue attributed · simulated feed</div>
            <div className="flex items-baseline gap-1 font-serif text-4xl sm:text-5xl font-light text-[#1D211F] tabular-nums">
              <IndianRupee className="w-7 h-7 translate-y-0.5 text-[#2E4A3F]" strokeWidth={1.5} />
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={recovered}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block"
                >
                  {formatINR(recovered)}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="font-mono text-[9px] tracking-widest text-[#2E4A3F] uppercase font-bold">↑ ticking with every event →</div>
          </div>
        </motion.div>

        {/* ── Right: live event ledger ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="lg:col-span-7"
        >
          <div className="border border-[#1D211F]/12 bg-white">
            {/* ledger header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1D211F]/10 bg-[#F1EBE0]/60">
              <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/50 uppercase font-bold">Recovery Events</span>
              <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-[#2E4A3F] uppercase font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E4A3F] animate-pulse" />
                Streaming
              </span>
            </div>

            {/* rows */}
            <div className="divide-y divide-[#1D211F]/8">
              <AnimatePresence initial={false} mode="popLayout">
                {events.map((e) => {
                  const meta = KIND_META[e.kind];
                  const Icon = meta.icon;
                  return (
                    <motion.div
                      key={e.id}
                      layout
                      initial={{ opacity: 0, y: -24, backgroundColor: "rgba(46,74,63,0.07)" }}
                      animate={{ opacity: 1, y: 0, backgroundColor: "rgba(46,74,63,0)" }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_1fr_auto] items-center gap-3 sm:gap-4 px-5 py-4"
                    >
                      <span className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[8px] sm:text-[9px] tracking-widest font-bold uppercase ${meta.bg} ${meta.color}`}>
                        <Icon className="w-3 h-3" strokeWidth={2} />
                        <span className="hidden xs:inline sm:inline">{meta.label}</span>
                      </span>

                      <div className="min-w-0">
                        <div className="font-semibold text-xs sm:text-sm text-[#1D211F] truncate">{e.customer}</div>
                        <div className="font-mono text-[8px] sm:text-[9px] tracking-wider text-[#1D211F]/35 uppercase">{e.minutesAgo} min ago · WhatsApp</div>
                      </div>

                      <div className="hidden sm:block min-w-0">
                        <div className="font-mono text-[9px] tracking-wider text-[#1D211F]/45 uppercase truncate">→ {e.campaign}</div>
                      </div>

                      <div className="font-serif text-base sm:text-xl font-light text-[#1D211F] tabular-nums whitespace-nowrap">
                        ₹{formatINR(e.amount)}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* ledger footer */}
            <div className="px-5 py-3 border-t border-[#1D211F]/10 bg-[#F1EBE0]/40 font-mono text-[8px] sm:text-[9px] tracking-widest text-[#1D211F]/35 uppercase">
              Illustrative simulation — your ledger fills with real orders from day one
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
