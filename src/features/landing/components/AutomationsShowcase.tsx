"use client";
import { motion } from "framer-motion";
import { Zap, ArrowRight, CheckCircle2 } from "lucide-react";

const AUTOMATIONS = [
  { emoji: "🛒", title: "Abandoned Cart Recovery", category: "E-commerce", trigger: "Tag Added", steps: 3, desc: "3-touch drip with ₹50 discount unlock on final message" },
  { emoji: "👋", title: "New Contact Welcome", category: "Basics", trigger: "Welcome", steps: 1, desc: "Instant greeting the moment a new contact reaches out" },
  { emoji: "⭐", title: "Post-Delivery Review Ask", category: "E-commerce", trigger: "Tag Added", steps: 2, desc: "Auto-ask for review 2 days after delivery tag is set" },
  { emoji: "🔑", title: "Keyword Lead Magnet", category: "Lead Generation", trigger: "Keyword", steps: 2, desc: "Reply PRICE or INFO → instant pricing PDF + follow-up" },
  { emoji: "💊", title: "Medication Reminder", category: "Healthcare", trigger: "Tag Added", steps: 3, desc: "Daily + weekly adherence nudges for patient tags" },
  { emoji: "📦", title: "Order Shipped Sequence", category: "E-commerce", trigger: "Tag Added", steps: 2, desc: "Shipping + delivery confirmation with tracking deep-link" },
  { emoji: "💸", title: "COD → Prepaid Converter", category: "E-commerce", trigger: "Tag Added", steps: 2, desc: "Offer ₹50 off to confirm COD orders as prepaid" },
  { emoji: "🏠", title: "Property Visit Follow-up", category: "Real Estate", trigger: "Tag Added", steps: 3, desc: "Thank-you → brochure → agent call prompt sequence" },
  { emoji: "🎓", title: "Course Completion Badge", category: "HR", trigger: "Button Reply", steps: 2, desc: "Certificate delivery + upsell to advanced course" },
  { emoji: "✈️", title: "Flight Check-in Reminder", category: "Travel", trigger: "Tag Added", steps: 2, desc: "24h + 2h before departure automated reminders" },
  { emoji: "💰", title: "EMI Due Alert", category: "Finance", trigger: "Tag Added", steps: 2, desc: "3-day + 1-day before due-date payment nudges" },
  { emoji: "🎯", title: "Win-back Inactive Users", category: "Lead Generation", trigger: "Keyword", steps: 3, desc: "Re-engage contacts silent for 30 days with a special offer" },
];

const CATEGORY_COLOR: Record<string, string> = {
  "Basics":          "bg-stone-100 text-stone-600 border-stone-200",
  "E-commerce":      "bg-blue-50 text-blue-700 border-blue-200",
  "Lead Generation": "bg-amber-50 text-amber-700 border-amber-200",
  "Finance":         "bg-green-50 text-green-700 border-green-200",
  "Healthcare":      "bg-red-50 text-red-700 border-red-200",
  "HR":              "bg-violet-50 text-violet-700 border-violet-200",
  "Travel":          "bg-sky-50 text-sky-700 border-sky-200",
  "Real Estate":     "bg-orange-50 text-orange-700 border-orange-200",
};

const TRIGGER_COLOR: Record<string, string> = {
  "Keyword":     "text-blue-600",
  "Welcome":     "text-green-700",
  "Tag Added":   "text-purple-700",
  "Button Reply":"text-orange-700",
};

export default function AutomationsShowcase() {
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8 scroll-mt-20">
      {/* Heading */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start pb-14">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="lg:col-span-5 space-y-3">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ Automation Catalog ]</span>
          <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-[#1D211F]">
            20 playbooks,{" "}
            <span className="italic font-normal text-[#2E4A3F] shimmer-underline">install in one click.</span>
          </h2>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay: 0.1 }} className="lg:col-span-7 pt-2 lg:pt-8">
          <p className="text-[#1D211F]/70 text-sm sm:text-base leading-relaxed font-medium">
            Pre-built multi-step sequences for every industry — each one trigger-driven, multi-step, and customisable. Pick exactly the steps you need before installing. Or let the AI Composer write a custom playbook from a plain-English description.
          </p>
        </motion.div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
        {AUTOMATIONS.map((a, i) => {
          const catCls = CATEGORY_COLOR[a.category] ?? "bg-stone-100 text-stone-600 border-stone-200";
          const trigCls = TRIGGER_COLOR[a.trigger] ?? "text-stone-600";
          return (
            <motion.div key={a.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: (i % 4) * 0.06, duration: 0.5 }}
              className="group bg-white border border-[#1D211F]/8 rounded-2xl p-5 flex flex-col gap-3 hover:border-[#2E4A3F]/40 hover:shadow-sm transition-all cursor-default">
              {/* Emoji + category */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-3xl leading-none">{a.emoji}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catCls}`}>{a.category}</span>
              </div>
              {/* Title + desc */}
              <div className="flex-1">
                <p className="text-sm font-bold text-[#1D211F] leading-snug group-hover:text-[#2E4A3F] transition-colors">{a.title}</p>
                <p className="text-[11px] text-[#1D211F]/55 mt-1 leading-relaxed">{a.desc}</p>
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1D211F]/6">
                <div className="flex items-center gap-1.5">
                  <Zap className={`w-3 h-3 ${trigCls}`} />
                  <span className={`text-[10px] font-bold ${trigCls}`}>{a.trigger}</span>
                </div>
                <span className="text-[10px] text-[#1D211F]/35 font-mono">{a.steps} steps</span>
              </div>
            </motion.div>
          );
        })}

        {/* Remaining count card */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: 0.28 }}
          className="border border-dashed border-[#1D211F]/15 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-center bg-[#FAF7F2] hover:border-[#1D211F]/30 transition-all group">
          <span className="text-3xl">+8</span>
          <p className="text-xs font-bold text-[#1D211F]/60">more playbooks</p>
          <p className="text-[10px] text-[#1D211F]/40">across 8 industries</p>
        </motion.div>
      </div>

      {/* Stats strip */}
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
        className="flex flex-wrap gap-px bg-[#1D211F]/8 border border-[#1D211F]/8 rounded-2xl overflow-hidden">
        {[
          { n: "20", label: "Pre-built playbooks" },
          { n: "8",  label: "Industries covered" },
          { n: "4",  label: "Trigger types" },
          { n: "∞",  label: "Custom AI sequences" },
        ].map((s) => (
          <div key={s.label} className="flex-1 min-w-[140px] bg-[#FAF7F2] px-6 py-5 flex flex-col gap-1">
            <span className="font-serif text-3xl font-light text-[#1D211F]">{s.n}</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#1D211F]/45 font-bold">{s.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Feature bullets */}
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 flex flex-wrap gap-3">
        {[
          "Multi-step drip sequences",
          "Delay scheduling (minutes → days)",
          "Tag add / remove actions",
          "Per-step enable/disable on install",
          "AI Composer for custom flows",
          "Keyword · Welcome · Tag · Button triggers",
        ].map((b) => (
          <span key={b} className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#1D211F]/60 border border-[#1D211F]/10 rounded-full px-3 py-1.5 font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3 text-[#2E4A3F]" />{b}
          </span>
        ))}
      </motion.div>
    </section>
  );
}
