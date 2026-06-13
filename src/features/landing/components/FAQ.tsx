"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

const faqs = [
  { q: "Do I need my own WhatsApp Business API approval first?", a: "No. LeapCrew AI connects via Meta's Embedded Signup flow, which provisions a WhatsApp Business Account, phone number, and template surface from inside your workspace. If you already have a WABA, you can authorize it in the same wizard." },
  { q: "What happens after the 14-day free trial?", a: "You pick a plan (from ₹1,499/month) or your workspace pauses — no auto-charge, because we never took a card. Everything you built during the trial (flows, templates, contacts, automations) is kept and reactivates the moment you subscribe." },
  { q: "How does the chatbot builder handle dynamic intent?", a: "You can wire deterministic node flows (trigger → filter → action) or flip on Pure AI Mode, which routes every inbound message to an LLM with your brand profile, fallback rules, and per-org safety configuration." },
  { q: "What integrations ship out of the box?", a: "Shopify, WooCommerce, Razorpay, Shiprocket, Google Sheets, and a generic webhook connector are available immediately. Shiprocket powers the delivery-side automations — shipping notifications, NDR rescue, and post-delivery review collection — with zero custom code." },
  { q: "How do Meta's conversation charges work?", a: "Meta charges per 24-hour conversation window — roughly ₹0.30 for utility, ₹0.80+ for marketing. These are billed through a prepaid wallet on every platform, including ours. Each send shows its cost before it goes out, the wallet never overdrafts, and your dashboard shows exactly where every paisa went." },
  { q: "Can agencies white-label the platform?", a: "Yes. Partners get custom domain mapping, branded login, pricing markup, and an isolated client-org dashboard. The branding resolver returns logo, color, and partner copy dynamically based on host." },
];

export default function FAQ() {
  const [open, setOpen] = useState<number>(0);
  return (
    <section id="faq" className="py-24 md:py-32 px-6 md:px-12 max-w-5xl mx-auto w-full relative z-10 border-b border-[#1D211F]/8 scroll-mt-20">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="text-center space-y-3 pb-14">
        <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">Operational Q &amp; A</span>
        <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-[#1D211F]">
          Questions, <span className="italic font-normal text-[#2E4A3F] shimmer-underline">answered carefully.</span>
        </h2>
      </motion.div>

      <div className="border-t border-[#1D211F]/10">
        {faqs.map((item, i) => {
          const isOpen = open === i;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45, delay: i * 0.04 }} className="border-b border-[#1D211F]/10">
              <button onClick={() => setOpen(isOpen ? -1 : i)} className="w-full flex items-start justify-between gap-6 py-6 text-left group" aria-expanded={isOpen} aria-controls={`faq-answer-${i}`}>
                <div className="flex items-baseline gap-4 flex-1">
                  <span className="font-mono text-[10px] text-[#1D211F]/35 tracking-widest font-bold shrink-0 pt-1.5">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="font-serif text-xl md:text-2xl font-light text-[#1D211F] leading-snug group-hover:text-[#2E4A3F] transition-colors">{item.q}</h3>
                </div>
                <div className={`w-9 h-9 rounded-full border border-[#1D211F]/20 flex items-center justify-center shrink-0 transition-all duration-400 ${isOpen ? "bg-[#1D211F] text-[#FAF7F2] rotate-45" : "text-[#1D211F]"}`}>
                  <Plus className="w-4 h-4" />
                </div>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden" id={`faq-answer-${i}`}>
                    <p className="pb-7 pl-10 pr-14 text-[#1D211F]/70 text-sm md:text-base leading-relaxed font-medium max-w-3xl">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
