"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Bot,
  ArrowLeft,
  Mail,
  Clock,
  Shield,
  CreditCard,
  AlertTriangle,
  FileText,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: "easeOut" },
  }),
};

const contacts = [
  {
    icon: Mail,
    color: "#2E4A3F",
    label: "General",
    title: "hello@leapcrew.ai",
    href: "mailto:hello@leapcrew.ai",
    desc: "Product questions, onboarding, and partnership enquiries.",
  },
  {
    icon: CreditCard,
    color: "#D05E3C",
    label: "Billing",
    title: "billing@leapcrew.ai",
    href: "mailto:billing@leapcrew.ai",
    desc: "Invoice requests, plan changes, refunds, and payment issues.",
  },
  {
    icon: Shield,
    color: "#1D211F",
    label: "Legal & Compliance",
    title: "legal@leapcrew.ai",
    href: "mailto:legal@leapcrew.ai",
    desc: "DPDP compliance, data processing agreements, and legal notices.",
  },
  {
    icon: AlertTriangle,
    color: "#8B5E3C",
    label: "Security Disclosure",
    title: "security@leapcrew.ai",
    href: "mailto:security@leapcrew.ai",
    desc: "Responsible vulnerability disclosure. Acknowledged within 24 hours.",
  },
  {
    icon: FileText,
    color: "#5C6E5B",
    label: "Grievance Officer",
    title: "grievance@leapcrew.ai",
    href: "mailto:grievance@leapcrew.ai",
    desc: "India DPDP Act grievance redressal. Formally designated officer.",
  },
];

const subjects = ["General", "Billing", "Technical", "Partnership", "Press"];

export default function ContactPage() {
  const [selectedSubject, setSelectedSubject] = useState("General");
  const [showTooltip, setShowTooltip] = useState(false);

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
            <Mail className="w-3.5 h-3.5 text-[#D05E3C]" />
            <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/60 uppercase font-bold">[ CONTACT ]</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.04]">
            Get in touch.
          </h1>

          <p className="text-[#1D211F]/65 text-base sm:text-lg leading-relaxed max-w-2xl font-medium">
            We&apos;re a small, focused team. Every email reaches a real person who can actually help.
          </p>

          <div className="flex items-center gap-3 pt-1">
            <Clock className="w-4 h-4 text-[#2E4A3F]" />
            <span className="text-sm text-[#1D211F]/60 font-medium">
              Mon–Fri, 10:00 AM – 7:00 PM IST &nbsp;·&nbsp; Response within 1 business day
            </span>
          </div>
        </motion.div>
      </section>

      {/* Contact Cards Grid */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 space-y-3"
        >
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ CONTACT ADDRESSES ]</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-[#1D211F]">
            Reach the right{" "}
            <span className="italic text-[#2E4A3F]">team.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.label}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
              >
                <a
                  href={c.href}
                  className="group border border-[#1D211F]/10 hover:border-[#1D211F]/30 rounded-md p-6 flex flex-col gap-4 transition-all duration-300 hover:bg-white h-full block"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: c.color + "15", border: `1px solid ${c.color}25` }}
                    >
                      <Icon className="w-4.5 h-4.5" style={{ color: c.color }} />
                    </div>
                    <span className="font-mono text-[9px] tracking-widest text-[#1D211F]/30 uppercase font-bold border border-[#1D211F]/8 px-2 py-0.5 rounded">{c.label}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="font-mono text-sm font-bold text-[#1D211F] group-hover:text-[#D05E3C] transition-colors break-all">{c.title}</div>
                    <p className="text-[#1D211F]/55 text-xs leading-relaxed font-medium">{c.desc}</p>
                  </div>
                </a>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Support Hours */}
      <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#1D211F]/8 border border-[#1D211F]/8"
        >
          {[
            { label: "Support hours", value: "Mon–Fri, 10 AM – 7 PM IST" },
            { label: "Response time", value: "Within 1 business day" },
            { label: "Emergency security", value: "24h acknowledgement" },
          ].map((item) => (
            <div key={item.label} className="bg-[#FAF7F2] p-7 space-y-2">
              <div className="font-mono text-[9px] tracking-widest text-[#1D211F]/35 uppercase">{item.label}</div>
              <div className="font-serif text-xl font-light text-[#1D211F]">{item.value}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Contact Form */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-4 space-y-4"
          >
            <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ CONTACT FORM ]</span>
            <h2 className="font-serif text-3xl font-light text-[#1D211F]">
              Send us a{" "}
              <span className="italic text-[#2E4A3F]">message.</span>
            </h2>
            <p className="text-[#1D211F]/60 text-sm leading-relaxed font-medium">
              The form is coming soon. In the meantime, please email us directly at{" "}
              <a href="mailto:hello@leapcrew.ai" className="text-[#D05E3C] hover:underline font-semibold">hello@leapcrew.ai</a>.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded text-amber-700 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Clock className="w-3 h-3" />
              Form coming soon
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-8"
          >
            <div className="border border-[#1D211F]/10 rounded-md p-8 space-y-6 bg-white/40">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] tracking-widest text-[#1D211F]/50 uppercase font-bold">Name</label>
                  <input
                    type="text"
                    disabled
                    placeholder="Your name"
                    className="w-full border border-[#1D211F]/10 bg-[#FAF7F2] rounded px-4 py-3 text-sm text-[#1D211F]/40 placeholder:text-[#1D211F]/25 font-medium cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] tracking-widest text-[#1D211F]/50 uppercase font-bold">Email</label>
                  <input
                    type="email"
                    disabled
                    placeholder="you@company.com"
                    className="w-full border border-[#1D211F]/10 bg-[#FAF7F2] rounded px-4 py-3 text-sm text-[#1D211F]/40 placeholder:text-[#1D211F]/25 font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] tracking-widest text-[#1D211F]/50 uppercase font-bold">Subject</label>
                <div className="relative">
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    disabled
                    className="w-full appearance-none border border-[#1D211F]/10 bg-[#FAF7F2] rounded px-4 py-3 text-sm text-[#1D211F]/40 font-medium cursor-not-allowed pr-10"
                  >
                    {subjects.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1D211F]/25 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] tracking-widest text-[#1D211F]/50 uppercase font-bold">Message</label>
                <textarea
                  disabled
                  rows={5}
                  placeholder="Tell us what's on your mind..."
                  className="w-full border border-[#1D211F]/10 bg-[#FAF7F2] rounded px-4 py-3 text-sm text-[#1D211F]/40 placeholder:text-[#1D211F]/25 font-medium resize-none cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] font-mono text-[#1D211F]/35 uppercase tracking-wider">
                  Form coming soon — email us directly
                </p>
                <div className="relative">
                  <button
                    disabled
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="inline-flex items-center gap-2 bg-[#1D211F]/20 text-[#1D211F]/40 px-6 py-3 rounded-md text-sm font-bold tracking-wide cursor-not-allowed select-none"
                  >
                    Send Message
                  </button>
                  {showTooltip && (
                    <div className="absolute bottom-full right-0 mb-2 bg-[#1D211F] text-[#FAF7F2] text-[10px] font-mono px-3 py-1.5 rounded whitespace-nowrap">
                      Coming soon — email us instead
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
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
