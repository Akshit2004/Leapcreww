"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Bot,
  ArrowLeft,
  ArrowRight,
  Inbox,
  Megaphone,
  GitBranch,
  FormInput,
  Layers,
  Wand2,
  Check,
} from "lucide-react";

const features = [
  {
    num: "01",
    id: "inbox",
    icon: Inbox,
    color: "#2E4A3F",
    title: "Shared Team Inbox",
    desc: "A unified conversation queue for your entire support team. Assign chats to agents, set up working hours, and keep every customer interaction in one place.",
    chips: ["Agent Takeover", "Canned Replies", "Internal Notes"],
  },
  {
    num: "02",
    id: "campaigns",
    icon: Megaphone,
    color: "#D05E3C",
    title: "Campaign Broadcasts",
    desc: "Send Meta-approved template messages to thousands of contacts at once. Schedule in advance, track delivery funnel analytics, and segment by tags.",
    chips: ["Bulk Scheduling", "Funnel Analytics", "Segment Targeting"],
  },
  {
    num: "03",
    id: "chatbot",
    icon: Bot,
    color: "#1D211F",
    title: "Visual Chatbot Builder",
    desc: "A Figma-like drag-and-drop canvas to design conversation flows with trigger, message, question and delay nodes. Toggle to pure AI autoresponder mode in one click.",
    chips: ["Drag-and-Drop Canvas", "AI Autoresponder", "4 Node Types"],
  },
  {
    num: "04",
    id: "flows",
    icon: FormInput,
    color: "#5C6E5B",
    title: "WhatsApp Flows",
    desc: "Embed interactive in-chat forms using Meta Flows. Capture lead data, run surveys, or collect order details — all without leaving WhatsApp.",
    chips: ["Lead Capture", "Data Collection", "Meta Flows v3"],
  },
  {
    num: "05",
    id: "sequences",
    icon: Layers,
    color: "#8B5E3C",
    title: "Drip Sequences",
    desc: "Trigger-based multi-step messaging journeys. Recover abandoned carts, onboard new users, and nurture prospects through automated touch-point sequences.",
    chips: ["Trigger-Based", "Cart Recovery", "Multi-Step Journeys"],
  },
  {
    num: "06",
    id: "recipes",
    icon: Wand2,
    color: "#D05E3C",
    title: "Recipe Marketplace",
    desc: "Launch pre-built automation playbooks in one click. Or describe what you want in plain English and the AI Composer will generate the flow for you.",
    chips: ["One-Click Deploy", "AI Composer", "6 Playbooks"],
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

export default function PlatformPage() {
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
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-4xl space-y-7"
        >
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 border border-[#1D211F]/12 rounded-full select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D05E3C]" />
            <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/60 uppercase font-bold">[ 6 CORE CAPABILITIES ]</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.04]">
            The complete WhatsApp{" "}
            <span className="italic text-[#2E4A3F]">Business Platform.</span>
          </h1>

          <p className="text-[#1D211F]/65 text-base sm:text-lg leading-relaxed max-w-2xl font-medium">
            Multi-tenant CRM, broadcast campaigns, a visual chatbot builder, WhatsApp Flows, drip sequences,
            and a recipe marketplace — all wired to the Meta Cloud API and available via a full REST API.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-[#1D211F] text-[#FAF7F2] px-6 py-3 rounded-md text-sm font-bold tracking-wide hover:bg-[#2E4A3F] transition-colors"
            >
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/platform/api"
              className="inline-flex items-center gap-2 border border-[#1D211F]/20 text-[#1D211F]/70 hover:text-[#1D211F] hover:border-[#1D211F]/50 px-6 py-3 rounded-md text-sm font-bold tracking-wide transition-all"
            >
              API Reference <GitBranch className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Feature Grid ── */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-14 space-y-3"
        >
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ PLATFORM MODULES ]</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-[#1D211F]">
            Everything you need,{" "}
            <span className="italic text-[#2E4A3F]">nothing you don&apos;t.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#1D211F]/8 border border-[#1D211F]/8">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.id}
                id={f.id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                className="bg-[#FAF7F2] p-8 md:p-10 space-y-6 group hover:bg-white transition-colors duration-300 scroll-mt-28"
              >
                {/* Card header */}
                <div className="flex items-start justify-between">
                  <div
                    className="w-12 h-12 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: f.color + "15", border: `1px solid ${f.color}25` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <span className="font-serif text-5xl font-light text-[#1D211F]/8 group-hover:text-[#1D211F]/12 transition-colors select-none leading-none">
                    {f.num}
                  </span>
                </div>

                {/* Title + desc */}
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl font-light text-[#1D211F] group-hover:text-[#2E4A3F] transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-[#1D211F]/65 text-sm leading-relaxed font-medium">
                    {f.desc}
                  </p>
                </div>

                {/* Chips */}
                <div className="flex flex-wrap gap-2">
                  {f.chips.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1.5 px-3 py-1 border border-[#1D211F]/10 rounded-full text-[10px] font-mono tracking-wider text-[#1D211F]/55 uppercase font-bold"
                    >
                      <Check className="w-2.5 h-2.5" style={{ color: f.color }} />
                      {chip}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Additional Links ── */}
      <section className="pb-16 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {[
            { href: "/platform/api", label: "REST API Reference", sub: "Full programmatic access" },
            { href: "/platform/webhooks", label: "Webhooks", sub: "Real-time event delivery" },
            { href: "/platform/integrations", label: "Integrations Hub", sub: "Shopify, Zapier, Make & more" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group border border-[#1D211F]/10 hover:border-[#1D211F]/40 rounded-md p-5 flex items-center justify-between transition-all"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-[#1D211F] group-hover:text-[#2E4A3F] transition-colors">{link.label}</p>
                <p className="text-[10px] font-mono text-[#1D211F]/45 tracking-wider">{link.sub}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#1D211F]/30 group-hover:text-[#D05E3C] group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </motion.div>
      </section>

      {/* ── CTA Strip ── */}
      <section className="py-20 px-6 md:px-12 bg-[#1D211F] text-[#FAF7F2]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8"
        >
          <div className="space-y-3">
            <span className="font-mono text-[10px] tracking-widest text-[#FAF7F2]/35 uppercase font-bold">[ GET STARTED ]</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-light">
              Start building in{" "}
              <span className="italic text-[#D05E3C]">5 minutes.</span>
            </h2>
            <p className="text-[#FAF7F2]/55 text-sm font-medium max-w-md">
              Free trial. No credit card required. Full platform access from day one.
            </p>
          </div>
          <Link
            href="/signup"
            className="shrink-0 inline-flex items-center gap-2 bg-[#D05E3C] hover:bg-[#B84E2E] text-white px-8 py-4 rounded-md text-sm font-bold tracking-wide transition-colors"
          >
            Create free workspace <ArrowRight className="w-4 h-4" />
          </Link>
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
