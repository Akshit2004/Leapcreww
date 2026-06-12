"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Bot,
  ArrowLeft,
  ArrowRight,
  Globe,
  Code2,
  MapPin,
  Mail,
} from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

const stats = [
  { label: "Platform Version", value: "v2.5" },
  { label: "Database", value: "PostgreSQL Native" },
  { label: "BSP Status", value: "Meta Verified" },
  { label: "HQ", value: "India-first" },
];

const values = [
  {
    icon: Code2,
    color: "#2E4A3F",
    num: "01",
    title: "Structural Clarity",
    desc: "Systems should be understandable, not magical black boxes. Every feature we ship has a clear data model, documented API, and predictable behaviour under load. We favour explicit contracts over implicit magic.",
  },
  {
    icon: MapPin,
    color: "#D05E3C",
    num: "02",
    title: "India-first",
    desc: "Built for Indian enterprises: INR billing, IST timezone defaults, and designed around real Indian WhatsApp usage patterns. We understand local compliance requirements, payment rails, and the pace of Indian startup growth.",
  },
  {
    icon: Globe,
    color: "#1D211F",
    num: "03",
    title: "Developer-grade",
    desc: "Every feature ships with a REST API, a webhook event, and an SDK binding. If you can&apos;t automate it, we haven&apos;t finished building it. LeapCrew AI is designed to live inside your infrastructure stack, not alongside it.",
  },
];

export default function AboutPage() {
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
            <MapPin className="w-3.5 h-3.5 text-[#D05E3C]" />
            <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/60 uppercase font-bold">[ ABOUT US ]</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.04]">
            Built by{" "}
            <span className="italic text-[#2E4A3F]">smritix AI LLP.</span>
          </h1>

          <p className="text-[#1D211F]/65 text-base sm:text-lg leading-relaxed max-w-2xl font-medium">
            We build AI-native business communication infrastructure for modern Indian enterprises. LeapCrew AI is our flagship product — a WhatsApp CRM, marketing automation, and chatbot platform built for teams that take their stack seriously.
          </p>
        </motion.div>
      </section>

      {/* Mission + Stats */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ MISSION ]</span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="space-y-5"
          >
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-[#1D211F] leading-snug">
              Making enterprise-grade WhatsApp automation{" "}
              <span className="italic text-[#2E4A3F]">accessible to every business.</span>
            </h2>
            <p className="text-[#1D211F]/65 text-sm leading-relaxed font-medium">
              Our mission is to make enterprise-grade WhatsApp automation accessible to every business — from bootstrapped startups to scaling enterprises — without the complexity or cost of legacy BSP platforms.
            </p>
            <p className="text-[#1D211F]/65 text-sm leading-relaxed font-medium">
              Legacy BSP platforms are slow, opaque, and expensive. We&apos;re replacing them with a modern, multi-tenant platform that exposes every feature as an API, ships observability by default, and is priced for Indian market realities.
            </p>
            <Link
              href="/platform"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#2E4A3F] hover:text-[#D05E3C] transition-colors group"
            >
              Explore the platform <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="grid grid-cols-2 gap-px bg-[#1D211F]/8 border border-[#1D211F]/8"
          >
            {stats.map((s, i) => (
              <div key={i} className="bg-[#FAF7F2] p-7 space-y-2">
                <div className="font-mono text-[9px] tracking-widest text-[#1D211F]/35 uppercase">{s.label}</div>
                <div className="font-serif text-2xl font-light text-[#1D211F]">{s.value}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* What We Build */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-4 space-y-3"
          >
            <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ OUR FLAGSHIP PRODUCT ]</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-[#1D211F]">
              What we{" "}
              <span className="italic text-[#2E4A3F]">build.</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-8 space-y-5 text-[#1D211F]/70 text-sm leading-relaxed font-medium"
          >
            <p>
              <strong className="text-[#1D211F]">LeapCrew AI</strong> is the flagship product of smritix AI LLP. It is a comprehensive WhatsApp CRM, marketing automation, and chatbot platform built natively on the Meta Cloud API.
            </p>
            <p>
              The platform provides a shared team inbox for collaborative customer support, a broadcast campaign engine for Meta-approved template messaging, a visual drag-and-drop chatbot builder, WhatsApp Flows for in-chat form collection, drip sequence automation, and a public REST API for full programmatic access.
            </p>
            <p>
              Unlike legacy WhatsApp BSP solutions that abstract away control, LeapCrew AI is transparent about its architecture: multi-tenant PostgreSQL, structured JSON logging, append-only event sourcing, and AES-256-GCM encryption for secrets at rest. Every workflow is accessible via API. Every event surfaces as a webhook.
            </p>
            <p>
              We are a Meta Verified BSP partner operating under Indian law, with data residency, INR billing, and support hours aligned to Indian Standard Time.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 space-y-3"
        >
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ HOW WE BUILD ]</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-[#1D211F]">
            Our{" "}
            <span className="italic text-[#2E4A3F]">values.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1D211F]/8 border border-[#1D211F]/8">
          {values.map((v, i) => {
            const Icon = v.icon;
            return (
              <motion.div
                key={v.num}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                className="bg-[#FAF7F2] hover:bg-white p-8 md:p-10 space-y-6 transition-colors duration-300 group"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-11 h-11 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: v.color + "15", border: `1px solid ${v.color}25` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: v.color }} />
                  </div>
                  <span className="font-serif text-5xl font-light text-[#1D211F]/8 select-none leading-none">{v.num}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-xl font-light text-[#1D211F] group-hover:text-[#2E4A3F] transition-colors">{v.title}</h3>
                  <p className="text-[#1D211F]/60 text-sm leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: v.desc }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Contact Card */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="py-20 px-6 md:px-12 bg-[#1D211F] text-[#FAF7F2]"
      >
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl space-y-6">
            <span className="font-mono text-[10px] tracking-widest text-[#FAF7F2]/35 uppercase font-bold">[ GET IN TOUCH ]</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-light">
              Say{" "}
              <span className="italic text-[#D05E3C]">hello.</span>
            </h2>

            <div className="border border-[#FAF7F2]/8 rounded-md p-6 space-y-5 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-[#FAF7F2]/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4.5 h-4.5 text-[#FAF7F2]" />
                </div>
                <div>
                  <div className="font-mono text-[9px] text-[#FAF7F2]/35 uppercase tracking-widest">Company</div>
                  <div className="text-sm font-semibold text-[#FAF7F2]">smritix AI LLP</div>
                </div>
              </div>

              <div className="border-t border-[#FAF7F2]/8 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <div className="font-mono text-[9px] text-[#FAF7F2]/35 uppercase tracking-widest">General enquiries</div>
                  <a href="mailto:hello@leapcrew.ai" className="text-sm font-semibold text-[#FAF7F2] hover:text-[#D05E3C] transition-colors flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    hello@leapcrew.ai
                  </a>
                </div>
                <div className="space-y-1">
                  <div className="font-mono text-[9px] text-[#FAF7F2]/35 uppercase tracking-widest">Registration</div>
                  <div className="text-sm font-semibold text-[#FAF7F2]">smritix AI LLP</div>
                  <div className="text-xs text-[#FAF7F2]/50 font-mono">Registered in India</div>
                </div>
              </div>
            </div>

            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-[#D05E3C] hover:bg-[#B84E2E] text-white px-6 py-3 rounded-md text-sm font-bold tracking-wide transition-colors"
            >
              Contact page <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
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
