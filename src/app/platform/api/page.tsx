"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bot,
  ArrowLeft,
  ArrowRight,
  Key,
  Terminal,
  ShieldCheck,
  FlaskConical,
  ExternalLink,
} from "lucide-react";

const endpoints = [
  { method: "GET",  path: "/api/v1/me",       desc: "Org info for the authenticated key" },
  { method: "POST", path: "/api/v1/messages",  desc: "Send a message or template" },
  { method: "POST", path: "/api/v1/contacts",  desc: "Upsert a contact by phone number" },
  { method: "GET",  path: "/api/v1/contacts",  desc: "Paginated contact list with filters" },
  { method: "POST", path: "/api/v1/leads",     desc: "Capture a lead and deliver its result over WhatsApp" },
  { method: "GET",  path: "/api/v1/templates", desc: "List Meta-approved templates" },
  { method: "GET",  path: "/api/v1/events",    desc: "Poll event stream (cursor-based)" },
  { method: "GET",  path: "/api/v1/openapi",   desc: "OpenAPI 3.1 spec JSON" },
];

const scopes = [
  { scope: "messages:send",    desc: "Send template and session messages" },
  { scope: "contacts:read",    desc: "Read contact list and profiles" },
  { scope: "contacts:write",   desc: "Create and update contacts" },
  { scope: "templates:read",   desc: "List and inspect message templates" },
  { scope: "leads:write",      desc: "Capture leads and trigger result delivery" },
];

const methodColor: Record<string, string> = {
  GET:  "text-[#2E4A3F] bg-[#2E4A3F]/10 border-[#2E4A3F]/20",
  POST: "text-[#D05E3C] bg-[#D05E3C]/10 border-[#D05E3C]/20",
};

const curlExample = `curl -X POST https://app.leapcrew.ai/api/v1/messages \\
  -H "Authorization: Bearer wf_live_••••••••••••" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-1234" \\
  -d '{
    "to": "+919876543210",
    "template": "cart_recovery",
    "variables": {
      "product_name": "Running Shoes",
      "cart_link": "https://yourstore.com/cart/abc"
    }
  }'`;

const curlResponse = `{
  "id": "msg_01J9XKZTV4BQRSP8WDCN7HGF2",
  "status": "queued",
  "to": "+919876543210",
  "template": "cart_recovery",
  "created_at": "2026-06-11T08:14:33Z"
}`;

export default function ApiReferencePage() {
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
            <Terminal className="w-3.5 h-3.5 text-[#D05E3C]" />
            <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/60 uppercase font-bold">[ REST API v1 ]</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.04]">
            Every feature,{" "}
            <span className="italic text-[#2E4A3F]">also an API.</span>
          </h1>

          <p className="text-[#1D211F]/65 text-base sm:text-lg leading-relaxed font-medium">
            Scoped API keys, sandbox mode with <code className="font-mono text-[#D05E3C] text-sm bg-[#D05E3C]/8 px-1.5 py-0.5 rounded">wf_test_</code> prefixes,
            idempotency headers, and a cursor-based event stream. Build integrations that behave exactly like the dashboard.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/api-docs"
              className="inline-flex items-center gap-2 bg-[#1D211F] text-[#FAF7F2] px-6 py-3 rounded-md text-sm font-bold tracking-wide hover:bg-[#2E4A3F] transition-colors"
            >
              Interactive Scalar Docs <ExternalLink className="w-4 h-4" />
            </Link>
            <Link
              href="/platform"
              className="inline-flex items-center gap-2 border border-[#1D211F]/20 text-[#1D211F]/70 hover:text-[#1D211F] hover:border-[#1D211F]/50 px-6 py-3 rounded-md text-sm font-bold tracking-wide transition-all"
            >
              Platform overview <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Endpoint Table ── */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div className="space-y-2">
            <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ ENDPOINT REFERENCE ]</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-light">
              All endpoints,{" "}
              <span className="italic text-[#2E4A3F]">at a glance.</span>
            </h2>
          </div>

          <div className="overflow-x-auto border border-[#1D211F]/10 rounded-md">
            <table className="min-w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-[#1D211F] text-[#FAF7F2]">
                  <th className="px-5 py-3.5 font-mono text-[10px] tracking-widest uppercase font-bold border-r border-[#FAF7F2]/8 w-20">Method</th>
                  <th className="px-5 py-3.5 font-mono text-[10px] tracking-widest uppercase font-bold border-r border-[#FAF7F2]/8">Endpoint</th>
                  <th className="px-5 py-3.5 font-mono text-[10px] tracking-widest uppercase font-bold">Description</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep, i) => (
                  <tr
                    key={i}
                    className="border-t border-[#1D211F]/8 hover:bg-white transition-colors"
                  >
                    <td className="px-5 py-3.5 border-r border-[#1D211F]/8">
                      <span className={`inline-block font-mono text-[10px] font-bold tracking-widest px-2 py-0.5 border rounded ${methodColor[ep.method]}`}>
                        {ep.method}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 border-r border-[#1D211F]/8 font-mono text-xs text-[#1D211F]/85 font-medium">
                      {ep.path}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#1D211F]/65 font-medium">
                      {ep.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      {/* ── Auth Section ── */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

          {/* Left: auth explainer */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ AUTHENTICATION ]</span>
              <h2 className="font-serif text-3xl font-light">
                Bearer tokens{" "}
                <span className="italic text-[#2E4A3F]">with scopes.</span>
              </h2>
            </div>

            <p className="text-[#1D211F]/65 text-sm leading-relaxed font-medium">
              Generate API keys from <strong className="text-[#1D211F]">Settings → API Keys</strong>.
              Each key carries explicit scopes, limiting what it can access. Rotate keys instantly without downtime.
            </p>

            {/* Key format */}
            <div className="bg-[#1D211F] rounded-md p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-[#D05E3C]" />
                <span className="font-mono text-[9px] text-[#FAF7F2]/40 uppercase tracking-widest">Key Format</span>
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-[#FAF7F2]/35 w-20 shrink-0">Production</span>
                  <code className="text-[#D05E3C]">wf_live_••••••••••••••••</code>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#FAF7F2]/35 w-20 shrink-0">Sandbox</span>
                  <code className="text-emerald-400">wf_test_••••••••••••••••</code>
                </div>
              </div>
            </div>

            {/* Scopes table */}
            <div className="space-y-3">
              <p className="font-mono text-[10px] tracking-widest text-[#1D211F]/40 uppercase font-bold">Available Scopes</p>
              <div className="border border-[#1D211F]/10 rounded-md overflow-hidden">
                {scopes.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-5 py-3 text-xs ${i < scopes.length - 1 ? "border-b border-[#1D211F]/8" : ""}`}
                  >
                    <code className="font-mono text-[#D05E3C] text-xs font-bold">{s.scope}</code>
                    <span className="text-[#1D211F]/55 font-medium ml-4 text-right">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: curl example */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ CODE EXAMPLE ]</span>
              <h3 className="font-serif text-2xl font-light">
                Send a message
              </h3>
            </div>

            {/* Terminal — request */}
            <div className="bg-[#171A19] rounded-md overflow-hidden border border-white/5">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D05E3C]/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/50" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                </div>
                <span className="font-mono text-[9px] text-white/30 uppercase tracking-widest">Request</span>
                <div className="w-12" />
              </div>
              <pre className="p-5 font-mono text-[11px] text-[#FAF7F2]/80 leading-relaxed overflow-x-auto whitespace-pre">
                <span className="text-[#FAF7F2]/35"># POST a template message</span>
                {"\n"}{curlExample}
              </pre>
            </div>

            {/* Terminal — response */}
            <div className="bg-[#0F1210] rounded-md overflow-hidden border border-white/5">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-[9px] text-emerald-400/80 uppercase tracking-widest">200 OK</span>
                </div>
                <span className="font-mono text-[9px] text-white/30 uppercase tracking-widest">Response</span>
                <div className="w-12" />
              </div>
              <pre className="p-5 font-mono text-[11px] text-emerald-400/80 leading-relaxed overflow-x-auto whitespace-pre">
                {curlResponse}
              </pre>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Sandbox Mode ── */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <div className="md:col-span-1 space-y-3">
            <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ SANDBOX MODE ]</span>
            <h2 className="font-serif text-3xl font-light">
              Test without{" "}
              <span className="italic text-[#2E4A3F]">side effects.</span>
            </h2>
            <p className="text-[#1D211F]/60 text-sm leading-relaxed font-medium">
              Use <code className="font-mono text-xs text-[#D05E3C] bg-[#D05E3C]/8 px-1.5 py-0.5 rounded">wf_test_</code> keys to simulate the full API without sending real messages or consuming wallet credits.
            </p>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: ShieldCheck, title: "No billing impact", desc: "Sandbox calls are never charged. Wallet balance is unaffected." },
              { icon: FlaskConical, title: "No real sends", desc: "Messages log to your inbox tagged [Sandbox] instead of reaching customers." },
              { icon: Terminal, title: "Same response shape", desc: "Every response is identical to production. Ship code that works on day one." },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="border border-[#1D211F]/10 rounded-md p-5 space-y-3 hover:border-[#1D211F]/30 transition-colors">
                  <div className="w-9 h-9 rounded-md bg-[#1D211F]/5 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-[#1D211F]/60" />
                  </div>
                  <h4 className="font-serif text-base font-light text-[#1D211F]">{item.title}</h4>
                  <p className="text-[11px] text-[#1D211F]/55 leading-relaxed font-medium">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ── Interactive Docs CTA ── */}
      <section className="py-20 px-6 md:px-12 bg-[#1D211F] text-[#FAF7F2]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8"
        >
          <div className="space-y-3">
            <span className="font-mono text-[10px] tracking-widest text-[#FAF7F2]/35 uppercase font-bold">[ INTERACTIVE DOCS ]</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-light">
              Try every endpoint live{" "}
              <span className="italic text-[#D05E3C]">in your browser.</span>
            </h2>
            <p className="text-[#FAF7F2]/50 text-sm font-medium max-w-md">
              Scalar-powered interactive reference with request builder, auto-auth, and response inspector.
            </p>
          </div>
          <Link
            href="/api-docs"
            className="shrink-0 inline-flex items-center gap-2 bg-[#D05E3C] hover:bg-[#B84E2E] text-white px-8 py-4 rounded-md text-sm font-bold tracking-wide transition-colors"
          >
            Open API Docs <ExternalLink className="w-4 h-4" />
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
