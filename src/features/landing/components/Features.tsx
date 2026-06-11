"use client";
import { motion } from "framer-motion";

const features = [
  { index: "01", title: "Shared Team Inbox", subtitle: "Conversational Flows", desc: "Connect your team to a single WhatsApp Business API number. Seamlessly route chats to agents, assign customer segments, manage dynamic unread badges, and automate live support handoffs without active server polling.", bullets: ["Unified queue", "Agent takeover", "AI reply suggestions"] },
  { index: "02", title: "Smart Campaign Broadcasts", subtitle: "CRM Dispatch System", desc: "Launch pre-approved Meta templates to targeted tag lists. Monitor live deliverability metrics (Sent, Delivered, Read, and Click-Through rates) synchronized directly with your secure PostgreSQL database.", bullets: ["Scheduled & recurring", "Variable interpolation", "Funnel analytics"] },
  { index: "03", title: "Visual Chatbot Builder", subtitle: "Automation Engine", desc: "Architect complex conversational paths with absolute structural clarity. Design branch routing triggers, optional node choices, and third-party webhook integrations in a custom workspace engineered for high-throughput messaging.", bullets: ["Drag-and-drop canvas", "Pure AI autoresponder", "Per-node analytics"] },
  { index: "04", title: "Webhook Integrations", subtitle: "External Orchestration", desc: "Synchronize customer actions across your technology stack natively. Bind Shopify abandoned carts, WooCommerce payment receipts, and automated Google Sheets logs directly to your secure WhatsApp channel without third-party delay.", bullets: ["Shopify & WooCommerce", "Signed outbound hooks", "Connector registry"] },
  { index: "05", title: "One-Click AI Automations", subtitle: "Recipe Engine", desc: "Install complete working automations — abandoned cart recovery, win-back sequences, review collection — with a single click. Or describe your use case in plain language and the AI composer generates and installs a custom drip sequence on the spot.", bullets: ["Six instant recipes", "AI recipe composer", "Drip sequences"] },
  { index: "06", title: "Commerce, Bookings & ROI", subtitle: "Revenue Layer", desc: "Sell inside the conversation. WhatsApp catalog orders, Razorpay-paid appointment bookings, and Shopify checkouts all land in one attribution ledger that ties every rupee of revenue back to the exact campaign that sourced it.", bullets: ["Paid bookings", "Catalog checkout", "Attribution ledger"] },
];

export default function Features() {
  return (
    <section id="features" className="py-24 md:py-36 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 border-b border-[#1D211F]/8 scroll-mt-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start pb-12">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="lg:col-span-5 space-y-3">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">CRM Architecture Specs</span>
          <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-[#1D211F]">
            Engineered with extreme <span className="italic font-normal text-[#2E4A3F] shimmer-underline">visual precision.</span>
          </h2>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay: 0.1 }} className="lg:col-span-7 pt-2 lg:pt-8">
          <p className="text-[#1D211F]/70 text-sm sm:text-base leading-relaxed max-w-2xl font-medium">We replaced over-decorated radial meshes and floating isometric 3D shapes with rigorous structural layout columns. Every capability maps directly to real CRM utilities engineered for high performance and traceable behavior.</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 lg:gap-x-16 gap-y-12 lg:gap-y-20 border-t border-[#1D211F]/10 pt-12 lg:pt-16">
        {features.map((feat, idx) => (
          <motion.article key={idx} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.75, delay: (idx % 2) * 0.12, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: -6 }} className="group space-y-4 border-t border-[#1D211F]/8 pt-8 first:border-none lg:first:border-t lg:border-t cursor-default">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs tracking-widest text-[#D05E3C] uppercase font-bold">
                <span className="inline-block group-hover:translate-x-1 transition-transform duration-300">{feat.subtitle}</span>
              </span>
              <motion.span whileHover={{ scale: 1.4, rotate: 8 }} className="font-mono text-xs text-[#1D211F]/25 font-bold">{feat.index}</motion.span>
            </div>
            <h3 className="font-serif text-3xl lg:text-4xl font-light text-[#1D211F] leading-tight group-hover:text-[#2E4A3F] transition-colors duration-300">{feat.title}</h3>
            <p className="text-[#1D211F]/75 text-sm leading-relaxed font-medium max-w-md">{feat.desc}</p>
            <ul className="flex flex-wrap gap-2 pt-2">
              {feat.bullets.map((b, bi) => (
                <motion.li key={b} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + bi * 0.08, type: "spring", stiffness: 220 }} className="font-mono text-[10px] tracking-widest uppercase font-semibold px-2.5 py-1 rounded-full border border-[#1D211F]/15 text-[#1D211F]/70 group-hover:border-[#2E4A3F]/60 group-hover:text-[#2E4A3F] transition-colors duration-300">
                  {b}
                </motion.li>
              ))}
            </ul>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
