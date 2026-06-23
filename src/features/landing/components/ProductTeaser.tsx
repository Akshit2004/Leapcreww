"use client";
import { motion } from "framer-motion";
import { ArrowRight, FileText, Zap, Bot } from "lucide-react";
import Link from "next/link";

const CARDS = [
  {
    icon: FileText,
    accent: "#7c3aed",
    accentBg: "#ede9fe",
    tag: "Template Library",
    title: "150+ industry templates",
    desc: "E-commerce, healthcare, finance, travel, HR and more — all Meta-compliant. AI Auditor keeps approval rates near 100%.",
    stats: [{ n: "150+", l: "Templates" }, { n: "10", l: "Industries" }, { n: "~100%", l: "Approval rate" }],
    href: "/templates",
    cta: "Browse templates",
  },
  {
    icon: Zap,
    accent: "#D05E3C",
    accentBg: "#FEF3EE",
    tag: "Automation Catalog",
    title: "20 playbooks, one click",
    desc: "Pre-built multi-step drip sequences for every vertical. Choose which steps to install. Or use the AI Composer.",
    stats: [{ n: "20", l: "Playbooks" }, { n: "8", l: "Industries" }, { n: "4", l: "Trigger types" }],
    href: "/automations",
    cta: "View catalog",
  },
  {
    icon: Bot,
    accent: "#2E4A3F",
    accentBg: "#d1fae5",
    tag: "AI Agents",
    title: "Revenue pipelines on autopilot",
    desc: "RTO Reduction, Cart Recovery, and Shade/Size Finder — each pre-wired to Shopify, Razorpay, and WhatsApp.",
    stats: [{ n: "38%", l: "RTO cut" }, { n: "22%", l: "Cart recovery" }, { n: "24×7", l: "Autonomous" }],
    href: "/agents",
    cta: "Meet the agents",
  },
];

export default function ProductTeaser() {
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
      <div className="mb-12 space-y-3">
        <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold block">
          [ What&apos;s inside ]
        </motion.span>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-[#1D211F]">
          Templates. Automations. <span className="italic text-[#2E4A3F]">AI Agents.</span>
        </motion.h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.href} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="group bg-white border border-[#1D211F]/8 rounded-2xl overflow-hidden flex flex-col hover:border-[#1D211F]/20 hover:shadow-md transition-all">
              <div className="h-1.5 shrink-0" style={{ background: card.accent }} />

              <div className="p-6 flex flex-col gap-4 flex-1">
                {/* Icon + tag */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.accentBg }}>
                    <Icon className="w-5 h-5" style={{ color: card.accent }} />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold" style={{ color: card.accent }}>{card.tag}</span>
                </div>

                {/* Title + desc */}
                <div className="flex-1">
                  <h3 className="font-serif text-2xl font-light text-[#1D211F] leading-tight group-hover:text-[#2E4A3F] transition-colors">{card.title}</h3>
                  <p className="text-[#1D211F]/60 text-sm leading-relaxed mt-2">{card.desc}</p>
                </div>

                {/* Stats */}
                <div className="flex gap-4 border-t border-[#1D211F]/6 pt-4">
                  {card.stats.map((s) => (
                    <div key={s.l} className="flex flex-col gap-0.5">
                      <span className="font-serif text-xl font-light text-[#1D211F]" style={{ color: card.accent }}>{s.n}</span>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[#1D211F]/40 font-bold">{s.l}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Link href={card.href}
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider border border-[#1D211F]/15 hover:border-[#1D211F]/40 px-4 py-2.5 rounded-xl transition-all group/link w-fit">
                  {card.cta}
                  <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" style={{ color: card.accent }} />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
