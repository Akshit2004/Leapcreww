"use client";

import Link from "next/link";
import { useState } from "react";
import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import {
  Bot,
  ArrowLeft,
  ArrowRight,
  Workflow,
  ShoppingBag,
  Zap,
  Code2,
  CreditCard,
  Check,
  ExternalLink,
  Puzzle,
  Send,
} from "lucide-react";

type Badge = "connected" | "coming-soon" | "available";

interface Integration {
  name: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  desc: string;
  badge: Badge;
  bullets?: string[];
}

interface Category {
  label: string;
  slug: string;
  integrations: Integration[];
}

const categories: Category[] = [
  {
    label: "E-Commerce",
    slug: "ecommerce",
    integrations: [
      {
        name: "Shopify",
        icon: ShoppingBag,
        iconBg: "#96BF48",
        iconColor: "#ffffff",
        desc: "Sync contacts, fire abandoned cart triggers, and receive order webhooks automatically.",
        badge: "connected",
        bullets: ["Contact sync", "Abandoned cart", "Order webhooks"],
      },
      {
        name: "WooCommerce",
        icon: ShoppingBag,
        iconBg: "#7F54B3",
        iconColor: "#ffffff",
        desc: "Send order confirmation flows and post-purchase follow-up sequences from WordPress stores.",
        badge: "coming-soon",
        bullets: ["Order confirmations", "Post-purchase flows"],
      },
    ],
  },
  {
    label: "Automation Platforms",
    slug: "automation",
    integrations: [
      {
        name: "Zapier",
        icon: Zap,
        iconBg: "#FF4A00",
        iconColor: "#ffffff",
        desc: "Connect to 7,000+ apps with Zapier triggers and actions via the polling API.",
        badge: "available",
        bullets: ["7,000+ app triggers", "No-code actions", "Polling API"],
      },
      {
        name: "Make.com",
        icon: Workflow,
        iconBg: "#6E3BDB",
        iconColor: "#ffffff",
        desc: "Use our 3-module blueprint to build advanced multi-step Make scenarios visually.",
        badge: "available",
        bullets: ["3-module blueprint", "Visual scenario builder"],
      },
      {
        name: "n8n",
        icon: Workflow,
        iconBg: "#EA4B71",
        iconColor: "#ffffff",
        desc: "Community node with 2 resources and 4 operations — self-hostable automation.",
        badge: "available",
        bullets: ["2 resources", "4 operations", "Self-hostable"],
      },
    ],
  },
  {
    label: "Developer Tools",
    slug: "developer",
    integrations: [
      {
        name: "REST API",
        icon: Code2,
        iconBg: "#1D211F",
        iconColor: "#FAF7F2",
        desc: "Full programmatic access to every platform feature — messages, contacts, templates, events.",
        badge: "connected",
        bullets: ["All endpoints", "Scoped API keys", "Idempotency support"],
      },
      {
        name: "MCP Server",
        icon: Bot,
        iconBg: "#D05E3C",
        iconColor: "#ffffff",
        desc: "Integrate LeapCrew AI with AI agents like Claude and GPT-4 via the Model Context Protocol.",
        badge: "coming-soon",
        bullets: ["Claude / GPT-4 agents", "Tool definitions"],
      },
      {
        name: "Webhooks",
        icon: Send,
        iconBg: "#2E4A3F",
        iconColor: "#ffffff",
        desc: "Receive real-time signed event POSTs — message.received, order.placed, and more.",
        badge: "connected",
        bullets: ["HMAC-SHA256 signed", "Retry with backoff", "4 event types"],
      },
    ],
  },
  {
    label: "Payments",
    slug: "payments",
    integrations: [
      {
        name: "Razorpay",
        icon: CreditCard,
        iconBg: "#0EA5E9",
        iconColor: "#ffffff",
        desc: "Collect booking payments and send checkout links via WhatsApp with native Razorpay integration.",
        badge: "coming-soon",
        bullets: ["Checkout links", "Booking payments", "INR support"],
      },
    ],
  },
  {
    label: "AI / LLM",
    slug: "ai",
    integrations: [
      {
        name: "Groq (Llama 3.1)",
        icon: Bot,
        iconBg: "#F55036",
        iconColor: "#ffffff",
        desc: "Powers the AI autoresponder, recipe composer, and template compliance auditor at inference speed.",
        badge: "connected",
        bullets: ["AI autoresponder", "Recipe composer", "Template auditor"],
      },
    ],
  },
];

const badgeConfig: Record<Badge, { label: string; cls: string }> = {
  "connected":    { label: "Connected",    cls: "bg-[#2E4A3F]/10 text-[#2E4A3F] border-[#2E4A3F]/20" },
  "available":    { label: "Available",    cls: "bg-[#D05E3C]/10 text-[#D05E3C] border-[#D05E3C]/20" },
  "coming-soon":  { label: "Coming Soon",  cls: "bg-[#1D211F]/8 text-[#1D211F]/45 border-[#1D211F]/12" },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: "easeOut" },
  }),
};

export default function IntegrationsPage() {
  const [requestValue, setRequestValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (requestValue.trim()) {
      setSubmitted(true);
      setRequestValue("");
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1D211F] flex flex-col font-sans overflow-x-hidden selection:bg-[#2E4A3F] selection:text-[#FAF7F2]">

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#1D211F]/8">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#1D211F] flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#FAF7F2]" />
            </div>
            <span className="font-sans font-extrabold text-xl tracking-tight text-[#1D211F]">LeapCrew AI</span>
          </Link>
          <Link
            href="/"
            className="border border-[#1D211F]/15 hover:border-[#1D211F]/60 text-[#1D211F]/70 hover:text-[#1D211F] text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-md flex items-center gap-2 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /><span>Home</span>
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-40 pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-3xl space-y-7"
        >
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 border border-[#1D211F]/12 rounded-full select-none">
            <Puzzle className="w-3.5 h-3.5 text-[#D05E3C]" />
            <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/60 uppercase font-bold">[ INTEGRATIONS HUB ]</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.04]">
            Connect your{" "}
            <span className="italic text-[#2E4A3F]">entire stack.</span>
          </h1>

          <p className="text-[#1D211F]/65 text-base sm:text-lg leading-relaxed font-medium">
            Shopify, Zapier, Make, n8n, Razorpay, Groq — and a full REST API for anything else.
            LeapCrew AI slots into your existing workflow without replacing it.
          </p>

          {/* Summary chips */}
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { label: "Connected", count: 4 },
              { label: "Available", count: 3 },
              { label: "Coming Soon", count: 3 },
            ].map((s) => (
              <span key={s.label} className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#1D211F]/12 rounded-full text-[10px] font-mono tracking-wider text-[#1D211F]/60 uppercase font-bold">
                <span className="font-sans text-sm font-extrabold text-[#1D211F]">{s.count}</span>
                {s.label}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Integration Categories ── */}
      <div className="py-24 px-6 md:px-12 max-w-7xl mx-auto w-full space-y-20">
        {categories.map((cat, catIdx) => (
          <motion.div
            key={cat.slug}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: catIdx * 0.05, duration: 0.5 }}
            className="space-y-6"
          >
            {/* Category header */}
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">
                [ {cat.label.toUpperCase()} ]
              </span>
              <div className="flex-1 h-px bg-[#1D211F]/8" />
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.integrations.map((integ, i) => {
                const Icon = integ.icon;
                const badge = badgeConfig[integ.badge];
                return (
                  <motion.div
                    key={integ.name}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-30px" }}
                    variants={fadeUp}
                    className="group border border-[#1D211F]/10 hover:border-[#1D211F]/30 bg-[#FAF7F2] hover:bg-white rounded-md p-6 space-y-4 transition-all duration-300"
                  >
                    {/* Logo + badge row */}
                    <div className="flex items-center justify-between">
                      <div
                        className="w-11 h-11 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: integ.iconBg }}
                      >
                        <Icon className="w-5 h-5" style={{ color: integ.iconColor }} />
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full font-mono text-[9px] tracking-widest uppercase font-bold ${badge.cls}`}>
                        {integ.badge === "connected" && <Check className="w-2.5 h-2.5" />}
                        {badge.label}
                      </span>
                    </div>

                    {/* Name + desc */}
                    <div className="space-y-1.5">
                      <h3 className="font-serif text-lg font-light text-[#1D211F] group-hover:text-[#2E4A3F] transition-colors">{integ.name}</h3>
                      <p className="text-xs text-[#1D211F]/60 leading-relaxed font-medium">{integ.desc}</p>
                    </div>

                    {/* Feature bullets */}
                    {integ.bullets && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {integ.bullets.map((b) => (
                          <span
                            key={b}
                            className="inline-flex items-center gap-1 px-2 py-0.5 border border-[#1D211F]/8 rounded-full text-[9px] font-mono tracking-wider text-[#1D211F]/45 uppercase"
                          >
                            <span className="w-1 h-1 rounded-full bg-[#1D211F]/25" />
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Quick links ── */}
      <section className="pb-16 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <Link
            href="/platform/api"
            className="group border border-[#1D211F]/10 hover:border-[#1D211F]/40 rounded-md p-5 flex items-center justify-between transition-all"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-[#1D211F] group-hover:text-[#2E4A3F] transition-colors">REST API Reference</p>
              <p className="text-[10px] font-mono text-[#1D211F]/45 tracking-wider">Full programmatic access to every feature</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#1D211F]/30 group-hover:text-[#D05E3C] group-hover:translate-x-0.5 transition-all" />
          </Link>
          <Link
            href="/platform/webhooks"
            className="group border border-[#1D211F]/10 hover:border-[#1D211F]/40 rounded-md p-5 flex items-center justify-between transition-all"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-[#1D211F] group-hover:text-[#2E4A3F] transition-colors">Webhooks Documentation</p>
              <p className="text-[10px] font-mono text-[#1D211F]/45 tracking-wider">Real-time event delivery, retry policy, HMAC</p>
            </div>
            <ExternalLink className="w-4 h-4 text-[#1D211F]/30 group-hover:text-[#D05E3C] transition-all" />
          </Link>
        </motion.div>
      </section>

      {/* ── Request Integration CTA ── */}
      <section className="py-20 px-6 md:px-12 bg-[#1D211F] text-[#FAF7F2]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <span className="font-mono text-[10px] tracking-widest text-[#FAF7F2]/35 uppercase font-bold">[ REQUEST AN INTEGRATION ]</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light">
                Don&apos;t see your tool?{" "}
                <span className="italic text-[#D05E3C]">Tell us.</span>
              </h2>
              <p className="text-[#FAF7F2]/50 text-sm font-medium max-w-md leading-relaxed">
                Submit the name of the platform you want to connect and we&apos;ll add it to our roadmap.
                Most requested integrations ship within 4 weeks.
              </p>
            </div>

            <div className="space-y-4">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 bg-[#2E4A3F]/20 border border-[#2E4A3F]/30 rounded-md px-5 py-4"
                >
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">Request received.</p>
                    <p className="text-xs text-[#FAF7F2]/50 font-medium">We&apos;ll reach out when your integration ships.</p>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleRequestSubmit} className="flex gap-3">
                  <input
                    type="text"
                    value={requestValue}
                    onChange={(e) => setRequestValue(e.target.value)}
                    placeholder="Integration name (e.g. HubSpot, Notion…)"
                    className="flex-1 bg-[#FAF7F2]/8 border border-[#FAF7F2]/12 hover:border-[#FAF7F2]/25 focus:border-[#FAF7F2]/40 text-[#FAF7F2] placeholder-[#FAF7F2]/25 rounded-md px-4 py-3 text-sm font-medium outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    className="shrink-0 bg-[#D05E3C] hover:bg-[#B84E2E] text-white px-5 py-3 rounded-md text-sm font-bold tracking-wide transition-colors flex items-center gap-2"
                  >
                    Request <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
              <p className="text-[10px] font-mono text-[#FAF7F2]/25 tracking-wide">
                No spam. Just a ping when your integration launches.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#171A19] text-[#FAF7F2]/60 py-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono">
          <span>© 2026 smritix AI LLP. LeapCrew AI is a product of smritix AI LLP, India.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/legal/cookies" className="hover:text-white transition-colors">Cookies</Link>
            <Link href="/legal/dpa" className="hover:text-white transition-colors">DPA</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
