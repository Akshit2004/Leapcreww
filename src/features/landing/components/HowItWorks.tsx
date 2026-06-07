"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Plug, Wand2, Send, BarChart3, type LucideIcon } from "lucide-react";

const steps: { n: string; title: string; desc: string; icon: LucideIcon; accent: string }[] = [
  { n: "01", title: "Plug in your WABA", desc: "Connect your WhatsApp Business Account through Meta Embedded Signup. Phone numbers, catalog, and templates sync automatically.", icon: Plug, accent: "#D05E3C" },
  { n: "02", title: "Design conversational flows", desc: "Draft Meta-approved templates with the AI Compliance Auditor, then map their journey on the visual chatbot canvas.", icon: Wand2, accent: "#FBBF24" },
  { n: "03", title: "Dispatch to precise segments", desc: "Send tag-filtered broadcasts or session messages with variable interpolation, anti-spam delay, and timezone-aware scheduling.", icon: Send, accent: "#34D399" },
  { n: "04", title: "Measure attribution & ROI", desc: "Every outbound touch is stamped to a contact. The conversion ledger ties Shopify and Razorpay orders back to the campaign that sourced them.", icon: BarChart3, accent: "#2E4A3F" },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start 0.8", "end 0.4"] });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="how" ref={sectionRef} className="py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 border-b border-[#1D211F]/8 scroll-mt-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start pb-12">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="lg:col-span-5 space-y-3">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">Operational Lifecycle</span>
          <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-[#1D211F]">
            From connection to <span className="italic font-normal text-[#2E4A3F] shimmer-underline">measurable conversion.</span>
          </h2>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay: 0.1 }} className="lg:col-span-7 pt-2 lg:pt-8">
          <p className="text-[#1D211F]/70 text-sm sm:text-base leading-relaxed max-w-2xl font-medium">Four phases, each instrumented end-to-end. No black-box detours, no third-party relays. Every event, signature and template hop is observable inside your own tenant space.</p>
        </motion.div>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 pt-8">
        <svg aria-hidden className="hidden lg:block absolute top-[68px] left-0 w-full h-12 z-0 overflow-visible" viewBox="0 0 1000 40" preserveAspectRatio="none">
          <motion.path d="M 60 20 Q 200 -10, 310 20 T 560 20 T 810 20 T 960 20" fill="transparent" stroke="#D05E3C" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" style={{ pathLength }} />
          {[125, 375, 625, 875].map((cx, i) => (
            <motion.circle key={i} cx={cx} cy="20" r="4" fill="#D05E3C" initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ delay: i * 0.15 + 0.3, type: "spring", stiffness: 300 }} />
          ))}
        </svg>

        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.n} initial={{ opacity: 0, y: 40, scale: 0.96 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }} className="relative group z-10">
              <div className="relative bg-[#FFFBF4] border border-[#1D211F]/10 rounded-lg p-6 lg:p-7 space-y-5 h-full transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-[#1D211F]/10 group-hover:border-[#1D211F]/30">
                <div className="flex items-center justify-between">
                  <motion.div whileHover={{ rotate: [0, -8, 8, -4, 0] }} transition={{ duration: 0.6 }} className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.accent}1A` }}>
                    <Icon className="w-5 h-5" style={{ color: s.accent }} />
                  </motion.div>
                  <span className="font-mono text-xs tracking-widest text-[#1D211F]/30 font-bold">{s.n}</span>
                </div>
                <h3 className="font-serif text-2xl font-light text-[#1D211F] leading-tight">{s.title}</h3>
                <p className="text-[#1D211F]/65 text-xs leading-relaxed font-medium">{s.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
