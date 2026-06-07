"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";

function Counter({ to, suffix = "", prefix = "", duration = 2200 }: { to: number; suffix?: string; prefix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.floor(to * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, to, duration]);

  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

const stats = [
  { value: 412, suffix: "M+", label: "Messages dispatched", hint: "across active tenants" },
  { value: 99, suffix: ".98%", label: "API uptime", hint: "rolling 90-day window" },
  { value: 41, suffix: "%", label: "Avg. broadcast CTR", hint: "Meta utility templates" },
  { value: 220, suffix: "ms", label: "Median AI reply", hint: "autoresponder latency" },
];

export default function Stats() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const gridY = useTransform(scrollYProgress, [0, 1], [-40, 40]);
  const blobY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const blob2Y = useTransform(scrollYProgress, [0, 1], [-60, 60]);

  return (
    <section ref={sectionRef} className="py-24 md:py-32 px-6 md:px-12 bg-[#1D211F] text-[#FAF7F2] relative overflow-hidden border-y border-[#1D211F]/30">
      <motion.div aria-hidden style={{ y: gridY }} className="absolute inset-0 opacity-[0.07]">
        <div className="w-full h-full" style={{ backgroundImage: "linear-gradient(to right,#FAF7F2 1px,transparent 1px),linear-gradient(to bottom,#FAF7F2 1px,transparent 1px)", backgroundSize: "64px 64px" }} />
      </motion.div>
      <motion.div aria-hidden style={{ y: blobY }} className="absolute top-1/3 right-10 w-80 h-80 rounded-full bg-[#D05E3C]/20 blur-3xl" />
      <motion.div aria-hidden style={{ y: blob2Y }} className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-[#2E4A3F]/30 blur-3xl" />

      <div className="max-w-7xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-end pb-16">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="lg:col-span-6 space-y-3">
            <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">Aggregated Tenant Telemetry</span>
            <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-[#FAF7F2]">
              Throughput measured, <span className="italic font-normal text-amber-300">not estimated.</span>
            </h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay: 0.1 }} className="lg:col-span-6">
            <p className="text-[#FAF7F2]/60 text-sm leading-relaxed font-medium max-w-md">Real numbers from anonymized customer workspaces. We publish the metrics other vendors hide because the architecture earns them.</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-[#FAF7F2]/10">
          {stats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 50, filter: "blur(8px)" }} whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.9, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }} className={`p-6 md:p-8 lg:p-10 border-b border-[#FAF7F2]/10 ${i < 3 ? "lg:border-r border-r" : ""} ${i === 1 ? "border-r-0 lg:border-r" : ""} ${i === 2 ? "lg:border-r" : ""}`}>
              <div className="font-serif text-5xl md:text-6xl lg:text-7xl font-light text-[#FAF7F2] tracking-tight tabular-nums">
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-4 space-y-1">
                <div className="font-sans font-semibold text-sm text-[#FAF7F2]">{s.label}</div>
                <div className="font-mono text-[10px] tracking-widest text-[#FAF7F2]/40 uppercase">{s.hint}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
