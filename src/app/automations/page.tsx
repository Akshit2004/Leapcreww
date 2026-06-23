"use client";
import Header from "@/features/landing/components/Header";
import Footer from "@/features/landing/components/Footer";
import AutomationsShowcase from "@/features/landing/components/AutomationsShowcase";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";

export default function AutomationsPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1D211F] flex flex-col font-sans overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="pt-40 pb-16 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }} className="max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 border border-[#1D211F]/12 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D05E3C]" />
            <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/60 uppercase font-bold">[ Automation Catalog ]</span>
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.04]">
            20 playbooks.{" "}
            <span className="italic text-[#2E4A3F]">One click to install.</span>
          </h1>
          <p className="text-[#1D211F]/65 text-base sm:text-lg leading-relaxed max-w-2xl font-medium">
            Pre-built multi-step sequences for every industry — keyword triggers, welcome flows, tag-driven drips, and button replies. Pick exactly which steps to include before installing. Or let the AI Composer write a custom sequence from a plain-English description.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link href="/signup" className="inline-flex items-center gap-2 bg-[#1D211F] text-[#FAF7F2] px-6 py-3 rounded-md text-sm font-bold tracking-wide hover:bg-[#2E4A3F] transition-colors">
              Install your first automation free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-12 flex flex-wrap gap-px bg-[#1D211F]/8 border border-[#1D211F]/8 rounded-2xl overflow-hidden max-w-2xl">
          {[
            { n: "20",  label: "Pre-built playbooks" },
            { n: "8",   label: "Industries" },
            { n: "4",   label: "Trigger types" },
            { n: "∞",   label: "AI-generated sequences" },
          ].map((s) => (
            <div key={s.label} className="flex-1 min-w-[110px] bg-[#FAF7F2] px-5 py-4 flex flex-col gap-0.5">
              <span className="font-serif text-2xl font-light text-[#1D211F]">{s.n}</span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#1D211F]/45 font-bold">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Full showcase */}
      <AutomationsShowcase />

      {/* How it works */}
      <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10 space-y-2">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">How it works</span>
          <h2 className="font-serif text-3xl font-light text-[#1D211F]">Installed in three steps.</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1D211F]/8 border border-[#1D211F]/8 rounded-2xl overflow-hidden">
          {[
            { n: "01", icon: Zap, title: "Browse the catalog", desc: "Filter by category or trigger type. Every playbook shows its steps, delay schedule, and what it does before you commit." },
            { n: "02", icon: CheckCircle2, title: "Toggle steps on/off", desc: "Don't need the 3-day follow-up? Turn it off before installing. Only the steps you want get added to your account." },
            { n: "03", icon: ArrowRight, title: "Go live instantly", desc: "The automation is active the moment you install. Contacts who trigger it will start receiving messages immediately." },
          ].map((step, i) => (
            <motion.div key={step.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-[#FAF7F2] px-8 py-8 space-y-4">
              <span className="font-mono text-xs text-[#D05E3C] font-bold tracking-widest">{step.n}</span>
              <h3 className="font-serif text-2xl font-light text-[#1D211F]">{step.title}</h3>
              <p className="text-sm text-[#1D211F]/60 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-12 bg-[#1D211F] text-[#FAF7F2]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div className="space-y-3">
            <h2 className="font-serif text-3xl sm:text-4xl font-light">20 automations, <span className="italic text-[#D05E3C]">zero setup time.</span></h2>
            <p className="text-[#FAF7F2]/55 text-sm font-medium">Every plan includes the full catalog. Install as many as you need.</p>
          </div>
          <Link href="/signup" className="shrink-0 inline-flex items-center gap-2 bg-[#D05E3C] hover:bg-[#B84E2E] text-white px-8 py-4 rounded-md text-sm font-bold tracking-wide transition-colors">
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
