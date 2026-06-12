"use client";
import Link from "next/link";

const productLinks = [
  { label: "Shared Inbox", href: "/platform#inbox" },
  { label: "Campaign Broadcasts", href: "/platform#campaigns" },
  { label: "Chatbot Builder", href: "/platform#chatbot" },
  { label: "WhatsApp Flows", href: "/platform#flows" },
  { label: "Drip Sequences", href: "/platform#sequences" },
  { label: "Recipe Marketplace", href: "/platform#recipes" },
];

const platformLinks = [
  { label: "Public API", href: "/platform/api" },
  { label: "Outbound Webhooks", href: "/platform/webhooks" },
  { label: "Integrations Hub", href: "/platform/integrations" },
  { label: "Documentation", href: "/docs" },
  { label: "Changelog", href: "/changelog" },
  { label: "System Status", href: "/status" },
];

const legalLinks = [
  { label: "About smritix AI LLP", href: "/about" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Cookie Policy", href: "/legal/cookies" },
  { label: "Refund Policy", href: "/legal/refund" },
  { label: "Data Processing Agreement", href: "/legal/dpa" },
  { label: "Contact", href: "/contact" },
  { label: "Security", href: "/security" },
];

export default function Footer() {
  return (
    <footer className="bg-[#171A19] text-[#FAF7F2]/80 border-t border-[#FAF7F2]/10 pt-16 pb-10 px-6 md:px-12 relative z-10 shrink-0">
      <div className="max-w-7xl mx-auto">

        {/* Main grid: 4 columns on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 pb-14 border-b border-[#FAF7F2]/8">

          {/* Column 1 — Brand (col-span-4) */}
          <div className="lg:col-span-4 space-y-5">
            <div className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/leapcrew-logo.png" alt="LeapCrew AI" className="h-11 w-auto object-contain brightness-0 invert" style={{ maxWidth: 180, background: "none" }} />
            </div>

            <p className="text-[#FAF7F2]/50 text-sm font-medium max-w-xs leading-relaxed">
              WhatsApp Marketing, CRM &amp; Chatbot Automation. A product of smritix AI LLP.
            </p>

            <div className="font-mono text-[10px] tracking-widest text-[#FAF7F2]/30 uppercase">
              [ META VERIFIED BSP PLATFORM ]
            </div>

            <a
              href="mailto:hello@leapcrew.ai"
              className="inline-flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase text-[#FAF7F2]/50 border border-[#FAF7F2]/15 hover:border-[#FAF7F2]/40 hover:text-[#FAF7F2]/80 rounded px-3 py-2 transition-colors"
            >
              hello@leapcrew.ai
            </a>
          </div>

          {/* Columns 2–4 wrapper — 3-column sub-grid */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-8">

            {/* Column 2 — Product */}
            <div className="space-y-3.5">
              <div className="font-mono text-[10px] tracking-widest text-[#FAF7F2]/30 uppercase font-bold">Product</div>
              <ul className="space-y-2.5">
                {productLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-xs font-medium text-[#FAF7F2]/70 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3 — Platform */}
            <div className="space-y-3.5">
              <div className="font-mono text-[10px] tracking-widest text-[#FAF7F2]/30 uppercase font-bold">Platform</div>
              <ul className="space-y-2.5">
                {platformLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-xs font-medium text-[#FAF7F2]/70 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4 — Legal & Company */}
            <div className="space-y-3.5">
              <div className="font-mono text-[10px] tracking-widest text-[#FAF7F2]/30 uppercase font-bold">Legal &amp; Company</div>
              <ul className="space-y-2.5">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-xs font-medium text-[#FAF7F2]/70 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-[10px] text-[#FAF7F2]/30 font-mono leading-relaxed">
            &copy; 2026 smritix AI LLP. LeapCrew AI is a registered product of smritix AI LLP, India.
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-[#FAF7F2]/50 font-mono">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/legal/cookies" className="hover:text-white transition-colors">Cookies</Link>
            <Link href="/legal/dpa" className="hover:text-white transition-colors">DPA</Link>
            <Link href="/security" className="hover:text-white transition-colors">Security</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
