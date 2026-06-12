"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Bot,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Terminal,
  Zap,
  Webhook,
  Layers,
  GitBranch,
  MessageSquare,
  Users,
  Settings,
  Code2,
  Server,
} from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: "easeOut" },
  }),
};

const quickStart = [
  {
    icon: MessageSquare,
    color: "#2E4A3F",
    label: "01",
    title: "Connect WhatsApp",
    desc: "Use Meta Embedded Signup to link your WhatsApp Business number in under 5 minutes. No manual API setup required.",
    tag: "5 MIN SETUP",
    href: "/docs/getting-started/connect-whatsapp",
  },
  {
    icon: Terminal,
    color: "#D05E3C",
    label: "02",
    title: "Send your first message",
    desc: "Generate an API key, make a curl request, and send your first WhatsApp message programmatically.",
    tag: "REST API",
    href: "/docs/api/send-message",
  },
  {
    icon: Bot,
    color: "#1D211F",
    label: "03",
    title: "Build a chatbot flow",
    desc: "Open the visual builder, drop Trigger → Message → Question nodes, connect them, and go live.",
    tag: "VISUAL BUILDER",
    href: "/docs/chatbot/visual-builder",
  },
];

const categories = [
  {
    icon: Settings,
    color: "#2E4A3F",
    title: "Getting Started",
    desc: "Workspace setup, WhatsApp Business connection via Embedded Signup, and team member invites.",
    links: ["Workspace setup", "WhatsApp connection", "Team invites"],
    href: "/docs/getting-started",
  },
  {
    icon: Zap,
    color: "#D05E3C",
    title: "Campaigns",
    desc: "Template-based broadcast messaging, intelligent scheduling, and delivery funnel analytics.",
    links: ["Template broadcasts", "Scheduling", "Delivery analytics"],
    href: "/docs/campaigns",
  },
  {
    icon: Bot,
    color: "#1D211F",
    title: "Chatbot Builder",
    desc: "Node types explained, routing logic patterns, and switching to AI autoresponder mode.",
    links: ["Node types", "Routing logic", "AI autoresponder"],
    href: "/docs/chatbot",
  },
  {
    icon: Layers,
    color: "#8B5E3C",
    title: "Drip Sequences",
    desc: "Define triggers, configure multi-step journeys, and set enrollment conditions for automated flows.",
    links: ["Triggers", "Steps", "Enrollment conditions"],
    href: "/docs/drip-sequences",
  },
  {
    icon: Code2,
    color: "#2E4A3F",
    title: "REST API",
    desc: "Authentication with scoped API keys, full endpoint reference, and rate limit guidance.",
    links: ["Authentication", "Endpoints", "Rate limits"],
    href: "/platform/api",
    external: false,
  },
  {
    icon: Webhook,
    color: "#D05E3C",
    title: "Webhooks",
    desc: "Set up inbound webhook URLs, subscribe to events, and verify HMAC-SHA256 signatures.",
    links: ["Setup", "Events", "Signature verification"],
    href: "/platform/webhooks",
  },
  {
    icon: GitBranch,
    color: "#5C6E5B",
    title: "Integrations",
    desc: "Native connectors for Shopify, plus Zapier app, Make.com blueprint, and n8n community node.",
    links: ["Shopify", "Zapier", "Make & n8n"],
    href: "/platform/integrations",
  },
  {
    icon: Server,
    color: "#1D211F",
    title: "MCP Server",
    desc: "Integrate LeapCrew AI into your AI agents. The MCP server exposes contacts, messages, and campaign actions.",
    links: ["MCP setup", "Available tools", "Agent patterns"],
    href: "/docs/mcp",
  },
];

export default function DocsPage() {
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
            <BookOpen className="w-3.5 h-3.5 text-[#D05E3C]" />
            <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/60 uppercase font-bold">[ DEVELOPER DOCS ]</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.04]">
            Documentation.
          </h1>

          <p className="text-[#1D211F]/65 text-base sm:text-lg leading-relaxed max-w-2xl font-medium">
            Everything you need to integrate and extend LeapCrew AI — from sending your first message to building complex multi-step automation flows.
          </p>

          <div className="flex items-center gap-4 pt-2 font-mono text-[10px] tracking-widest text-[#1D211F]/35 uppercase select-none">
            <span>[ API VERSION: v1 ]</span>
            <span>[ LAST UPDATED: JUNE 2026 ]</span>
          </div>
        </motion.div>
      </section>

      {/* Quick Start Cards */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 space-y-3"
        >
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ QUICK START ]</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-[#1D211F]">
            Up and running in{" "}
            <span className="italic text-[#2E4A3F]">minutes.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1D211F]/8 border border-[#1D211F]/8">
          {quickStart.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
              >
                <Link
                  href={item.href}
                  className="bg-[#FAF7F2] hover:bg-white p-8 md:p-10 flex flex-col gap-6 group transition-colors duration-300 h-full block"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="w-11 h-11 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: item.color + "15", border: `1px solid ${item.color}25` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <span className="font-mono text-[9px] tracking-widest text-[#1D211F]/30 uppercase font-bold border border-[#1D211F]/10 px-2 py-1 rounded">{item.tag}</span>
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="font-serif text-xl font-light text-[#1D211F] group-hover:text-[#2E4A3F] transition-colors">{item.title}</h3>
                    <p className="text-[#1D211F]/60 text-sm leading-relaxed font-medium">{item.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#D05E3C] group-hover:gap-2.5 transition-all">
                    <span>Read guide</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Docs Category Grid */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 space-y-3"
        >
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ ALL TOPICS ]</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-[#1D211F]">
            Browse by{" "}
            <span className="italic text-[#2E4A3F]">category.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
              >
                <Link
                  href={cat.href}
                  className="group border border-[#1D211F]/10 hover:border-[#1D211F]/30 rounded-md p-6 flex gap-5 transition-all duration-300 hover:bg-white block"
                >
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: cat.color + "12", border: `1px solid ${cat.color}20` }}
                  >
                    <Icon className="w-4.5 h-4.5" style={{ color: cat.color }} />
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-serif text-lg font-light text-[#1D211F] group-hover:text-[#2E4A3F] transition-colors">{cat.title}</h3>
                      <ArrowRight className="w-4 h-4 text-[#1D211F]/20 group-hover:text-[#D05E3C] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                    <p className="text-[#1D211F]/60 text-sm leading-relaxed font-medium">{cat.desc}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cat.links.map((l) => (
                        <span key={l} className="font-mono text-[9px] tracking-wider text-[#1D211F]/40 uppercase border border-[#1D211F]/8 px-2 py-0.5 rounded">{l}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* API Reference CTA */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="py-20 px-6 md:px-12 bg-[#1D211F] text-[#FAF7F2]"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div className="space-y-3">
            <span className="font-mono text-[10px] tracking-widest text-[#FAF7F2]/35 uppercase font-bold">[ INTERACTIVE SPEC ]</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-light">
              Prefer the interactive{" "}
              <span className="italic text-[#D05E3C]">API spec?</span>
            </h2>
            <p className="text-[#FAF7F2]/55 text-sm font-medium max-w-md">
              Try endpoints live, inspect request/response shapes, and copy code samples directly from the browser using our Scalar-powered reference.
            </p>
          </div>
          <Link
            href="/api-docs"
            className="shrink-0 inline-flex items-center gap-2 bg-[#D05E3C] hover:bg-[#B84E2E] text-white px-8 py-4 rounded-md text-sm font-bold tracking-wide transition-colors"
          >
            Open API Reference <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.section>

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
