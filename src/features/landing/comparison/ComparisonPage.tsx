"use client";
import { motion } from "framer-motion";
import { ArrowRight, Check, Minus, X } from "lucide-react";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import WaitlistSection from "../components/WaitlistSection";
import type { CellValue, CompetitorPage } from "./data";

function Cell({ value, accent = false }: { value: CellValue; accent?: boolean }) {
  if (value === "yes") {
    return (
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${accent ? "bg-[#2E4A3F]" : "bg-[#1D211F]/10"}`}>
        <Check className={`w-3.5 h-3.5 ${accent ? "text-[#FAF7F2]" : "text-[#1D211F]/70"}`} strokeWidth={3} />
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#D05E3C]/10">
        <X className="w-3.5 h-3.5 text-[#D05E3C]" strokeWidth={3} />
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/15">
          <Minus className="w-3.5 h-3.5 text-amber-600" strokeWidth={3} />
        </span>
        <span className="font-mono text-[8px] tracking-wider text-[#1D211F]/40 uppercase hidden sm:inline">Partial</span>
      </span>
    );
  }
  return <span className="text-xs font-semibold text-[#1D211F]/80">{value}</span>;
}

export default function ComparisonPage({ data }: { data: CompetitorPage }) {
  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#1D211F] flex flex-col font-sans relative grain-overlay overflow-x-hidden">
      <Header />

      {/* ── Hero ── */}
      <section className="pt-36 pb-16 md:pt-44 md:pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full space-y-6 border-b border-[#1D211F]/8">
        <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">Honest Comparison · June 2026</span>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-light tracking-tight leading-[1.05] max-w-4xl">
          LeapCrew <span className="italic font-normal text-[#1D211F]/40">vs</span>{" "}
          <span className="italic font-normal text-[#2E4A3F]">{data.name}</span>
        </h1>
        <p className="text-[#1D211F]/65 text-sm sm:text-base leading-relaxed font-medium max-w-2xl">{data.positioning}</p>
      </section>

      {/* ── Verdict ── */}
      <section className="py-14 md:py-16 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="border-l-2 border-[#2E4A3F] pl-6 sm:pl-8 max-w-3xl"
        >
          <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/40 uppercase font-bold">Our verdict, plainly</span>
          <p className="pt-3 font-serif text-xl sm:text-2xl md:text-3xl font-light leading-snug text-[#1D211F]">{data.verdict}</p>
        </motion.div>
      </section>

      {/* ── Table ── */}
      <section className="pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="border border-[#1D211F]/12 bg-white overflow-x-auto"
        >
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-[#1D211F]/10 bg-[#F1EBE0]/60">
                <th className="text-left px-5 py-4 font-mono text-[10px] tracking-widest text-[#1D211F]/50 uppercase font-bold w-1/2">Capability</th>
                <th className="text-left px-5 py-4 font-mono text-[10px] tracking-widest text-[#2E4A3F] uppercase font-bold">LeapCrew</th>
                <th className="text-left px-5 py-4 font-mono text-[10px] tracking-widest text-[#1D211F]/50 uppercase font-bold">{data.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D211F]/8">
              {data.rows.map((row, i) => (
                <motion.tr
                  key={row.feature}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4) }}
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-sm text-[#1D211F]">{row.feature}</div>
                    {row.detail && <div className="font-mono text-[9px] tracking-wider text-[#1D211F]/40 uppercase pt-0.5">{row.detail}</div>}
                  </td>
                  <td className="px-5 py-4"><Cell value={row.leapcrew} accent /></td>
                  <td className="px-5 py-4"><Cell value={row.competitor} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
        <p className="pt-4 font-mono text-[8px] sm:text-[9px] tracking-widest text-[#1D211F]/35 uppercase leading-relaxed max-w-3xl">
          Competitor capabilities summarized in good faith from public information, June 2026. Features and pricing change — always verify on their site. Spotted an error? Tell us and we&rsquo;ll fix it within 24 hours.
        </p>
      </section>

      {/* ── Honest fit ── */}
      <section className="pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="border border-[#1D211F]/12 bg-white p-7 sm:p-9 space-y-5"
        >
          <h2 className="font-serif text-2xl sm:text-3xl font-light text-[#1D211F]">
            Choose <span className="italic">{data.name}</span> if…
          </h2>
          <ul className="space-y-3.5">
            {data.chooseThemIf.map((reason) => (
              <li key={reason} className="flex items-start gap-3 text-sm font-medium text-[#1D211F]/75 leading-relaxed">
                <span className="w-1.5 h-1.5 rotate-45 bg-[#1D211F]/30 shrink-0 mt-2" />
                {reason}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="border border-[#2E4A3F]/30 bg-[#2E4A3F] text-[#FAF7F2] p-7 sm:p-9 space-y-5"
        >
          <h2 className="font-serif text-2xl sm:text-3xl font-light">
            Choose <span className="italic">LeapCrew</span> if…
          </h2>
          <ul className="space-y-3.5">
            {data.chooseUsIf.map((reason) => (
              <li key={reason} className="flex items-start gap-3 text-sm font-medium text-[#FAF7F2]/85 leading-relaxed">
                <Check className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" strokeWidth={3} />
                {reason}
              </li>
            ))}
          </ul>
          <div className="pt-3 flex flex-col sm:flex-row gap-3">
            <Link href="/signup" className="group bg-[#D05E3C] hover:bg-[#b04826] text-white font-bold text-xs tracking-wider uppercase px-6 py-4 rounded-md flex items-center justify-center gap-2 transition-colors">
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/calculator" className="border border-[#FAF7F2]/25 hover:border-[#FAF7F2]/60 text-[#FAF7F2] font-bold text-xs tracking-wider uppercase px-6 py-4 rounded-md flex items-center justify-center transition-colors">
              Calculate Your Leak
            </Link>
          </div>
        </motion.div>
      </section>

      <WaitlistSection source="vs_page" />
      <Footer />
    </main>
  );
}
