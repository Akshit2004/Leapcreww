"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Bot,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Users,
  Key,
  Webhook,
  FileText,
  Server,
  AlertTriangle,
  Check,
} from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: "easeOut" },
  }),
};

const measures = [
  {
    icon: Lock,
    color: "#2E4A3F",
    title: "Data Encryption",
    label: "AT REST + IN TRANSIT",
    bullets: [
      "AES-256-GCM encryption for all secrets stored at rest (Meta access tokens, webhook signing secrets)",
      "TLS 1.2+ enforced on all connections — no unencrypted traffic accepted",
      "Encryption keys managed via environment-separated configuration",
      "No plaintext secrets ever written to application logs",
    ],
  },
  {
    icon: Users,
    color: "#D05E3C",
    title: "Multi-Tenant Isolation",
    label: "ZERO CROSS-TENANT ACCESS",
    bullets: [
      "Every database query is scoped by organizationId — no query can access another tenant's data",
      "API middleware validates organization membership on every authenticated request",
      "Chatbot nodes, contacts, templates, campaigns — all row-level isolated by tenant",
      "No shared mutable state between workspace instances",
    ],
  },
  {
    icon: Key,
    color: "#1D211F",
    title: "API Authentication",
    label: "HASHED KEYS + SCOPED PERMISSIONS",
    bullets: [
      "API keys stored as bcrypt hashes — the raw key is never stored after issuance",
      "Scoped permission model: read-only vs read-write vs admin keys",
      "Sandbox (wf_test_) and live key separation for pre-production safety",
      "Keys can be rotated or revoked instantly via the dashboard or API",
    ],
  },
  {
    icon: Webhook,
    color: "#8B5E3C",
    title: "Webhook Signing",
    label: "HMAC-SHA256 SIGNATURES",
    bullets: [
      "All outbound webhook deliveries are signed with HMAC-SHA256",
      "Signature delivered in the x-leapcrew-signature header for verification",
      "Replay attack protection via timestamp validation window",
      "Exponential backoff retry with delivery logging per endpoint",
    ],
  },
  {
    icon: ShieldCheck,
    color: "#5C6E5B",
    title: "Secret Management",
    label: "ENCRYPTED AT REST",
    bullets: [
      "Meta access tokens encrypted at rest with AES-256-GCM before database write",
      "Webhook secrets similarly encrypted — never exposed in API responses",
      "Decryption occurs only in-memory, in the server runtime context",
      "Environment variables for encryption keys are never committed to version control",
    ],
  },
  {
    icon: FileText,
    color: "#2E4A3F",
    title: "Audit Logging",
    label: "STRUCTURED + SCOPED",
    bullets: [
      "Every significant platform action is written to SystemLog with organizationId scope",
      "Structured JSON log format — queryable, parseable, and exportable",
      "Logs include actor, action, resource type, resource ID, and timestamp",
      "No cross-tenant log visibility — each organization sees only its own audit trail",
    ],
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1D211F] flex flex-col font-sans overflow-x-hidden selection:bg-[#2E4A3F] selection:text-[#FAF7F2]">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#1D211F]/8">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#1D211F] flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#FAF7F2]" />
            </div>
            <span className="font-sans font-extrabold text-xl tracking-tight text-[#1D211F]">LeapCrew AI</span>
          </Link>
          <Link href="/" className="border border-[#1D211F]/15 hover:border-[#1D211F]/60 text-[#1D211F]/70 hover:text-[#1D211F] text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-md flex items-center gap-2 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" /><span>Home</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-40 pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-4xl space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#1D211F]/12 rounded-full select-none">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D05E3C]" />
            <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/60 uppercase font-bold">[ SECURITY POSTURE ]</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.04]">
            Security{" "}
            <span className="italic text-[#2E4A3F]">by design.</span>
          </h1>

          <p className="text-[#1D211F]/65 text-base sm:text-lg leading-relaxed max-w-2xl font-medium">
            Multi-tenant isolation, AES-256-GCM encryption at rest, HMAC-SHA256 signed webhooks, and hashed API keys. Security is an engineering constraint at LeapCrew AI — not an afterthought.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {["AES-256-GCM AT REST", "TLS 1.2+ IN TRANSIT", "HMAC-SHA256 WEBHOOKS", "BCRYPT API KEYS"].map((badge) => (
              <span key={badge} className="inline-flex items-center gap-1.5 bg-[#2E4A3F]/8 border border-[#2E4A3F]/20 text-[#2E4A3F] text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded">
                <Check className="w-2.5 h-2.5" />
                {badge}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Security Measures Grid */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 space-y-3"
        >
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ SECURITY MEASURES ]</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-[#1D211F]">
            How we protect{" "}
            <span className="italic text-[#2E4A3F]">your data.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1D211F]/8 border border-[#1D211F]/8">
          {measures.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                className="bg-[#FAF7F2] hover:bg-white p-8 space-y-5 transition-colors duration-300 group"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-11 h-11 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: m.color + "15", border: `1px solid ${m.color}25` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: m.color }} />
                  </div>
                  <span className="font-mono text-[8px] tracking-widest text-[#1D211F]/30 uppercase font-bold border border-[#1D211F]/8 px-2 py-0.5 rounded text-right max-w-[120px] leading-tight">{m.label}</span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-xl font-light text-[#1D211F] group-hover:text-[#2E4A3F] transition-colors">{m.title}</h3>
                </div>
                <ul className="space-y-2">
                  {m.bullets.map((b, bi) => (
                    <li key={bi} className="flex items-start gap-2.5 text-xs text-[#1D211F]/65 font-medium leading-relaxed">
                      <Check className="w-3 h-3 text-[#2E4A3F] shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Responsible Disclosure */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 space-y-4"
          >
            <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ VULNERABILITY DISCLOSURE ]</span>
            <h2 className="font-serif text-3xl font-light text-[#1D211F]">
              Responsible{" "}
              <span className="italic text-[#2E4A3F]">disclosure.</span>
            </h2>
            <p className="text-[#1D211F]/65 text-sm leading-relaxed font-medium">
              Found a security vulnerability? We take security reports seriously. Please disclose responsibly — we commit to working with you, not against you.
            </p>
            <a
              href="mailto:security@leapcrew.ai"
              className="inline-flex items-center gap-2 bg-[#1D211F] text-[#FAF7F2] px-5 py-3 rounded-md text-sm font-bold tracking-wide hover:bg-[#2E4A3F] transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              security@leapcrew.ai
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-7"
          >
            <div className="border border-[#1D211F]/10 rounded-md divide-y divide-[#1D211F]/8">
              {[
                { num: "01", title: "Acknowledge within 24h", desc: "We will confirm receipt of your report and assign an internal tracking reference within 24 hours of receiving your email." },
                { num: "02", title: "Investigate within 72h", desc: "Our engineering team will reproduce and assess the severity of the reported issue within 72 hours, and communicate initial findings to you." },
                { num: "03", title: "Fix critical issues within 7 days", desc: "Critical severity vulnerabilities (CVSS 9.0+) will be patched and deployed within 7 calendar days. We will notify you when the fix is live." },
              ].map((item) => (
                <div key={item.num} className="p-6 flex gap-5 items-start">
                  <span className="font-mono text-[10px] text-[#D05E3C] font-bold shrink-0 mt-0.5">{item.num}</span>
                  <div className="space-y-1">
                    <div className="font-serif text-base font-light text-[#1D211F]">{item.title}</div>
                    <p className="text-xs text-[#1D211F]/60 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 space-y-3"
        >
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ INFRASTRUCTURE ]</span>
          <h2 className="font-serif text-3xl font-light text-[#1D211F]">
            Built on a{" "}
            <span className="italic text-[#2E4A3F]">secure foundation.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Server, color: "#2E4A3F", title: "PostgreSQL with encrypted storage", desc: "Primary database with AES-256 encryption at the field level for sensitive columns. Automated backups with encrypted storage." },
            { icon: Lock, color: "#D05E3C", title: "HTTPS everywhere", desc: "TLS 1.2+ enforced on all endpoints. HTTPS Strict Transport Security (HSTS) headers set on all responses. No HTTP fallback." },
            { icon: Key, color: "#1D211F", title: "Environment-separated secrets", desc: "Production, staging, and sandbox environments use fully independent credentials. No shared secrets across environments." },
            { icon: ShieldCheck, color: "#5C6E5B", title: "No debug endpoints in production", desc: "All development tooling, introspection endpoints, and debug middleware are disabled in the production build. No verbose error leakage." },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="border border-[#1D211F]/10 rounded-md p-6 flex gap-4 items-start"
              >
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: item.color + "12", border: `1px solid ${item.color}20` }}
                >
                  <Icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <div className="space-y-1">
                  <div className="font-serif text-base font-light text-[#1D211F]">{item.title}</div>
                  <p className="text-xs text-[#1D211F]/60 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#171A19] text-[#FAF7F2]/60 py-8 px-6 md:px-12 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono">
          <span>© 2026 smritix AI LLP. LeapCrew AI is a product of smritix AI LLP, India.</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/legal/cookies" className="hover:text-white transition-colors">Cookies</Link>
            <Link href="/legal/dpa" className="hover:text-white transition-colors">DPA</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
