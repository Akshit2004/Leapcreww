"use client";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  { quote: "I didn't realise how much COD was costing us until the confirmation flow went live. Fake orders just stopped reaching the courier.", author: "Founder", role: "Beauty D2C · Mumbai · Design Partner", accent: "#D05E3C" },
  { quote: "The attribution ledger is the first time I could tell my CA exactly which campaign made which rupee. Nothing else we tried did that.", author: "Co-founder", role: "Fashion D2C · Jaipur · Design Partner", accent: "#2E4A3F" },
  { quote: "We set up cart recovery, COD confirmation, and the review collector in one afternoon. No agency, no developer, just the recipe buttons.", author: "Growth Lead", role: "Supplements D2C · Bengaluru · Design Partner", accent: "#FBBF24" },
  { quote: "Our agency builds client automations on the API now. Having typed SDKs and an MCP server in this category genuinely surprised us.", author: "Technical Director", role: "D2C Growth Agency · Delhi · Design Partner", accent: "#34D399" },
];

export default function Testimonials() {
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 border-b border-[#1D211F]/8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-end pb-12">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="lg:col-span-6 space-y-3">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">Design Partner Cohort</span>
          <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-[#1D211F]">
            Built alongside <span className="italic font-normal text-[#2E4A3F] shimmer-underline">real D2C brands.</span>
          </h2>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay: 0.1 }} className="lg:col-span-6">
          <p className="text-[#1D211F]/65 text-sm font-medium max-w-md leading-relaxed">Anonymized feedback from our pre-launch design-partner program — the brands shaping the product before it ships. Named case studies coming post-launch.</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {testimonials.map((t, i) => (
          <motion.figure key={i} initial={{ opacity: 0, y: 50, rotate: i % 2 === 0 ? -1 : 1 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} whileHover={{ y: -6, rotate: i % 2 === 0 ? -0.5 : 0.5 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, delay: (i % 2) * 0.12, ease: [0.22, 1, 0.36, 1] }} className="relative bg-[#FFFBF4] border border-[#1D211F]/10 rounded-lg p-7 lg:p-9 group hover:border-[#1D211F]/30 transition-colors shadow-sm hover:shadow-xl">
            <motion.div whileHover={{ rotate: -10, scale: 1.15 }} transition={{ type: "spring", stiffness: 280 }} className="absolute -top-3 left-7 w-7 h-7 p-1 bg-[#FAF7F2] rounded-full flex items-center justify-center">
              <Quote className="w-full h-full" style={{ color: t.accent }} />
            </motion.div>
            <blockquote className="font-serif text-xl md:text-2xl font-light leading-snug text-[#1D211F]">&ldquo;{t.quote}&rdquo;</blockquote>
            <figcaption className="pt-6 mt-6 border-t border-[#1D211F]/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: t.accent }}>
                {t.author.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div>
                <div className="font-sans font-bold text-sm text-[#1D211F]">{t.author}</div>
                <div className="font-mono text-[10px] tracking-wider text-[#1D211F]/50 uppercase">{t.role}</div>
              </div>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
