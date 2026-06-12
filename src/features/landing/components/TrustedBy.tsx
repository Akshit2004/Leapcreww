"use client";
import { motion } from "framer-motion";

const logos = [
  "OAKLINE / Hospitality", "STRATA / SaaS", "BLOOM CO / Retail",
  "AETHER LABS / Health", "NORTH+SOUTH / Logistics", "POLYHEDRON / Fintech",
  "TANGRAM / Education", "FOLKE & CO / D2C",
];

function LogoRail({ items, reverse = false, duration = 38 }: { items: string[]; reverse?: boolean; duration?: number }) {
  const loop = [...items, ...items];
  return (
    <div className="flex whitespace-nowrap will-change-transform marquee-track" style={{ animation: `marquee ${duration}s linear infinite${reverse ? " reverse" : ""}` }}>
      {loop.map((name, i) => (
        <div key={`${name}-${i}`} className="shrink-0 flex items-center">
          <span className="font-sans font-extrabold text-xs sm:text-sm tracking-[0.3em] text-[#1D211F]/40 hover:text-[#1D211F] transition-colors duration-300 uppercase cursor-default px-8 sm:px-12">
            {name}
          </span>
          <span aria-hidden className="w-1.5 h-1.5 rotate-45 bg-[#D05E3C]/40 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default function TrustedBy() {
  return (
    <section className="py-16 md:py-20 bg-[#F1EBE0] border-y border-[#1D211F]/8 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7 }}
        className="text-center mb-12 space-y-2 px-6"
      >
        <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">Trusted by operators</span>
        <h3 className="font-serif text-2xl md:text-3xl font-light tracking-tight text-[#1D211F]">
          Powering conversational systems for teams in 28 countries.
        </h3>
      </motion.div>

      <div className="relative space-y-8 marquee-container">
        <div aria-hidden className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-[#F1EBE0] to-transparent z-10 pointer-events-none" />
        <div aria-hidden className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-[#F1EBE0] to-transparent z-10 pointer-events-none" />
        <LogoRail items={logos} duration={42} />
        <LogoRail items={[...logos].reverse()} reverse duration={34} />
      </div>
    </section>
  );
}
