"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";

const pricing = [
  { name: "Startup Core", price: "$15", period: "per month", desc: "Perfect for scaling teams exploring the WhatsApp channel.", features: ["1 Workspace Seat", "Up to 1,000 CRM Contacts", "Pre-approved Meta Templates", "Core Campaign Broadcasts", "Standard Webhook Logs"], cta: "Activate Core Workspace", popular: false },
  { name: "Growth Scaler", price: "$29", period: "per month", desc: "Engineered for growing brands requiring visual flow automation.", features: ["Unlimited Support Agents", "Up to 10,000 Sync Contacts", "Visual Chatbot Flow Builder", "Shopify & WooCommerce Webhooks", "Advanced Click-Through Analytics"], cta: "Upgrade to Growth Plan", popular: true },
  { name: "Enterprise Custom", price: "Custom", period: "dedicated WABA", desc: "For large-scale operations with dedicated SLAs and high volume.", features: ["Dedicated Meta Cloud APIs", "Custom Database Clusters", "Dedicated Support Manager", "Uncapped Message Cadence", "Private API Custom Webhooks"], cta: "Consult Systems Architect", popular: false },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-36 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 scroll-mt-20">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="text-center space-y-4 max-w-xl mx-auto pb-16">
        <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">Transparent Tiers</span>
        <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-[#1D211F]">
          Subscription models <span className="italic font-normal text-[#2E4A3F] shimmer-underline">without hidden cadences.</span>
        </h2>
        <p className="text-[#1D211F]/60 text-sm font-medium">Clear specifications scaled to your operational throughput. Upgrade or downgrade plans natively inside your tenant space.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
        {pricing.map((plan, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 60, scale: 0.94 }} whileInView={{ opacity: 1, y: 0, scale: plan.popular ? 1.04 : 1 }} whileHover={{ y: -10, scale: plan.popular ? 1.06 : 1.02 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }} className={`border p-8 md:p-10 flex flex-col justify-between rounded-lg ${plan.popular ? "bg-[#1D211F] text-[#FAF7F2] border-[#1D211F] shadow-xl" : "bg-white border-[#1D211F]/10 hover:border-[#1D211F]/40 text-[#1D211F] hover:shadow-2xl"}`}>
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
          </motion.div>
        ))}
      </div>
    </section>
  );
}
