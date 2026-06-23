"use client";
import Header from "@/features/landing/components/Header";
import Footer from "@/features/landing/components/Footer";
import TemplatesShowcase from "@/features/landing/components/TemplatesShowcase";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1D211F] flex flex-col font-sans overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="pt-40 pb-16 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }} className="max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 border border-[#1D211F]/12 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
            <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/60 uppercase font-bold">[ Template Library ]</span>
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.04]">
            150+ WhatsApp templates,{" "}
            <span className="italic text-[#2E4A3F]">Meta-approved.</span>
          </h1>
          <p className="text-[#1D211F]/65 text-base sm:text-lg leading-relaxed max-w-2xl font-medium">
            Every template pre-mapped to Meta&apos;s compliance checklist. Our AI Auditor flags issues before submission — keeping approval rates near 100% across e-commerce, healthcare, finance, travel, HR, and more.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {["E-commerce", "Healthcare", "Finance", "Travel", "HR", "Education", "Restaurant", "Real Estate", "Automobile", "Events"].map((tag) => (
              <span key={tag} className="text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 border border-[#1D211F]/12 rounded-full text-[#1D211F]/55 font-bold">{tag}</span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link href="/signup" className="inline-flex items-center gap-2 bg-[#1D211F] text-[#FAF7F2] px-6 py-3 rounded-md text-sm font-bold tracking-wide hover:bg-[#2E4A3F] transition-colors">
              Start free — use all templates <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-12 flex flex-wrap gap-px bg-[#1D211F]/8 border border-[#1D211F]/8 rounded-2xl overflow-hidden max-w-2xl">
          {[
            { n: "150+", label: "Templates included" },
            { n: "10",   label: "Industries covered" },
            { n: "~100%", label: "Approval rate" },
          ].map((s) => (
            <div key={s.label} className="flex-1 min-w-[120px] bg-[#FAF7F2] px-6 py-4 flex flex-col gap-0.5">
              <span className="font-serif text-2xl font-light text-[#1D211F]">{s.n}</span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#1D211F]/45 font-bold">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Full showcase */}
      <TemplatesShowcase />

      {/* Feature bullets */}
      <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "AI Compliance Auditor", desc: "Groq-powered checker flags rejection risks before you submit to Meta. Rewrites suggested inline." },
            { title: "Variable Interpolation", desc: "{{1}} {{2}} … mapped to contact fields. Preview exactly what your customer receives before sending." },
            { title: "One-click Campaign Launch", desc: "Approve a template and broadcast to any tag-filtered segment directly from the template card." },
            { title: "Media Support", desc: "Image, video, and document headers — all supported. Upload once, reuse across campaigns." },
            { title: "Status Polling", desc: "Pending templates auto-poll Meta every 5 seconds. No manual refresh needed." },
            { title: "Industry Tags", desc: "Every template is tagged by industry so you can filter to exactly what's relevant to your business." },
          ].map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              className="bg-white border border-[#1D211F]/8 rounded-2xl p-6 space-y-2 hover:border-[#1D211F]/20 transition-all">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2E4A3F] shrink-0" />
                <h3 className="font-bold text-sm text-[#1D211F]">{f.title}</h3>
              </div>
              <p className="text-xs text-[#1D211F]/60 leading-relaxed pl-6">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-12 bg-[#1D211F] text-[#FAF7F2]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div className="space-y-3">
            <h2 className="font-serif text-3xl sm:text-4xl font-light">All 150+ templates. <span className="italic text-[#D05E3C]">Included free.</span></h2>
            <p className="text-[#FAF7F2]/55 text-sm font-medium">No per-template pricing. Every plan includes the full library.</p>
          </div>
          <Link href="/signup" className="shrink-0 inline-flex items-center gap-2 bg-[#D05E3C] hover:bg-[#B84E2E] text-white px-8 py-4 rounded-md text-sm font-bold tracking-wide transition-colors">
            Create workspace <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
