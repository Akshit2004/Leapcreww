"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CTASection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const ghostX = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  return (
    <section ref={ref} className="py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.8 }} className="relative bg-[#1D211F] text-[#FAF7F2] rounded-2xl px-8 md:px-16 py-14 md:py-20 overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(to right,#FAF7F2 1px,transparent 1px),linear-gradient(to bottom,#FAF7F2 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
        <div aria-hidden className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#D05E3C]/20 blur-3xl animate-drift" />
        <div aria-hidden className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-[#2E4A3F]/30 blur-3xl animate-drift" style={{ animationDelay: "-6s" }} />

        <motion.span aria-hidden style={{ x: ghostX }} className="absolute -bottom-6 md:-bottom-10 left-0 right-0 text-center font-serif font-light text-[26vw] md:text-[16rem] leading-none text-stroke-cream select-none pointer-events-none whitespace-nowrap">
          LAUNCH
        </motion.span>

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-7 space-y-5">
            <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">Ready when you are</span>
            <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-[#FAF7F2] leading-[1.05]">
              Your next recovered cart is <span className="italic font-normal text-amber-300">already in someone&rsquo;s phone.</span>
            </h2>
            <p className="text-[#FAF7F2]/65 text-sm md:text-base font-medium max-w-xl leading-relaxed">Connect your store, switch on the recipes, and send your first campaign tonight. 14-day free trial, no credit card, no sales call.</p>
          </div>

          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-3">
            <Link href="/signup" className="magnetic-cta group bg-[#D05E3C] hover:bg-[#b04826] text-white font-bold text-xs tracking-wider uppercase px-6 py-4 rounded-md flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5">
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/login" className="magnetic-cta border border-[#FAF7F2]/25 hover:border-[#FAF7F2]/60 text-[#FAF7F2] font-bold text-xs tracking-wider uppercase px-6 py-4 rounded-md flex items-center justify-center gap-2">
              <span>Access Dashboard</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
