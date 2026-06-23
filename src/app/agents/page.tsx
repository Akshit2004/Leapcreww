"use client";
import Header from "@/features/landing/components/Header";
import Footer from "@/features/landing/components/Footer";
import AgentsShowcase from "@/features/landing/components/AgentsShowcase";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Bot, ShoppingCart, Palette } from "lucide-react";
import Link from "next/link";

const METRICS = [
  { n: "38%", label: "RTO reduction", color: "#D05E3C" },
  { n: "22%", label: "Cart recovery rate", color: "#0891b2" },
  { n: "3-tap", label: "To the right shade/size", color: "#7c3aed" },
  { n: "24×7", label: "Runs without human input", color: "#2E4A3F" },
];

export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1D211F] flex flex-col font-sans overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="pt-40 pb-16 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }} className="max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 border border-[#1D211F]/12 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E4A3F] animate-pulse" />
            <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/60 uppercase font-bold">[ AI Agents — Live ]</span>
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.04]">
            Revenue pipelines that{" "}
            <span className="italic text-[#2E4A3F]">run themselves.</span>
          </h1>
          <p className="text-[#1D211F]/65 text-base sm:text-lg leading-relaxed max-w-2xl font-medium">
            Three purpose-built autonomous agents for e-commerce — each pre-wired to WhatsApp, Shopify, and Razorpay. Activate once, configure in minutes, and let them compound revenue around the clock.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link href="/signup" className="inline-flex items-center gap-2 bg-[#1D211F] text-[#FAF7F2] px-6 py-3 rounded-md text-sm font-bold tracking-wide hover:bg-[#2E4A3F] transition-colors">
              Activate your first agent free <ArrowRight className="w-4 h-4" />
            </Link>
            <span className="text-xs text-[#1D211F]/45 font-mono">Setup takes ~5 minutes</span>
          </div>
        </motion.div>

        {/* Metrics strip */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-12 flex flex-wrap gap-px bg-[#1D211F]/8 border border-[#1D211F]/8 rounded-2xl overflow-hidden">
          {METRICS.map((m) => (
            <div key={m.label} className="flex-1 min-w-[140px] bg-[#FAF7F2] px-6 py-5 flex flex-col gap-0.5">
              <span className="font-serif text-3xl font-light" style={{ color: m.color }}>{m.n}</span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#1D211F]/45 font-bold">{m.label}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Agent cards */}
      <AgentsShowcase />

      {/* Agent breakdown */}
      <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10 space-y-2">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">How each agent works</span>
          <h2 className="font-serif text-3xl font-light text-[#1D211F]">Pre-wired logic, zero code.</h2>
        </motion.div>

        <div className="space-y-4">
          {[
            {
              icon: Bot,
              accent: "#D05E3C",
              accentBg: "#FEF3EE",
              title: "RTO Reduction Agent",
              steps: [
                "New COD order created in Shopify → risk scored 0–10",
                "Score ≥ 7 → Shopify fulfillment paused + YES/NO verification sent on WhatsApp",
                "Customer confirms → hold released. Declines → ₹99 token prepay challenge sent via Razorpay",
                "Token paid → order fulfilled. Not paid → order cancelled. Outcome logged to attribution ledger.",
              ],
            },
            {
              icon: ShoppingCart,
              accent: "#0891b2",
              accentBg: "#e0f2fe",
              title: "Cart Recovery Agent",
              steps: [
                "60 min after cart abandonment → first WhatsApp reminder with product image",
                "No purchase after 2h → AI objection analyser reads any reply and handles price/shipping concerns",
                "Still no purchase after 24h → final message with discount code (configurable)",
                "Any purchase at any stage → sequence stops. Revenue attributed to campaign.",
              ],
            },
            {
              icon: Palette,
              accent: "#7c3aed",
              accentBg: "#ede9fe",
              title: "Conversion Finders Agent",
              steps: [
                "Customer texts SHADE or SIZE (or clicks your product page deep-link)",
                "3-question diagnostic: skin tone / undertone / coverage for shade; height / weight / fit preference for size",
                "Groq AI generates a personalised recommendation in your brand voice with a direct product link",
                "Customer reply captured as a lead. Phone number tagged for follow-up campaigns.",
              ],
            },
          ].map((agent, i) => {
            const Icon = agent.icon;
            return (
              <motion.div key={agent.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="bg-white border border-[#1D211F]/8 rounded-2xl overflow-hidden">
                <div className="h-1" style={{ background: agent.accent }} />
                <div className="px-6 py-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: agent.accentBg }}>
                    <Icon className="w-5 h-5" style={{ color: agent.accent }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-[#1D211F] mb-3">{agent.title}</h3>
                    <div className="space-y-2">
                      {agent.steps.map((step, si) => (
                        <div key={si} className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-black" style={{ borderColor: agent.accent, color: agent.accent }}>{si + 1}</span>
                          <p className="text-xs text-[#1D211F]/65 leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Prerequisites */}
      <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "WhatsApp Business API", desc: "Connect your WABA through Meta Embedded Signup — takes under 2 minutes. All three agents use it.", required: true },
            { title: "Shopify Store", desc: "Required for RTO and Cart Recovery agents. The integration syncs orders, carts, and fulfillment status in real time.", required: false },
            { title: "Razorpay Account", desc: "Required for the RTO Agent's ₹99 prepay token flow. Payment links generated and tracked automatically.", required: false },
          ].map((p, i) => (
            <motion.div key={p.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="bg-white border border-[#1D211F]/8 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <CheckCircle2 className="w-5 h-5 text-[#2E4A3F]" />
                {p.required && <span className="text-[9px] font-mono uppercase tracking-widest font-bold text-[#D05E3C] border border-[#D05E3C]/30 px-2 py-0.5 rounded-full">Required for all</span>}
              </div>
              <h3 className="font-bold text-sm text-[#1D211F]">{p.title}</h3>
              <p className="text-xs text-[#1D211F]/60 leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-12 bg-[#1D211F] text-[#FAF7F2]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div className="space-y-3">
            <h2 className="font-serif text-3xl sm:text-4xl font-light">All 3 agents. <span className="italic text-[#D05E3C]">Included in every plan.</span></h2>
            <p className="text-[#FAF7F2]/55 text-sm font-medium">Connect WhatsApp + Shopify and your first agent is live in 5 minutes.</p>
          </div>
          <Link href="/signup" className="shrink-0 inline-flex items-center gap-2 bg-[#D05E3C] hover:bg-[#B84E2E] text-white px-8 py-4 rounded-md text-sm font-bold tracking-wide transition-colors">
            Activate agents free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
