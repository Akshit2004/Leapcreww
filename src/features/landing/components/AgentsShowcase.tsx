"use client";
import { motion } from "framer-motion";
import { CheckCircle2, Bot, ShoppingCart, Palette, ArrowRight } from "lucide-react";
import Link from "next/link";

const AGENTS = [
  {
    icon: Bot,
    accent: "#D05E3C",
    accentBg: "#FEF3EE",
    label: "RTO Reduction",
    title: "COD Risk Agent",
    desc: "Scores every COD order 0–10 on delivery risk. Holds suspicious shipments in Shopify, sends a ₹99 token prepay challenge, and converts high-risk buyers to prepaid — cutting RTO rates by up to 38%.",
    pills: ["COD Risk Score 0–10", "Shopify Hold", "₹99 Prepay", "YES/NO Verify", "Fraud Network", "NDR Rescue", "COD→Prepaid", "Address Confirm", "Success Fee"],
    prereqs: ["WhatsApp API", "Shopify", "Razorpay"],
    stat: { n: "38%", label: "RTO reduction" },
  },
  {
    icon: ShoppingCart,
    accent: "#0891b2",
    accentBg: "#e0f2fe",
    label: "Cart Recovery",
    title: "Abandoned Cart Agent",
    desc: "3-touch drip triggered 60 minutes after cart abandonment. AI objection analyser handles price & shipping queries. Auto-sends discount code on third touch. Recovers an average of 22% of abandoned carts.",
    pills: ["12-Variant Drip", "AI Objection Analyst", "Price Closer", "COD Confirmer", "Human Escalation", "Recovery Analytics"],
    prereqs: ["WhatsApp API", "Shopify"],
    stat: { n: "22%", label: "cart recovery rate" },
  },
  {
    icon: Palette,
    accent: "#7c3aed",
    accentBg: "#ede9fe",
    label: "Conversion Finders",
    title: "Shade & Size Finder",
    desc: "Text SHADE or SIZE to start a guided 3-tap diagnostic. AI recommends the right product variant in brand voice. Drop a WhatsApp deep-link on your product pages and let the bot handle the rest.",
    pills: ["3-tap Shade Diagnostic", "Anchor Size Finder", "Groq Brand Voice", "Phone Capture", "Product Deep-links", "Tone Personalisation"],
    prereqs: ["WhatsApp API"],
    stat: { n: "3-tap", label: "to the right shade" },
  },
];

export default function AgentsShowcase() {
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8 scroll-mt-20">
      {/* Heading */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start pb-14">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="lg:col-span-5 space-y-3">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ AI Agents ]</span>
          <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-[#1D211F]">
            Revenue pipelines that{" "}
            <span className="italic font-normal text-[#2E4A3F] shimmer-underline">run forever.</span>
          </h2>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay: 0.1 }} className="lg:col-span-7 pt-2 lg:pt-8">
          <p className="text-[#1D211F]/70 text-sm sm:text-base leading-relaxed font-medium">
            Three purpose-built autonomous agents for e-commerce — each pre-wired to WhatsApp, Shopify and Razorpay. Activate once, configure in minutes, and let them compound revenue around the clock.
          </p>
        </motion.div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {AGENTS.map((agent, i) => {
          const Icon = agent.icon;
          return (
            <motion.div key={agent.title} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white border border-[#1D211F]/8 rounded-2xl overflow-hidden flex flex-col group hover:border-[#1D211F]/20 hover:shadow-md transition-all">

              {/* Colored top strip */}
              <div className="h-1.5 shrink-0" style={{ background: agent.accent }} />

              {/* Card header */}
              <div className="px-6 pt-6 pb-4 border-b border-[#1D211F]/6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: agent.accentBg }}>
                    <Icon className="w-5 h-5" style={{ color: agent.accent }} />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-serif font-light" style={{ color: agent.accent }}>{agent.stat.n}</p>
                    <p className="text-[9px] font-mono uppercase tracking-widest text-[#1D211F]/40 font-bold">{agent.stat.label}</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono uppercase tracking-widest font-bold" style={{ color: agent.accent }}>{agent.label}</span>
                <h3 className="font-serif text-2xl font-light text-[#1D211F] mt-1 group-hover:text-[#2E4A3F] transition-colors">{agent.title}</h3>
                <p className="text-[#1D211F]/60 text-xs leading-relaxed mt-2">{agent.desc}</p>
              </div>

              {/* Feature pills */}
              <div className="px-6 py-4 flex-1">
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#1D211F]/35 font-bold mb-3">What it does</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.pills.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 text-[10px] font-mono text-[#1D211F]/60 border border-[#1D211F]/10 rounded-full px-2.5 py-1 font-bold uppercase tracking-wider hover:border-[#1D211F]/25 transition-colors">
                      <CheckCircle2 className="w-2.5 h-2.5 shrink-0" style={{ color: agent.accent }} />{p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Prerequisites */}
              <div className="px-6 pb-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#1D211F]/35 font-bold">Requires:</span>
                  {agent.prereqs.map((p) => (
                    <span key={p} className="text-[10px] font-bold text-[#1D211F]/50 bg-[#1D211F]/5 px-2 py-0.5 rounded">{p}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-[#1D211F]/10 rounded-2xl px-8 py-6 bg-white">
        <div>
          <p className="font-serif text-2xl font-light text-[#1D211F]">Activate your first agent in 5 minutes.</p>
          <p className="text-sm text-[#1D211F]/55 mt-1">Connect WhatsApp + Shopify and the agents run themselves.</p>
        </div>
        <Link href="/signup"
          className="shrink-0 inline-flex items-center gap-2 bg-[#1D211F] hover:bg-[#2E4A3F] text-white px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-colors">
          Get started free <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </section>
  );
}
