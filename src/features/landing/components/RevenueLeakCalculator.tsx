"use client";
import { useMemo, useState } from "react";
import { motion, useSpring, useMotionValueEvent } from "framer-motion";
import { ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";

// Directional industry benchmarks — surfaced honestly in the footnote.
const CART_RECOVERY_RATE = 0.22;  // recovered share of abandoned carts
const ABANDON_MULTIPLIER = 1.0;   // abandoned carts ≈ completed orders (conservative)
const COD_RTO_RATE = 0.25;        // industry RTO on unconfirmed COD
const RTO_CUT = 0.3;              // share of RTO prevented by WhatsApp confirmation

function formatINR(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}

function SpringNumber({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(value, { stiffness: 80, damping: 20 });
  const [display, setDisplay] = useState(value);
  spring.set(value);
  useMotionValueEvent(spring, "change", (v) => setDisplay(v));
  return <span className={className}>₹{formatINR(display)}</span>;
}

interface SliderProps {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

function Slider({ label, hint, value, min, max, step, format, onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="font-sans font-bold text-xs text-[#1D211F] uppercase tracking-wider">{label}</div>
          <div className="font-mono text-[9px] tracking-widest text-[#1D211F]/40 uppercase">{hint}</div>
        </div>
        <div className="font-serif text-2xl font-light text-[#1D211F] tabular-nums whitespace-nowrap">{format(value)}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-[3px] appearance-none cursor-pointer bg-transparent leak-slider"
        style={{ background: `linear-gradient(to right, #2E4A3F ${pct}%, rgba(29,33,31,0.12) ${pct}%)` }}
        aria-label={label}
      />
    </div>
  );
}

export default function RevenueLeakCalculator() {
  const [orders, setOrders] = useState(1500);
  const [aov, setAov] = useState(1200);
  const [codShare, setCodShare] = useState(60);

  const { cartGain, rtoSaved, total } = useMemo(() => {
    const cartGain = orders * ABANDON_MULTIPLIER * CART_RECOVERY_RATE * aov;
    const rtoSaved = orders * (codShare / 100) * COD_RTO_RATE * RTO_CUT * aov;
    return { cartGain, rtoSaved, total: cartGain + rtoSaved };
  }, [orders, aov, codShare]);

  return (
    <section className="py-24 md:py-32 px-6 md:px-12 bg-[#F1EBE0] border-b border-[#1D211F]/8 relative overflow-hidden">
      <style>{`
        .leak-slider::-webkit-slider-thumb {
          appearance: none; width: 18px; height: 18px; border-radius: 9999px;
          background: #1D211F; border: 3px solid #F1EBE0; box-shadow: 0 0 0 1px rgba(29,33,31,0.3);
          cursor: grab; transition: transform .15s ease;
        }
        .leak-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
        .leak-slider::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.1); }
        .leak-slider::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 9999px;
          background: #1D211F; border: 3px solid #F1EBE0; cursor: grab;
        }
      `}</style>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start relative">
        {/* ── Left: editorial setup ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="lg:col-span-5 space-y-6"
        >
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">The Leak Audit</span>
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.08] text-[#1D211F]">
            How much are you <span className="italic font-normal text-[#D05E3C]">leaking</span> every month?
          </h2>
          <p className="text-[#1D211F]/65 text-sm sm:text-base leading-relaxed font-medium max-w-md">
            Abandoned carts walk away. Unconfirmed COD orders bounce back as RTO. Most brands never see the number — drag the sliders and watch yours appear.
          </p>
          <div className="flex items-center gap-3 pt-2 font-mono text-[9px] tracking-widest text-[#1D211F]/40 uppercase">
            <TrendingUp className="w-3.5 h-3.5 text-[#2E4A3F]" />
            <span>Live estimate · updates as you drag</span>
          </div>
        </motion.div>

        {/* ── Right: interactive panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="lg:col-span-7"
        >
          <div className="bg-white border border-[#1D211F]/12">
            {/* sliders */}
            <div className="p-6 sm:p-8 space-y-8 border-b border-[#1D211F]/10">
              <Slider
                label="Monthly orders"
                hint="completed orders / month"
                value={orders} min={100} max={20000} step={100}
                format={(v) => v.toLocaleString("en-IN")}
                onChange={setOrders}
              />
              <Slider
                label="Average order value"
                hint="AOV in rupees"
                value={aov} min={300} max={6000} step={100}
                format={(v) => `₹${v.toLocaleString("en-IN")}`}
                onChange={setAov}
              />
              <Slider
                label="COD share"
                hint="% of orders paid cash-on-delivery"
                value={codShare} min={0} max={100} step={5}
                format={(v) => `${v}%`}
                onChange={setCodShare}
              />
            </div>

            {/* breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#1D211F]/10 border-b border-[#1D211F]/10">
              <div className="p-6 sm:p-8 space-y-1">
                <div className="font-mono text-[9px] tracking-widest text-[#1D211F]/40 uppercase">Carts recoverable / mo</div>
                <SpringNumber value={cartGain} className="font-serif text-3xl font-light text-[#2E4A3F] tabular-nums" />
                <div className="font-mono text-[8px] tracking-wider text-[#1D211F]/35 uppercase">via automated WhatsApp recovery</div>
              </div>
              <div className="p-6 sm:p-8 space-y-1">
                <div className="font-mono text-[9px] tracking-widest text-[#1D211F]/40 uppercase">RTO losses preventable / mo</div>
                <SpringNumber value={rtoSaved} className="font-serif text-3xl font-light text-[#D05E3C] tabular-nums" />
                <div className="font-mono text-[8px] tracking-wider text-[#1D211F]/35 uppercase">via COD confirmation + NDR rescue</div>
              </div>
            </div>

            {/* total + CTA */}
            <div className="bg-[#1D211F] text-[#FAF7F2] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="font-mono text-[9px] tracking-widest text-[#FAF7F2]/45 uppercase">Total revenue on the table</div>
                <SpringNumber value={total} className="font-serif text-4xl sm:text-5xl font-light text-[#FAF7F2] tabular-nums" />
                <div className="font-mono text-[9px] tracking-widest text-amber-300/90 uppercase font-bold">≈ ₹{formatINR(total * 12)} / year</div>
              </div>
              <Link href="/signup" className="group shrink-0 bg-[#D05E3C] hover:bg-[#b04826] text-white font-bold text-xs tracking-wider uppercase px-6 py-4 rounded-md flex items-center gap-2 transition-colors">
                <span>Recover It — Free Trial</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <p className="pt-4 font-mono text-[8px] sm:text-[9px] tracking-widest text-[#1D211F]/35 uppercase leading-relaxed">
            Directional estimate. Assumes industry benchmarks: 22% cart recovery rate, 25% RTO on unconfirmed COD, 30% RTO reduction via confirmation flows. Your numbers will vary.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
