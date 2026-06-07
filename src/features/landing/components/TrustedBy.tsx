"use client";
import { motion } from "framer-motion";

const logos = [
  "OAKLINE / Hospitality", "STRATA / SaaS", "BLOOM CO / Retail",
  "AETHER LABS / Health", "NORTH+SOUTH / Logistics", "POLYHEDRON / Fintech",
  "TANGRAM / Education", "FOLKE & CO / D2C",
];

export default function TrustedBy() {
  return (
    <section className="py-16 md:py-20 px-6 md:px-12 bg-[#F1EBE0] border-y border-[#1D211F]/8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 space-y-2">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">Trusted by operators</span>
          <h3 className="font-serif text-2xl md:text-3xl font-light tracking-tight text-[#1D211F]">
            Powering conversational systems for teams in 28 countries.
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-8 gap-y-6 items-center">
          {logos.map((name, i) => (
            <motion.div key={name} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.5, delay: i * 0.05 }}
              className="font-sans font-extrabold text-xs sm:text-sm tracking-[0.25em] text-[#1D211F]/45 hover:text-[#1D211F] transition-colors text-center uppercase">
              {name}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
