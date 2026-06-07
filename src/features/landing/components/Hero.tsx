"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import InteractiveSimulator from "./InteractiveSimulator";
import Link from "next/link";

const line1 = "Conversational systems,";
const line2a = "built for ";
const line2b = "architectural scale.";

function AnimatedChars({ text, italic = false, accent = false, baseDelay = 0 }: { text: string; italic?: boolean; accent?: boolean; baseDelay?: number }) {
  return (
    <span className={`inline-block ${italic ? "italic font-normal" : ""} ${accent ? "text-[#2E4A3F] shimmer-underline" : ""}`}>
      {text.split("").map((ch, i) => (
        <motion.span key={i} initial={{ y: "110%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: baseDelay + i * 0.022, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="inline-block" style={{ whiteSpace: ch === " " ? "pre" : "normal" }}>
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const blob1Y = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const blob2Y = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const blob1X = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 60, damping: 18 });
  const smy = useSpring(my, { stiffness: 60, damping: 18 });
  const blob1Mx = useTransform(smx, (v) => v * 30);
  const blob1My = useTransform(smy, (v) => v * 30);
  const blob2Mx = useTransform(smx, (v) => v * -40);
  const blob2My = useTransform(smy, (v) => v * -40);

  const onMouseMove = (e: React.MouseEvent) => {
    const r = heroRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };

  return (
    <section id="top" ref={heroRef} onMouseMove={onMouseMove} className="pt-36 pb-20 md:pt-48 md:pb-32 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 border-b border-[#1D211F]/8">
      <motion.div aria-hidden style={{ y: blob1Y, x: blob1X }} className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#D05E3C]/12 blur-3xl">
        <motion.div style={{ x: blob1Mx, y: blob1My }} className="w-full h-full rounded-full" />
      </motion.div>
      <motion.div aria-hidden style={{ y: blob2Y }} className="absolute top-40 right-0 w-[28rem] h-[28rem] rounded-full bg-[#2E4A3F]/12 blur-3xl">
        <motion.div style={{ x: blob2Mx, y: blob2My }} className="w-full h-full rounded-full" />
      </motion.div>

      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: [0.15, 0.4, 0.15], y: ["0%", "-30%", "0%"], x: [`${i * 11}%`, `${i * 11 + 4}%`, `${i * 11}%`] }} transition={{ duration: 10 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }} className="absolute w-1 h-1 rounded-full bg-[#1D211F]/30" style={{ top: `${10 + (i * 9) % 70}%`, left: `${(i * 13) % 90}%` }} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start relative">
        <motion.div style={{ y: titleY, opacity: titleOpacity }} className="lg:col-span-6 space-y-8 text-left">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D05E3C]/25 bg-[#D05E3C]/5 select-none">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#D05E3C] opacity-60 pulse-ring" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[#D05E3C]" />
            </span>
            <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">Multi-Tenant WhatsApp CRM Suite</span>
          </motion.div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.05] text-[#1D211F] overflow-hidden">
            <span className="block overflow-hidden"><AnimatedChars text={line1} baseDelay={0.15} /></span>
            <span className="block overflow-hidden"><AnimatedChars text={line2a} baseDelay={0.7} /><AnimatedChars text={line2b} italic accent baseDelay={0.95} /></span>
          </h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 1.6 }} className="text-[#1D211F]/70 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
            Scale client communications with complete clarity. WappFlow orchestrates pre-approved Meta broadcasts, visual chatbot automation nodes, and transactional webhook relays under a unified, high-security dashboard workspace.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 1.75 }} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
            <Link href="/signup" className="group bg-[#1D211F] hover:bg-[#2E4A3F] text-[#FAF7F2] font-bold text-xs tracking-wider uppercase px-6 py-4 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2">
              <span>Register Workspace</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/login" className="bg-[#FAF7F2] border border-[#1D211F]/20 hover:border-[#1D211F]/60 text-[#1D211F] font-bold text-xs tracking-wider uppercase px-6 py-4 rounded-md transition-colors flex items-center justify-center gap-2">
              <span>Access Dashboard</span><ExternalLink className="w-4 h-4 text-[#1D211F]/50" />
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 2 }} className="pt-6 border-t border-[#1D211F]/8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[9px] tracking-widest text-[#1D211F]/40 uppercase">
            <div>[ RELEASE v2.4.0 ]</div>
            <div>[ SECURE POSTGRES STORAGE ]</div>
            <div>[ ZERO LATENCY API ]</div>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }} id="simulator" className="lg:col-span-6 w-full lg:sticky lg:top-28 scroll-mt-24">
          <InteractiveSimulator />
        </motion.div>
      </div>
    </section>
  );
}
