"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";

const pricing = [
  { name: "Starter", price: "₹1,499", period: "per month", desc: "For brands taking their first serious step onto WhatsApp.", features: ["3 team agents", "10,000 contacts", "Campaign broadcasts", "Meta template builder", "Shared team inbox"], cta: "Start Free Trial", popular: false },
  { name: "Growth", price: "₹3,499", period: "per month", desc: "For growing D2C brands automating recovery and post-purchase flows.", features: ["10 team agents", "50,000 contacts", "Visual chatbot builder", "AI sequences & recipes", "Shopify + Shiprocket + Razorpay", "COD confirmation & NDR rescue"], cta: "Start Free Trial", popular: true },
  { name: "Scale", price: "₹8,999", period: "per month", desc: "For established brands that want every rupee attributed and an open API.", features: ["Unlimited agents", "150,000 contacts", "Attribution ledger & ROI reports", "Smart segments", "REST API + SDKs + MCP server", "Priority support"], cta: "Start Free Trial", popular: false },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-36 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 scroll-mt-20">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="text-center space-y-4 max-w-xl mx-auto pb-16">
        <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">INR Pricing · Built for India</span>
        <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-[#1D211F]">
          Honest pricing, <span className="italic font-normal text-[#2E4A3F] shimmer-underline">in rupees.</span>
        </h2>
        <p className="text-[#1D211F]/60 text-sm font-medium">Every plan starts with a 14-day free trial — no credit card. Annual billing gets 2 months free. Enterprise with dedicated WABA and SLAs available on request.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
        {pricing.map((plan, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 60, scale: 0.94 }} whileInView={{ opacity: 1, y: 0, scale: plan.popular ? 1.04 : 1 }} whileHover={{ y: -10, scale: plan.popular ? 1.06 : 1.02 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }} className={`relative rounded-lg ${plan.popular ? "p-[2px] overflow-hidden shadow-xl" : ""}`}>
            {plan.popular && (
              <div aria-hidden className="absolute -inset-[150%] animate-border-spin" style={{ background: "conic-gradient(from 0deg, transparent 0%, transparent 68%, #D05E3C 80%, #FBBF24 88%, transparent 96%)" }} />
            )}
            <div className={`relative border p-8 md:p-10 flex flex-col justify-between rounded-lg h-full ${plan.popular ? "bg-[#1D211F] text-[#FAF7F2] border-transparent rounded-[6px]" : "bg-white border-[#1D211F]/10 hover:border-[#1D211F]/40 text-[#1D211F] hover:shadow-2xl transition-shadow"}`}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className={`font-mono text-[10px] tracking-widest uppercase font-bold ${plan.popular ? "text-[#D05E3C]" : "text-[#1D211F]/50"}`}>{plan.name}</h4>
                {plan.popular && (
                  <motion.span animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="bg-[#FAF7F2]/10 border border-[#FAF7F2]/15 text-[#FAF7F2] font-mono text-[8px] tracking-widest uppercase px-2 py-0.5 rounded font-bold">Popular</motion.span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl md:text-6xl font-serif font-light tracking-tight">{plan.price}</span>
                  <span className={`text-[10px] font-mono tracking-wider uppercase font-semibold ${plan.popular ? "text-[#FAF7F2]/50" : "text-[#1D211F]/40"}`}>/ {plan.period}</span>
                </div>
                <p className={`text-xs font-medium leading-relaxed ${plan.popular ? "text-[#FAF7F2]/70" : "text-[#1D211F]/65"}`}>{plan.desc}</p>
              </div>
              <ul className={`space-y-3.5 pt-6 border-t text-xs font-medium ${plan.popular ? "border-[#FAF7F2]/15" : "border-[#1D211F]/10"}`}>
                {plan.features.map((feat, fIdx) => (
                  <motion.li key={fIdx} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 + fIdx * 0.07 }} className="flex items-start gap-3">
                    <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.popular ? "text-[#D05E3C]" : "text-[#2E4A3F]"}`} />
                    <span className={plan.popular ? "text-[#FAF7F2]/85" : "text-[#1D211F]/80"}>{feat}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
            <div className="pt-8">
              <Link href="/signup" className={`w-full text-center py-4 rounded-md text-xs font-bold tracking-wider uppercase block transition-all duration-300 active:scale-[0.98] ${plan.popular ? "bg-[#D05E3C] hover:bg-[#b04826] text-white shadow-md" : "bg-[#1D211F] hover:bg-[#2E4A3F] text-[#FAF7F2] shadow-sm"}`}>
                {plan.cta}
              </Link>
            </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="max-w-6xl mx-auto mt-10 border border-[#1D211F]/12 bg-[#F1EBE0]/50 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 rounded-lg"
      >
        <span className="font-mono text-[9px] tracking-widest text-[#D05E3C] uppercase font-bold shrink-0">About message charges</span>
        <p className="text-[#1D211F]/65 text-xs font-medium leading-relaxed">
          Meta charges per conversation (utility, marketing, service) — these are billed separately through a prepaid wallet at transparent rates, on every platform including ours. No surprises: every send is metered, logged, and visible in your dashboard before you spend it.
        </p>
      </motion.div>
    </section>
  );
}
