"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bot,
  ArrowLeft,
  ArrowRight,
  Webhook,
  Activity,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Settings,
} from "lucide-react";

const events = [
  { type: "message.received",  trigger: "Inbound WhatsApp message from a contact" },
  { type: "message.status",    trigger: "Delivery status update — sent, delivered, or read" },
  { type: "order.placed",      trigger: "Native WhatsApp catalog order submitted" },
  { type: "contact.created",   trigger: "New contact created via webhook, flow, or import" },
];

const retrySchedule = [
  { attempt: "1st",  delay: "Immediate",  note: "Delivered at event time" },
  { attempt: "2nd",  delay: "+1 minute",  note: "First retry window" },
  { attempt: "3rd",  delay: "+4 minutes", note: "Exponential backoff" },
  { attempt: "4th",  delay: "+16 minutes",note: "Extended retry" },
  { attempt: "5th",  delay: "+64 minutes",note: "Final attempt" },
  { attempt: "—",    delay: "Marked failed", note: "Webhook disabled after 5 consecutive failures" },
];

const hmacCode = `const crypto = require('crypto');

// Retrieve the signature from the request header
const sig = req.headers['x-leapcrew-signature'];

// Compute the expected HMAC-SHA256 signature
const expected = 'sha256=' + crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(req.rawBody)   // raw, unparsed body bytes
  .digest('hex');

// Reject requests with invalid signatures
if (!crypto.timingSafeEqual(
  Buffer.from(sig),
  Buffer.from(expected)
)) {
  return res.status(401).json({ error: 'Invalid signature' });
}

// Safe to process the event
const event = JSON.parse(req.rawBody);`;

const payloadExample = `{
  "id":        "evt_01J9XM7PV4BQRSP8WDCN7HGF2",
  "type":      "message.received",
  "created":   "2026-06-11T09:22:11Z",
  "data": {
    "message_id": "wamid.HBgNOTE5OD...",
    "from":        "+919876543210",
    "contact_id":  "cust_wP9K3xzFG",
    "body":        "I want to know more about your plan",
    "type":        "text"
  }
}`;

const steps = [
  {
    num: "01",
    icon: Activity,
    title: "Event fires in LeapCrew AI",
    desc: "A message is received, a contact is created, an order is placed, or a delivery status changes.",
    accent: "#D05E3C",
  },
  {
    num: "02",
    icon: Webhook,
    title: "Signed POST within 500ms",
    desc: "The platform constructs a JSON payload, signs it with HMAC-SHA256, and dispatches the HTTP POST to your endpoint.",
    accent: "#2E4A3F",
  },
  {
    num: "03",
    icon: RefreshCw,
    title: "Retry with exponential backoff",
    desc: "If your server responds with anything other than 2xx, we retry up to 5 times with increasing delays before marking the delivery failed.",
    accent: "#1D211F",
  },
];

export default function WebhooksPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1D211F] flex flex-col font-sans overflow-x-hidden selection:bg-[#2E4A3F] selection:text-[#FAF7F2]">

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#1D211F]/8">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#1D211F] flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#FAF7F2]" />
            </div>
            <span className="font-sans font-extrabold text-xl tracking-tight text-[#1D211F]">LeapCrew AI</span>
          </Link>
          <Link
            href="/"
            className="border border-[#1D211F]/15 hover:border-[#1D211F]/60 text-[#1D211F]/70 hover:text-[#1D211F] text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-md flex items-center gap-2 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /><span>Home</span>
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-40 pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-3xl space-y-7"
        >
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 border border-[#1D211F]/12 rounded-full select-none">
            <Webhook className="w-3.5 h-3.5 text-[#D05E3C]" />
            <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/60 uppercase font-bold">[ OUTBOUND WEBHOOKS ]</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.04]">
            Real-time event delivery{" "}
            <span className="italic text-[#2E4A3F]">to your systems.</span>
          </h1>

          <p className="text-[#1D211F]/65 text-base sm:text-lg leading-relaxed font-medium">
            Subscribe to platform events and receive signed HTTP POSTs within 500ms.
            HMAC-SHA256 verification, automatic retries with exponential backoff, and a complete
            delivery log in your dashboard.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/platform/integrations"
              className="inline-flex items-center gap-2 bg-[#1D211F] text-[#FAF7F2] px-6 py-3 rounded-md text-sm font-bold tracking-wide hover:bg-[#2E4A3F] transition-colors"
            >
              All Integrations <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/platform/api"
              className="inline-flex items-center gap-2 border border-[#1D211F]/20 text-[#1D211F]/70 hover:text-[#1D211F] hover:border-[#1D211F]/50 px-6 py-3 rounded-md text-sm font-bold tracking-wide transition-all"
            >
              REST API Reference <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-2 mb-12"
        >
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ HOW IT WORKS ]</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light">
            Three steps,{" "}
            <span className="italic text-[#2E4A3F]">sub-second latency.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#1D211F]/10 rounded-md overflow-hidden">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.45 }}
                className={`p-8 space-y-5 bg-[#FAF7F2] hover:bg-white transition-colors ${i < 2 ? "md:border-r border-b md:border-b-0 border-[#1D211F]/10" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-11 h-11 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: step.accent + "12", border: `1px solid ${step.accent}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: step.accent }} />
                  </div>
                  <span className="font-serif text-4xl font-light text-[#1D211F]/8 select-none">{step.num}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-xl font-light text-[#1D211F]">{step.title}</h3>
                  <p className="text-xs text-[#1D211F]/60 leading-relaxed font-medium">{step.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Events Table ── */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ EVENT TYPES ]</span>
              <h2 className="font-serif text-3xl font-light">
                Subscribe to{" "}
                <span className="italic text-[#2E4A3F]">any event.</span>
              </h2>
            </div>

            <div className="border border-[#1D211F]/10 rounded-md overflow-hidden">
              <table className="min-w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-[#1D211F] text-[#FAF7F2]">
                    <th className="px-5 py-3 font-mono text-[9px] tracking-widest uppercase font-bold border-r border-[#FAF7F2]/8">Event Type</th>
                    <th className="px-5 py-3 font-mono text-[9px] tracking-widest uppercase font-bold">Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev, i) => (
                    <tr key={i} className="border-t border-[#1D211F]/8 hover:bg-white transition-colors">
                      <td className="px-5 py-3.5 border-r border-[#1D211F]/8">
                        <code className="font-mono text-[11px] text-[#D05E3C] font-bold">{ev.type}</code>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#1D211F]/60 font-medium">{ev.trigger}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sample Payload */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/40 uppercase font-bold">Sample Payload</span>
              <div className="bg-[#171A19] rounded-md overflow-hidden border border-white/5">
                <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D05E3C]/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/50" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                  <span className="ml-2 font-mono text-[9px] text-white/30 uppercase tracking-widest">message.received</span>
                </div>
                <pre className="p-5 font-mono text-[11px] text-[#FAF7F2]/75 leading-relaxed overflow-x-auto whitespace-pre">
                  {payloadExample}
                </pre>
              </div>
            </div>
          </motion.div>

          {/* Right: Signature verification */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ SIGNATURE VERIFICATION ]</span>
              <h2 className="font-serif text-3xl font-light">
                Verify every{" "}
                <span className="italic text-[#2E4A3F]">delivery.</span>
              </h2>
              <p className="text-[#1D211F]/60 text-sm leading-relaxed font-medium">
                Every POST carries a <code className="font-mono text-xs text-[#D05E3C] bg-[#D05E3C]/8 px-1 rounded">x-leapcrew-signature</code> header.
                Verify it server-side using HMAC-SHA256 with your endpoint secret.
              </p>
            </div>

            <div className="bg-[#171A19] rounded-md overflow-hidden border border-white/5">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D05E3C]/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/50" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                </div>
                <span className="font-mono text-[9px] text-white/30 uppercase tracking-widest">Node.js verification</span>
                <div className="w-12" />
              </div>
              <pre className="p-5 font-mono text-[11px] text-[#FAF7F2]/80 leading-relaxed overflow-x-auto whitespace-pre">
                {hmacCode}
              </pre>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[#2E4A3F]/8 border border-[#2E4A3F]/15 rounded-md">
              <ShieldCheck className="w-4 h-4 text-[#2E4A3F] shrink-0 mt-0.5" />
              <p className="text-xs text-[#1D211F]/65 leading-relaxed font-medium">
                Always compare signatures using <strong className="text-[#1D211F]">timing-safe equality</strong> (<code className="font-mono text-[11px] text-[#D05E3C]">crypto.timingSafeEqual</code>) to prevent timing-based attacks.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Retry Policy ── */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div className="space-y-2">
            <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ RETRY POLICY ]</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-light">
              Five attempts,{" "}
              <span className="italic text-[#2E4A3F]">exponential backoff.</span>
            </h2>
            <p className="text-[#1D211F]/60 text-sm font-medium max-w-2xl">
              If your endpoint returns a non-2xx response or times out (10s limit), we automatically retry with increasing delays.
            </p>
          </div>

          <div className="border border-[#1D211F]/10 rounded-md overflow-hidden">
            <table className="min-w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-[#1D211F] text-[#FAF7F2]">
                  <th className="px-5 py-3 font-mono text-[9px] tracking-widest uppercase font-bold border-r border-[#FAF7F2]/8 w-24">Attempt</th>
                  <th className="px-5 py-3 font-mono text-[9px] tracking-widest uppercase font-bold border-r border-[#FAF7F2]/8 w-36">Delay</th>
                  <th className="px-5 py-3 font-mono text-[9px] tracking-widest uppercase font-bold">Note</th>
                </tr>
              </thead>
              <tbody>
                {retrySchedule.map((row, i) => (
                  <tr key={i} className={`border-t border-[#1D211F]/8 hover:bg-white transition-colors ${i === retrySchedule.length - 1 ? "bg-[#D05E3C]/4" : ""}`}>
                    <td className="px-5 py-3.5 border-r border-[#1D211F]/8">
                      <div className="flex items-center gap-2">
                        {i < retrySchedule.length - 1
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0" />
                          : <AlertCircle className="w-3.5 h-3.5 text-[#D05E3C] shrink-0" />
                        }
                        <span className="font-mono text-xs font-bold text-[#1D211F]">{row.attempt}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 border-r border-[#1D211F]/8 font-mono text-xs text-[#D05E3C] font-bold">{row.delay}</td>
                    <td className="px-5 py-3.5 text-xs text-[#1D211F]/60 font-medium">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      {/* ── Setup CTA ── */}
      <section className="py-20 px-6 md:px-12 bg-[#1D211F] text-[#FAF7F2]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8"
        >
          <div className="space-y-3">
            <span className="font-mono text-[10px] tracking-widest text-[#FAF7F2]/35 uppercase font-bold">[ GET STARTED ]</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-light">
              Configure your first webhook{" "}
              <span className="italic text-[#D05E3C]">in minutes.</span>
            </h2>
            <p className="text-[#FAF7F2]/50 text-sm font-medium max-w-md">
              Navigate to <strong className="text-[#FAF7F2]/80">Settings → Webhooks</strong> in your workspace to add an endpoint and subscribe to events.
            </p>
          </div>
          <Link
            href="/signup"
            className="shrink-0 inline-flex items-center gap-2 bg-[#D05E3C] hover:bg-[#B84E2E] text-white px-8 py-4 rounded-md text-sm font-bold tracking-wide transition-colors"
          >
            <Settings className="w-4 h-4" /> Open Settings
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#171A19] text-[#FAF7F2]/60 py-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono">
          <span>© 2026 smritix AI LLP. LeapCrew AI is a product of smritix AI LLP, India.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/legal/cookies" className="hover:text-white transition-colors">Cookies</Link>
            <Link href="/legal/dpa" className="hover:text-white transition-colors">DPA</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
