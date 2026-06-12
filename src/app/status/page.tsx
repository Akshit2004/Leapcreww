"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Bot,
  ArrowLeft,
  CheckCircle2,
  Activity,
  Calendar,
  Bell,
  Zap,
  Database,
  Webhook,
  Code2,
  Globe,
  Server,
} from "lucide-react";
import { useState } from "react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: "easeOut" },
  }),
};

type ServiceStatus = "operational" | "degraded" | "outage";

const services: { icon: React.ElementType; name: string; status: ServiceStatus; latency: string }[] = [
  { icon: MessageSquareIcon, name: "WhatsApp API Gateway", status: "operational", latency: "128ms" },
  { icon: Zap, name: "Campaign Broadcast Engine", status: "operational", latency: "145ms" },
  { icon: Webhook, name: "Webhook Delivery", status: "operational", latency: "92ms" },
  { icon: Code2, name: "REST API (v1)", status: "operational", latency: "87ms" },
  { icon: Globe, name: "Dashboard Web App", status: "operational", latency: "210ms" },
  { icon: Database, name: "PostgreSQL Database", status: "operational", latency: "12ms" },
  { icon: Server, name: "AI Autoresponder (Groq)", status: "operational", latency: "342ms" },
];

function MessageSquareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const statusConfig: Record<ServiceStatus, { label: string; dot: string; text: string; bg: string }> = {
  operational: { label: "Operational", dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  degraded: { label: "Degraded", dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  outage: { label: "Outage", dot: "bg-red-400", text: "text-red-700", bg: "bg-red-50 border-red-200" },
};

const uptimeStats = [
  { label: "30-day uptime", value: "99.9%" },
  { label: "Avg API response", value: "142ms" },
  { label: "Incidents this month", value: "0" },
];

export default function StatusPage() {
  const [email, setEmail] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);

  const allOperational = services.every((s) => s.status === "operational");

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
          className="max-w-4xl space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#1D211F]/12 rounded-full select-none">
            <Activity className="w-3.5 h-3.5 text-[#D05E3C]" />
            <span className="font-mono text-[10px] tracking-widest text-[#1D211F]/60 uppercase font-bold">[ OPERATIONAL STATUS ]</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.04]">
            System Status.
          </h1>

          {/* Global status indicator */}
          {allOperational ? (
            <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-md px-5 py-3.5">
              <div className="relative">
                <span className="block w-3 h-3 rounded-full bg-emerald-400" />
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
              </div>
              <span className="font-serif text-xl font-light text-emerald-800">All Systems Operational</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-md px-5 py-3.5">
              <span className="block w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-serif text-xl font-light text-amber-800">Partial Service Degradation</span>
            </div>
          )}

          <p className="text-[#1D211F]/55 text-sm font-mono tracking-widest uppercase">
            Last updated: June 11, 2026 · 10:00 AM IST
          </p>
        </motion.div>
      </section>

      {/* Service Status Grid */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 space-y-3"
        >
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ SERVICE HEALTH ]</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-[#1D211F]">
            Service{" "}
            <span className="italic text-[#2E4A3F]">components.</span>
          </h2>
        </motion.div>

        <div className="border border-[#1D211F]/10 rounded-md divide-y divide-[#1D211F]/8">
          {services.map((service, i) => {
            const Icon = service.icon;
            const cfg = statusConfig[service.status];
            return (
              <motion.div
                key={service.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                variants={fadeUp}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-white/50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-[#1D211F]/5 border border-[#1D211F]/8 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#1D211F]/60" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-serif text-sm font-light text-[#1D211F] truncate">{service.name}</div>
                    <div className="font-mono text-[9px] text-[#1D211F]/35 uppercase tracking-wider mt-0.5">{service.latency} avg</div>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-1.5 border px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-widest shrink-0 ${cfg.bg} ${cfg.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${service.status === 'operational' ? 'animate-pulse' : ''}`} />
                  {cfg.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Uptime Stats */}
      <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ 30-DAY METRICS ]</span>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#1D211F]/8 border border-[#1D211F]/8">
          {uptimeStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="bg-[#FAF7F2] p-8 space-y-2"
            >
              <div className="font-mono text-[9px] tracking-widest text-[#1D211F]/35 uppercase">{stat.label}</div>
              <div className="font-serif text-4xl font-light text-[#1D211F]">{stat.value}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent Incidents */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 space-y-3"
        >
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ INCIDENT HISTORY ]</span>
          <h2 className="font-serif text-3xl font-light text-[#1D211F]">
            Recent{" "}
            <span className="italic text-[#2E4A3F]">incidents.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="border border-[#1D211F]/10 rounded-md p-12 flex flex-col items-center justify-center text-center gap-4"
        >
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <div className="font-serif text-xl font-light text-[#1D211F]">No incidents in the past 30 days</div>
            <p className="text-[#1D211F]/50 text-sm font-medium">All services have been operating within normal parameters since May 12, 2026.</p>
          </div>
        </motion.div>
      </section>

      {/* Maintenance Notice */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="py-12 px-6 md:px-12 max-w-7xl mx-auto w-full border-b border-[#1D211F]/8"
      >
        <div className="flex items-start gap-4 bg-[#FAF7F2] border border-[#1D211F]/10 rounded-md p-6">
          <div className="w-10 h-10 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
            <Calendar className="w-4.5 h-4.5 text-amber-600" />
          </div>
          <div className="space-y-1">
            <div className="font-mono text-[9px] tracking-widest text-amber-600 uppercase font-bold">[ SCHEDULED MAINTENANCE ]</div>
            <p className="text-sm text-[#1D211F]/70 font-medium leading-relaxed">
              Scheduled maintenance windows are announced <strong className="text-[#1D211F]">48 hours in advance</strong> via email notification to account administrators and an in-app banner in the LeapCrew AI dashboard. No unannounced maintenance is performed during business hours (IST).
            </p>
          </div>
        </div>
      </motion.section>

      {/* Subscribe Section */}
      <section className="py-20 px-6 md:px-12 bg-[#1D211F] text-[#FAF7F2]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8"
        >
          <div className="space-y-3">
            <span className="font-mono text-[10px] tracking-widest text-[#FAF7F2]/35 uppercase font-bold">[ STATUS UPDATES ]</span>
            <h2 className="font-serif text-3xl font-light">
              Get status{" "}
              <span className="italic text-[#D05E3C]">updates.</span>
            </h2>
            <p className="text-[#FAF7F2]/55 text-sm font-medium max-w-md">
              Be the first to know about incidents, maintenance windows, and service restorations. Email notifications coming soon.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled
                placeholder="you@company.com"
                className="w-full sm:w-64 bg-[#FAF7F2]/8 border border-[#FAF7F2]/15 rounded-md px-4 py-3 text-sm text-[#FAF7F2]/40 placeholder:text-[#FAF7F2]/25 font-medium cursor-not-allowed"
              />
            </div>
            <div className="relative shrink-0">
              <button
                disabled
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="inline-flex items-center gap-2 bg-[#FAF7F2]/15 text-[#FAF7F2]/40 px-5 py-3 rounded-md text-sm font-bold tracking-wide cursor-not-allowed border border-[#FAF7F2]/10"
              >
                <Bell className="w-4 h-4" />
                Subscribe
              </button>
              {showTooltip && (
                <div className="absolute bottom-full right-0 mb-2 bg-[#FAF7F2] text-[#1D211F] text-[10px] font-mono px-3 py-1.5 rounded whitespace-nowrap">
                  Coming soon
                </div>
              )}
            </div>
          </div>
        </motion.div>
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
