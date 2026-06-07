"use client";
import { Bot } from "lucide-react";
import Link from "next/link";

const cols = [
  { head: "Product", items: ["Shared Inbox", "Broadcasts", "Chatbot Builder", "Flows", "Sequences", "Marketplace"] },
  { head: "Platform", items: ["Public API", "Outbound Webhooks", "Integrations Hub", "AI Copilot", "Partner / White-Label"] },
  { head: "Resources", items: ["Documentation", "Changelog", "System Status", "Security Posture", "Pricing & Usage"] },
];

export default function Footer() {
  return (
    <footer className="bg-[#171A19] text-[#FAF7F2]/80 border-t border-[#FAF7F2]/10 pt-16 pb-10 px-6 md:px-12 relative z-10 shrink-0">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-14 border-b border-[#FAF7F2]/8">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-[#FAF7F2]/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-[#FAF7F2]" />
              </div>
              <span className="font-sans font-extrabold tracking-tight text-white text-xl">WappFlow</span>
            </div>
            <p className="text-[#FAF7F2]/45 text-sm font-medium max-w-sm leading-relaxed">Architectural customer communication systems. Secure PostgreSQL deployments with multi-tenant CRM isolation and full event observability.</p>
            <div className="font-mono text-[10px] tracking-widest text-[#FAF7F2]/30 uppercase pt-2">[ Distributed under Meta Cloud API SLAs ]</div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {cols.map((c) => (
              <div key={c.head} className="space-y-3.5">
                <div className="font-mono text-[10px] tracking-widest text-[#FAF7F2]/30 uppercase font-bold">{c.head}</div>
                <ul className="space-y-2.5">
                  {c.items.map((it) => (
                    <li key={it}><a href="#" className="text-xs font-medium text-[#FAF7F2]/75 hover:text-white transition-colors">{it}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="space-y-0.5">
              <div className="text-[10px] font-mono text-[#FAF7F2]/30 uppercase tracking-widest">Environment</div>
              <div className="font-mono text-[11px] text-[#FAF7F2]/80 uppercase">v2.4.0-SaaS // SQL Secure</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] font-mono text-[#FAF7F2]/30 uppercase tracking-widest">Global Status</div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring" />
                <span className="font-mono text-[11px] text-[#FAF7F2]/80 uppercase">Systems Operational</span>
              </div>
            </div>
          </div>
          <div className="flex gap-6 text-[11px] text-[#FAF7F2]/50 font-mono">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <a href="#" className="hover:text-white transition-colors">DPA</a>
          </div>
        </div>

        <p className="pt-6 text-[10px] text-[#FAF7F2]/30 font-mono">© {new Date().getFullYear()} WappFlow Inc. All rights reserved.</p>
      </div>
    </footer>
  );
}
