"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Workflow, FileJson, ArrowUpRight } from "lucide-react";
import Link from "next/link";

type Lang = "typescript" | "python" | "curl";

/* Each line is an array of [className, text] spans so we get lightweight
   syntax color without a highlighter dependency. */
type Span = [string, string];
const CODE: Record<Lang, { label: string; lines: Span[][] }> = {
  typescript: {
    label: "TypeScript",
    lines: [
      [["text-[#D05E3C]", "import"], ["", " { WappFlow } "], ["text-[#D05E3C]", "from"], ["text-amber-300", ' "@wappflow/sdk"'], ["", ";"]],
      [["", ""]],
      [["text-[#D05E3C]", "const"], ["", " wf = "], ["text-[#D05E3C]", "new"], ["", " WappFlow({ apiKey: "], ["text-amber-300", '"wf_live_..."'], ["", " });"]],
      [["", ""]],
      [["text-[#FAF7F2]/40", "// Send a template broadcast"]],
      [["text-[#D05E3C]", "await"], ["", " wf.messages.send({"]],
      [["", "  to: "], ["text-amber-300", '"+919876543210"'], ["", ","]],
      [["", "  template: "], ["text-amber-300", '"cart_recovery"'], ["", ","]],
      [["", "});"]],
      [["", ""]],
      [["text-[#FAF7F2]/40", "// Upsert a CRM contact, tags merge automatically"]],
      [["text-[#D05E3C]", "await"], ["", " wf.contacts.upsert({ phone, tags: ["], ["text-amber-300", '"vip"'], ["", "] });"]],
    ],
  },
  python: {
    label: "Python",
    lines: [
      [["text-[#D05E3C]", "from"], ["", " wappflow "], ["text-[#D05E3C]", "import"], ["", " WappFlow"]],
      [["", ""]],
      [["text-[#D05E3C]", "with"], ["", " WappFlow(api_key="], ["text-amber-300", '"wf_live_..."'], ["", ") "], ["text-[#D05E3C]", "as"], ["", " wf:"]],
      [["", "    wf.messages.send(to="], ["text-amber-300", '"+919876543210"'], ["", ", text="], ["text-amber-300", '"Hi!"'], ["", ")"]],
      [["", ""]],
      [["text-[#FAF7F2]/40", "    # Poll inbound messages as a cursor stream"]],
      [["", "    events = wf.events.list(type="], ["text-amber-300", '"message.received"'], ["", ")"]],
      [["", "    "], ["text-[#D05E3C]", "for"], ["", " event "], ["text-[#D05E3C]", "in"], ["", " events["], ["text-amber-300", '"events"'], ["", "]:"]],
      [["", "        handle(event)"]],
    ],
  },
  curl: {
    label: "curl",
    lines: [
      [["", "curl -X POST https://app.leapcrew.ai/api/v1/messages \\"]],
      [["", "  -H "], ["text-amber-300", '"Authorization: Bearer wf_live_..."'], ["", " \\"]],
      [["", "  -H "], ["text-amber-300", '"Idempotency-Key: order-8841"'], ["", " \\"]],
      [["", "  -d "], ["text-amber-300", "'{\"to\":\"+919876543210\",\"template\":\"cart_recovery\"}'"]],
      [["", ""]],
      [["text-[#FAF7F2]/40", "# → { \"messageId\": \"...\", \"waMessageId\": \"wamid....\" }"]],
      [["text-[#FAF7F2]/40", "# Replay-safe: the same key never double-sends."]],
    ],
  },
};

const surfaces = [
  { icon: Bot, title: "MCP Server", desc: "Hand Claude or any AI agent the keys: send messages, upsert contacts and read events over the Model Context Protocol.", accent: "#D05E3C" },
  { icon: Workflow, title: "Zapier · Make · n8n", desc: "Native triggers and actions on all three automation platforms. Six thousand apps away from any workflow you can imagine.", accent: "#FBBF24" },
  { icon: FileJson, title: "OpenAPI + Signed Webhooks", desc: "A complete 3.1 spec with interactive docs, HMAC-signed outbound deliveries and idempotent retries on every send.", accent: "#34D399" },
];

export default function DeveloperPlatform() {
  const [lang, setLang] = useState<Lang>("typescript");

  return (
    <section id="developers" className="py-24 md:py-36 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 border-b border-[#1D211F]/8 scroll-mt-20">
      {/* Section header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start pb-12 lg:pb-16">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="lg:col-span-5 space-y-3">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">Developer Platform</span>
          <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-[#1D211F]">
            Every feature, <span className="italic font-normal text-[#2E4A3F] shimmer-underline">also an API.</span>
          </h2>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay: 0.1 }} className="lg:col-span-7 pt-2 lg:pt-8">
          <p className="text-[#1D211F]/70 text-sm sm:text-base leading-relaxed max-w-2xl font-medium">
            The dashboard is one client of the platform — never the only one. Typed SDKs for TypeScript and Python, scoped API keys with sandbox mode, and an MCP server that lets AI agents operate your WhatsApp channel directly.
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        {/* Code terminal */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-7 relative"
        >
          <div aria-hidden className="absolute -top-10 -left-10 w-56 h-56 rounded-full bg-[#2E4A3F]/10 blur-3xl pointer-events-none" />
          <div aria-hidden className="absolute -bottom-8 -right-8 w-48 h-48 rounded-full bg-[#D05E3C]/10 blur-3xl pointer-events-none" />

          <div className="relative bg-[#1D211F] rounded-lg overflow-hidden shadow-2xl shadow-[#1D211F]/20 border border-[#1D211F]">
            {/* Title bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#FAF7F2]/10">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D05E3C]/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-300/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#34D399]/70" />
              </div>
              <div className="flex items-center gap-1">
                {(Object.keys(CODE) as Lang[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setLang(key)}
                    className={`font-mono text-[10px] tracking-widest uppercase font-bold px-3 py-1.5 rounded transition-colors cursor-pointer ${
                      lang === key ? "bg-[#FAF7F2]/10 text-[#FAF7F2]" : "text-[#FAF7F2]/40 hover:text-[#FAF7F2]/70"
                    }`}
                  >
                    {CODE[key].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Code body — staggered line reveal on tab switch */}
            <div className="p-5 md:p-6 min-h-[320px] overflow-x-auto">
              <AnimatePresence mode="wait">
                <motion.pre key={lang} initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.12 } }} variants={{ show: { transition: { staggerChildren: 0.045 } } }} className="font-mono text-[12.5px] leading-relaxed text-[#FAF7F2]/85">
                  {CODE[lang].lines.map((spans, i) => (
                    <motion.div key={i} variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } } }} className="whitespace-pre min-h-[1.4em]">
                      {spans.map(([cls, text], j) => (
                        <span key={j} className={cls}>{text}</span>
                      ))}
                    </motion.div>
                  ))}
                </motion.pre>
              </AnimatePresence>
            </div>
          </div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.6, duration: 0.8 }} className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[9px] tracking-widest text-[#1D211F]/40 uppercase">
            <span>[ npm i @wappflow/sdk ]</span>
            <span>[ pip install wappflow ]</span>
            <Link href="/api-docs" className="text-[#D05E3C]/80 hover:text-[#D05E3C] transition-colors inline-flex items-center gap-1">
              [ Interactive API reference <ArrowUpRight className="w-2.5 h-2.5" /> ]
            </Link>
          </motion.div>
        </motion.div>

        {/* Integration surfaces */}
        <div className="lg:col-span-5 space-y-6">
          {surfaces.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ x: 6 }}
                className="group flex items-start gap-4 border-t border-[#1D211F]/8 pt-6 first:border-t-0 first:pt-0 cursor-default"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: `${s.accent}1A` }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: s.accent }} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-serif text-xl font-light text-[#1D211F] group-hover:text-[#2E4A3F] transition-colors duration-300">{s.title}</h3>
                  <p className="text-[#1D211F]/65 text-xs leading-relaxed font-medium">{s.desc}</p>
                </div>
              </motion.div>
            );
          })}

          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.55, type: "spring", stiffness: 180 }} className="flex flex-wrap gap-2 pt-2">
            {["REST API", "TS SDK", "Python SDK", "Zapier", "Make", "n8n", "MCP", "Webhooks", "Sandbox keys"].map((chip) => (
              <span key={chip} className="font-mono text-[10px] tracking-widest uppercase font-semibold px-2.5 py-1 rounded-full border border-[#1D211F]/15 text-[#1D211F]/70 hover:border-[#2E4A3F]/60 hover:text-[#2E4A3F] transition-colors duration-300 cursor-default">
                {chip}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
