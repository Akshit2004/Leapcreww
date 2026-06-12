"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Bot,
  ArrowLeft,
  Sparkles,
  Wrench,
  Bug,
  Cpu,
  TrendingUp,
} from "lucide-react";

type ChipType = "FEATURE" | "IMPROVEMENT" | "ARCHITECTURE" | "BUGFIX";

const chipStyles: Record<ChipType, { bg: string; text: string; icon: React.ElementType }> = {
  FEATURE: { bg: "bg-[#D05E3C]/12 border-[#D05E3C]/25", text: "text-[#D05E3C]", icon: Sparkles },
  IMPROVEMENT: { bg: "bg-amber-500/10 border-amber-500/25", text: "text-amber-600", icon: TrendingUp },
  ARCHITECTURE: { bg: "bg-[#2E4A3F]/12 border-[#2E4A3F]/25", text: "text-[#2E4A3F]", icon: Cpu },
  BUGFIX: { bg: "bg-stone-500/12 border-stone-500/25", text: "text-stone-600", icon: Bug },
};

const entries: {
  version: string;
  date: string;
  chips: ChipType[];
  title: string;
  bullets: string[];
}[] = [
  {
    version: "v2.5.0",
    date: "June 11, 2026",
    chips: ["FEATURE", "ARCHITECTURE"],
    title: "Event ledger, identity keys, and encryption at rest",
    bullets: [
      "Append-only Event table for reliable event polling, replacing fragile multi-table synthesis",
      "Contact identity now keyed on phone number; email field made optional",
      "Message timestamps migrated from display strings to proper DateTime columns",
      "AES-256-GCM encryption utilities for secrets at rest (Meta access tokens, webhook secrets)",
      "GET /api/health endpoint for uptime monitoring and external health checks",
      "Structured JSON logger replacing ad-hoc console.error calls throughout the codebase",
    ],
  },
  {
    version: "v2.4.0",
    date: "June 1, 2026",
    chips: ["FEATURE"],
    title: "Public REST API v1, MCP Server, and the Integrations Platform",
    bullets: [
      "Public REST API v1 covering messages, contacts, templates, and events",
      "Sandbox API keys with wf_test_ prefix for safe pre-production development",
      "Idempotency-Key support on message send endpoints to prevent duplicate deliveries",
      "MCP Server for AI agent integration — expose your LeapCrew workspace to LLM agents",
      "n8n community node, Zapier app, and Make.com blueprint published",
      "Interactive API docs powered by Scalar available at /api-docs",
    ],
  },
  {
    version: "v2.3.0",
    date: "May 18, 2026",
    chips: ["FEATURE"],
    title: "Working hours, multi-number support, and the Recipe Marketplace",
    bullets: [
      "Working hours per-organisation with timezone-aware away messages for off-hours contacts",
      "Multi-number support: register and manage multiple WhatsApp phone numbers per workspace",
      "Recipe Marketplace: 6 one-click automation templates (abandoned cart, welcome series, re-engagement, support escalation, appointment confirmation, feedback survey)",
      "AI Recipe Composer: generate custom drip sequences from a plain-English description",
    ],
  },
  {
    version: "v2.2.0",
    date: "May 3, 2026",
    chips: ["FEATURE"],
    title: "Canned replies, internal notes, and outbound webhooks",
    bullets: [
      "Canned Replies: pre-written message shortcuts for agents using /shortcut syntax",
      "Internal Notes: agent-only notes visible on conversations, never sent to the customer",
      "Outbound Webhooks with HMAC-SHA256 signing and automatic exponential backoff retry (up to 72h)",
      "WebhookSubscription management API for programmatic event subscriptions",
    ],
  },
  {
    version: "v2.1.0",
    date: "April 14, 2026",
    chips: ["FEATURE", "IMPROVEMENT"],
    title: "Drip sequences, smart segments, and the developer platform",
    bullets: [
      "Drip Sequences: trigger-based multi-step automation journeys with configurable delays",
      "Smart Segments: rules-based contact segmentation using tag, status, and activity filters",
      "Conversion attribution: last-touch attribution trail linking campaigns to orders",
      "Embeddable WhatsApp chat-button widget with wa.me deep link for website placement",
      "Developer Platform landing section at /platform with API, Webhooks, and Integrations sub-pages",
    ],
  },
  {
    version: "v2.0.0",
    date: "March 28, 2026",
    chips: ["FEATURE"],
    title: "WhatsApp Flows, Click-to-WhatsApp Ads, and the Appointment Agent",
    bullets: [
      "WhatsApp Flows (Meta Flows v3) with form builder and encrypted response handling",
      "Click-to-WhatsApp Ads management with AdCampaign and Ad models linked to campaigns",
      "Native WhatsApp catalog orders with Razorpay checkout integration",
      "Appointment booking agent with presets for Healthcare, Hospitality, Education, and Corporate",
      "White-label / Partner reseller model with branded workspace support",
    ],
  },
  {
    version: "v1.5.0",
    date: "February 20, 2026",
    chips: ["FEATURE"],
    title: "Marketplace bot, Shopify integration, and multi-agent routing",
    bullets: [
      "Marketplace Bot with full product catalog management and inventory sync",
      "Shopify embedded OAuth and abandoned cart recovery automation",
      "Multi-agent routing rules with priority-based assignment logic",
      "Conversion billing ledger with per-message cost tracking and invoice export",
    ],
  },
  {
    version: "v1.0.0",
    date: "January 15, 2026",
    chips: ["FEATURE"],
    title: "Initial release — LeapCrew AI is live",
    bullets: [
      "Shared Team Inbox for collaborative WhatsApp support management",
      "Campaign Broadcasts: send Meta-approved template messages to your full contact list",
      "Visual Chatbot Builder with drag-and-drop canvas (Trigger, Message, Question, Delay nodes)",
      "Meta Embedded Signup for frictionless WhatsApp Business API connection",
      "Template management with AI compliance auditor (Groq-powered)",
      "CRM contacts with tag-based segmentation and bulk operations",
      "PostgreSQL multi-tenant architecture with row-level isolation",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1D211F] flex flex-col font-sans overflow-x-hidden selection:bg-[#2E4A3F] selection:text-[#FAF7F2]">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#1D211F]/8">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#1D211F] flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#FAF7F2]" />
            </div>
            <span className="font-sans font-extrabold text-xl tracking-tight text-[#1D211F]">LeapCrew AI</span>
          </Link>
          <Link href="/" className="border border-[#1D211F]/15 hover:border-[#1D211F]/60 text-[#1D211F]/70 hover:text-[#1D211F] text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-md flex items-center gap-2 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" /><span>Home</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-40 pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-4xl space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#1D211F]/12 rounded-full select-none">
            <Wrench className="w-3.5 h-3.5 text-[#D05E3C]" />
            <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/60 uppercase font-bold">[ PRODUCT CHANGELOG ]</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.04]">
            What&apos;s new.
          </h1>

          <p className="text-[#1D211F]/65 text-base sm:text-lg leading-relaxed max-w-2xl font-medium">
            Every update, shipped with intention. We move fast without breaking things — every release is documented, reasoned, and backwards-compatible where possible.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {(["FEATURE", "ARCHITECTURE", "IMPROVEMENT", "BUGFIX"] as ChipType[]).map((chip) => {
              const { bg, text, icon: Icon } = chipStyles[chip];
              return (
                <span key={chip} className={`inline-flex items-center gap-1.5 border px-2.5 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-widest ${bg} ${text}`}>
                  <Icon className="w-3 h-3" />
                  {chip}
                </span>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full flex-1">
        <div className="max-w-3xl ml-0 space-y-0">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.version}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.04, duration: 0.5, ease: "easeOut" }}
              className="relative pl-8 pb-14 border-l border-[#1D211F]/10 last:border-l-transparent"
            >
              {/* Timeline dot */}
              <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#FAF7F2] border-2 border-[#1D211F]/30" />

              <div className="space-y-4">
                {/* Version + date row */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm font-bold text-[#1D211F] tracking-tight">{entry.version}</span>
                  <span className="font-mono text-[10px] text-[#1D211F]/40 tracking-widest uppercase">{entry.date}</span>
                </div>

                {/* Chips */}
                <div className="flex flex-wrap gap-2">
                  {entry.chips.map((chip) => {
                    const { bg, text, icon: Icon } = chipStyles[chip];
                    return (
                      <span key={chip} className={`inline-flex items-center gap-1.5 border px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest ${bg} ${text}`}>
                        <Icon className="w-2.5 h-2.5" />
                        {chip}
                      </span>
                    );
                  })}
                </div>

                {/* Title */}
                <h2 className="font-serif text-2xl sm:text-3xl font-light text-[#1D211F]">{entry.title}</h2>

                {/* Bullets */}
                <ul className="space-y-2">
                  {entry.bullets.map((b, bi) => (
                    <li key={bi} className="flex items-start gap-3 text-sm text-[#1D211F]/70 font-medium leading-relaxed">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#D05E3C]/50 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#171A19] text-[#FAF7F2]/60 py-8 px-6 md:px-12 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono">
          <span>© 2026 smritix AI LLP. LeapCrew AI is a product of smritix AI LLP, India.</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/legal/cookies" className="hover:text-white transition-colors">Cookies</Link>
            <Link href="/legal/dpa" className="hover:text-white transition-colors">DPA</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
