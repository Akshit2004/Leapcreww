"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bot,
  ArrowLeft,
  ShieldCheck,
  Database,
  Server,
  Check,
  Terminal,
  RefreshCw
} from "lucide-react";

type FlowNode = "transit" | "postgres" | "meta";

export default function PrivacyPage() {
  const [activeNode, setActiveNode] = useState<FlowNode>("transit");
  const [activeSection, setActiveSection] = useState<string>("sec-1");

  const simulationDetails = {
    transit: {
      title: "In-Transit Verification Pipeline",
      subtitle: "REAL-TIME SECURITY ORCHESTRATION",
      desc: "Incoming requests (e.g., from Shopify, WooCommerce, or your bespoke webhooks) are encrypted using TLS 1.3 and validated using dynamic SHA-256 HMAC headers. Payloads are checked and routed entirely in-memory with zero temporary disk writes.",
      badge: "TLS 1.3 SECURE",
      steps: [
        "Dynamic HMAC verification (x-leapcrew-signature header)",
        "Zero temporary storage caching in persistent media",
        "Stateless ingress verification nodes with isolated runtime memory"
      ],
      terminalLogs: [
        "POST /api/v1/webhook [INGRESS STATE: ACTIVE]",
        "Checking HMAC signature header x-leapcrew-signature...",
        "HMAC validated successfully (Time elapsed: 4ms)",
        "Memory allocated to temporary payload array: 24KB",
        "Payload successfully dispatched. Clearing ingress memory buffer."
      ]
    },
    postgres: {
      title: "Isolated PostgreSQL Database Segregation",
      subtitle: "MULTI-TENANT CRYPTOGRAPHIC ISOLATION",
      desc: "Client databases are secured under logical tenant schemas. Row-Level Security (RLS) policies prevent cross-tenant queries. Sensitive access credentials (e.g., Meta access tokens, webhook keys) are encrypted using AES-256-GCM at rest.",
      badge: "AES-256 AT REST",
      steps: [
        "Logical isolation inside postgres cluster under UUID tenant schemas",
        "Dynamic JWT claim validations verifying tenant-level security access",
        "Encrypted backup nodes executed inside localized secure partitions"
      ],
      terminalLogs: [
        "DB_DISPATCH [CLIENT_ID: 9e248a3f-f901-4475]",
        "Executing query with tenant claim: TenantID = 9e248a3...",
        "Row-Level Security (RLS) active. Query records fetched: 1",
        "AES-256 decrypting credential 'META_ACCESS_TOKEN'...",
        "Credential retrieved in secure scope. Task resolved."
      ]
    },
    meta: {
      title: "Direct Meta Cloud API Dispatch",
      subtitle: "SECURE END-TO-END META INTEGRATION",
      desc: "Messages are delivered directly to Meta Cloud API endpoints through verified SSL connections. LeapCrew AI maintains zero-knowledge log indexes, saving only critical transmission metadata needed for campaign delivery statistics.",
      badge: "META CLOUD SLA",
      steps: [
        "HTTP/2 persistent secure channels straight to Meta Cloud Edge",
        "Automatic stripping of client message bodies from storage records",
        "Direct synchronization of transmission ticks (Sent, Delivered, Read)"
      ],
      terminalLogs: [
        "OUTBOUND_ROUTER [META CLOUD API ENGINE]",
        "Constructing meta payload from CRM contacts...",
        "Dispatching broadcast payload (240 messages in batch)",
        "Response status: 200 OK from api.facebook.com/v19.0/waba",
        "Syncing delivery tickers. Broadcast task logged."
      ]
    }
  };

  const sections = [
    {
      id: "sec-1",
      num: "01",
      title: "Information We Collect",
      content: (
        <div className="space-y-4">
          <p>
            LeapCrew AI collects the following categories of information when you use our platform:
          </p>
          <div className="space-y-4">
            <div className="bg-[#FAF7F2] border border-[#1D211F]/10 rounded-lg p-5 space-y-3">
              <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">Account Data</h5>
              <p className="text-xs text-[#1D211F]/80 leading-relaxed">
                Your name, email address, organization name, and billing details (processed by Razorpay) when you register or manage your workspace.
              </p>
            </div>
            <div className="bg-[#FAF7F2] border border-[#1D211F]/10 rounded-lg p-5 space-y-3">
              <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">WhatsApp Contact Data</h5>
              <p className="text-xs text-[#1D211F]/80 leading-relaxed">
                Phone numbers, names, tags, and message history of your CRM contacts — imported by you or synced from external systems (Shopify/WooCommerce). You are the data controller for this data.
              </p>
            </div>
            <div className="bg-[#FAF7F2] border border-[#1D211F]/10 rounded-lg p-5 space-y-3">
              <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">Usage Data</h5>
              <p className="text-xs text-[#1D211F]/80 leading-relaxed">
                Feature interactions, API call counts, campaign delivery statistics, chatbot node usage, and system log activity within your workspace.
              </p>
            </div>
            <div className="bg-[#FAF7F2] border border-[#1D211F]/10 rounded-lg p-5 space-y-3">
              <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">Device &amp; Browser Data</h5>
              <p className="text-xs text-[#1D211F]/80 leading-relaxed">
                Browser type, IP address, and session identifiers collected via authentication cookies for security and session management purposes.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "sec-2",
      num: "02",
      title: "How We Use Information",
      content: (
        <div className="space-y-4">
          <p>
            Information collected is used exclusively for the following purposes:
          </p>
          <ul className="space-y-2 text-xs text-[#1D211F]/80">
            <li className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
              <span><strong>Service Delivery:</strong> Processing WhatsApp campaigns, managing chatbot flows, routing webhooks, and delivering the core platform features.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
              <span><strong>Billing:</strong> Wallet credit management, Razorpay payment processing, and transaction ledger integrity.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
              <span><strong>Product Improvement:</strong> Aggregated, anonymized usage analytics to improve reliability, performance, and features.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
              <span><strong>Communication:</strong> Sending transactional emails (account alerts, billing receipts, critical platform notices). We do not send marketing emails without consent.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
              <span><strong>Security:</strong> Detecting and preventing abuse, unauthorized access, and policy violations.</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: "sec-3",
      num: "03",
      title: "Data Storage & Security",
      content: (
        <div className="space-y-4">
          <p>
            LeapCrew AI implements industry-standard security measures across all data storage layers:
          </p>
          <table className="min-w-full text-xs text-left border-collapse border border-[#1D211F]/8 mt-4">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#1D211F]/8 font-mono text-[9px] uppercase tracking-wider text-[#1D211F]/60">
                <th className="p-3 border-r border-[#1D211F]/8">Layer</th>
                <th className="p-3 border-r border-[#1D211F]/8">Method</th>
                <th className="p-3">Standard</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#1D211F]/8">
                <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C]">Data at Rest</td>
                <td className="p-3 border-r border-[#1D211F]/8 font-medium">PostgreSQL encrypted storage</td>
                <td className="p-3">AES-256-GCM</td>
              </tr>
              <tr className="border-b border-[#1D211F]/8">
                <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C]">Data in Transit</td>
                <td className="p-3 border-r border-[#1D211F]/8 font-medium">All API and web traffic</td>
                <td className="p-3">TLS 1.2+</td>
              </tr>
              <tr className="border-b border-[#1D211F]/8">
                <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C]">Secrets &amp; Tokens</td>
                <td className="p-3 border-r border-[#1D211F]/8 font-medium">Meta tokens, webhook keys</td>
                <td className="p-3">AES-256-GCM encrypted fields</td>
              </tr>
              <tr>
                <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C]">Access Control</td>
                <td className="p-3 border-r border-[#1D211F]/8 font-medium">Multi-tenant isolation</td>
                <td className="p-3">Row-Level Security (RLS) + JWT</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-[#1D211F]/70 leading-relaxed mt-4">
            Data is stored in cloud infrastructure with physical and logical access controls. Only authorized personnel with a documented business need can access production systems.
          </p>
        </div>
      )
    },
    {
      id: "sec-4",
      num: "04",
      title: "Data Sharing",
      content: (
        <div className="space-y-4">
          <p>
            We share your data only with the following third parties, solely to the extent necessary to deliver our service:
          </p>
          <div className="space-y-3 mt-2">
            {[
              {
                name: "Meta Platforms Inc.",
                purpose: "WhatsApp Business Platform — to deliver messages via the WhatsApp Cloud API on your behalf.",
                type: "Sub-Processor"
              },
              {
                name: "Razorpay",
                purpose: "Payment processing for wallet top-ups and subscription billing.",
                type: "Sub-Processor"
              },
              {
                name: "Cloud Hosting Providers",
                purpose: "Infrastructure and database hosting for platform operations.",
                type: "Sub-Processor"
              }
            ].map((p) => (
              <div key={p.name} className="border border-[#1D211F]/8 rounded-lg p-4 space-y-1.5 bg-white">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-sm font-semibold text-[#1D211F]">{p.name}</span>
                  <span className="font-mono text-[8px] text-[#D05E3C] uppercase tracking-wider">{p.type}</span>
                </div>
                <p className="text-xs text-[#1D211F]/70 leading-relaxed">{p.purpose}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#2E4A3F] text-[#FAF7F2] rounded-lg p-4 mt-4">
            <p className="text-xs font-semibold">
              We do NOT sell, rent, or trade your personal data or your customers&apos; data to any third party for advertising or commercial purposes.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "sec-5",
      num: "05",
      title: "Your Rights (GDPR & India IT Act)",
      content: (
        <div className="space-y-4">
          <p>
            Depending on your jurisdiction, you have the following rights over your personal data:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {[
              { right: "Right to Access", desc: "Request a copy of all personal data we hold about you." },
              { right: "Right to Rectification", desc: "Correct inaccurate or incomplete personal data." },
              { right: "Right to Deletion", desc: "Request permanent erasure of your data. Fulfilled within 48 hours of confirmed request." },
              { right: "Right to Portability", desc: "Export your data in structured JSON/CSV formats from the platform dashboard." },
              { right: "Right to Object", desc: "Object to processing based on legitimate interests or direct marketing." },
              { right: "Right to Withdraw Consent", desc: "Withdraw consent at any time where processing is consent-based." }
            ].map((item) => (
              <div key={item.right} className="border border-[#1D211F]/8 rounded-lg p-4 bg-white space-y-1.5">
                <span className="font-mono text-[9px] text-[#D05E3C] font-bold uppercase">[ {item.right} ]</span>
                <p className="text-xs text-[#1D211F]/70 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#FAF7F2] border border-[#1D211F]/10 rounded-lg p-5 mt-4 space-y-2">
            <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">Indian Residents — DPDP Act 2023</h5>
            <p className="text-xs text-[#1D211F]/80 leading-relaxed">
              Users in India have rights under the Information Technology Act 2000 and the Digital Personal Data Protection Act 2023 (DPDP Act). This includes rights to access, correction, and erasure of your personal data. Our designated Grievance Officer for India can be reached at <strong>grievance@leapcrew.ai</strong>.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "sec-6",
      num: "06",
      title: "WhatsApp Data",
      content: (
        <div className="space-y-4">
          <p>
            LeapCrew AI processes WhatsApp contact data (phone numbers, names, message content) on behalf of you — the Organization — to deliver our platform services.
          </p>
          <div className="space-y-3">
            <div className="bg-[#FAF7F2] border border-[#1D211F]/10 rounded-lg p-5 space-y-2">
              <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">Your Responsibility as Data Controller</h5>
              <p className="text-xs text-[#1D211F]/80 leading-relaxed">
                You (the Organization) are the Data Controller for your contacts&apos; data. You are solely responsible for ensuring that all contacts in your CRM have explicitly opted in to receive WhatsApp communications from your business before importing or messaging them.
              </p>
            </div>
            <div className="bg-[#FAF7F2] border border-[#1D211F]/10 rounded-lg p-5 space-y-2">
              <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">Our Role as Data Processor</h5>
              <p className="text-xs text-[#1D211F]/80 leading-relaxed">
                LeapCrew AI acts as a Data Processor. We store and route contact data only as instructed by your workspace configuration. We do not use your contacts&apos; data for any purpose other than delivering the LeapCrew AI service to you. See our <Link href="/legal/dpa" className="text-[#D05E3C] hover:underline">Data Processing Agreement</Link> for full details.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "sec-7",
      num: "07",
      title: "Cookies",
      content: (
        <div className="space-y-4">
          <p>
            LeapCrew AI uses a minimal set of cookies essential to operate the platform. We do not use behavioral tracking cookies or third-party advertising cookies.
          </p>
          <table className="min-w-full text-xs text-left border-collapse border border-[#1D211F]/8 mt-4">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#1D211F]/8 font-mono text-[9px] uppercase tracking-wider text-[#1D211F]/60">
                <th className="p-3 border-r border-[#1D211F]/8">Cookie</th>
                <th className="p-3 border-r border-[#1D211F]/8">Purpose</th>
                <th className="p-3">Lifespan</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#1D211F]/8">
                <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C]">next-auth.session-token</td>
                <td className="p-3 border-r border-[#1D211F]/8 font-medium">Authenticated session management</td>
                <td className="p-3">Session</td>
              </tr>
              <tr className="border-b border-[#1D211F]/8">
                <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C]">next-auth.csrf-token</td>
                <td className="p-3 border-r border-[#1D211F]/8 font-medium">CSRF protection</td>
                <td className="p-3">Session</td>
              </tr>
              <tr>
                <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C]">leapcrew_theme</td>
                <td className="p-3 border-r border-[#1D211F]/8 font-medium">UI preference storage</td>
                <td className="p-3">30 days</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-[#1D211F]/70 mt-2">
            See our full <Link href="/legal/cookies" className="text-[#D05E3C] hover:underline">Cookie Policy</Link> for details on how to manage cookie preferences.
          </p>
        </div>
      )
    },
    {
      id: "sec-8",
      num: "08",
      title: "Data Retention",
      content: (
        <div className="space-y-4">
          <p>
            We retain your data for as long as your account is active and as required to deliver our services:
          </p>
          <ul className="space-y-2 text-xs text-[#1D211F]/80">
            <li className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
              <span><strong>Active account data</strong> is retained while your workspace subscription remains active.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
              <span><strong>Transaction and billing records</strong> are retained for up to 7 years as required by Indian accounting and tax regulations.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
              <span><strong>On account termination</strong>, all workspace data (contacts, campaigns, chatbot nodes, system logs) is permanently deleted within 48 hours of a confirmed deletion request.</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: "sec-9",
      num: "09",
      title: "Children",
      content: (
        <div className="space-y-4">
          <p>
            LeapCrew AI is a business-to-business SaaS platform intended exclusively for organizations and individuals aged 18 and above. We do not knowingly collect or process personal data of anyone under the age of 18.
          </p>
          <p>
            If we become aware that we have inadvertently collected data from a minor, we will delete such data immediately. If you believe we may have collected data from a minor, please contact us at <strong>hello@leapcrew.ai</strong>.
          </p>
        </div>
      )
    },
    {
      id: "sec-10",
      num: "10",
      title: "Changes to This Policy",
      content: (
        <div className="space-y-4">
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements.
          </p>
          <p>
            For material changes — those that significantly affect your rights or how we process your data — we will notify you via:
          </p>
          <ul className="space-y-2 text-xs text-[#1D211F]/80">
            <li className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
              <span><strong>Email notification</strong> to the address registered on your account.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
              <span><strong>In-app banner</strong> displayed prominently when you next log in.</span>
            </li>
          </ul>
          <p className="text-xs text-[#1D211F]/70">
            Continued use of LeapCrew AI after the effective date of any update constitutes acceptance of the revised policy.
          </p>
        </div>
      )
    },
    {
      id: "sec-11",
      num: "11",
      title: "Contact & Grievance Officer",
      content: (
        <div className="space-y-4">
          <p>
            For privacy inquiries, data subject requests, or concerns about how we handle your data, please contact:
          </p>
          <div className="bg-[#1D211F] text-[#FAF7F2] rounded-lg p-6 space-y-4 mt-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#D05E3C]" />
              <span className="font-serif text-sm font-semibold tracking-wide">LeapCrew AI — Privacy &amp; Data Compliance</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-[#FAF7F2]/80">
              <div>
                <span className="text-[#FAF7F2]/45 uppercase text-[9px] tracking-wider block">General Privacy Inquiries</span>
                <span className="font-semibold text-white">hello@leapcrew.ai</span>
              </div>
              <div>
                <span className="text-[#FAF7F2]/45 uppercase text-[9px] tracking-wider block">Grievance Officer (India DPDP Act)</span>
                <span className="font-semibold text-white">grievance@leapcrew.ai</span>
              </div>
            </div>
            <div className="pt-3 border-t border-[#FAF7F2]/10 text-[9px] font-mono text-[#FAF7F2]/40 uppercase tracking-widest">
              smritix AI LLP — India | Response within 72 hours
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1D211F] flex flex-col font-sans overflow-x-hidden selection:bg-[#2E4A3F] selection:text-[#FAF7F2] relative">

      {/* 1. Sticky Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#1D211F]/8 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-md bg-[#1D211F] flex items-center justify-center transition-transform group-hover:scale-102">
              <Bot className="w-5 h-5 text-[#FAF7F2]" />
            </div>
            <span className="font-sans font-extrabold text-xl tracking-tight text-[#1D211F]">LeapCrew AI</span>
          </Link>

          <Link
            href="/"
            className="border border-[#1D211F]/15 hover:border-[#1D211F]/60 text-[#1D211F]/70 hover:text-[#1D211F] text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-md flex items-center gap-2 transition-all duration-300 active:scale-98"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </Link>
        </div>
      </header>

      {/* 2. Typographic Hero Section */}
      <section className="pt-36 pb-16 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 border-b border-[#1D211F]/8">
        <div className="max-w-3xl space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D05E3C]/20 bg-[#D05E3C]/5 select-none">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D05E3C]" />
            <span className="font-mono text-[9px] tracking-widest text-[#D05E3C] uppercase font-bold">Absolute System Integrity</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.05] text-[#1D211F]">
            Data sovereignty, <span className="italic font-normal text-[#2E4A3F]">engineered with absolute integrity.</span>
          </h1>

          <p className="text-[#1D211F]/70 text-sm sm:text-base leading-relaxed font-medium max-w-2xl">
            We believe privacy isn&apos;t a passive legal checklist — it&apos;s an engineering constraint. LeapCrew AI orchestrates message relays, multi-tenant databases, and external webhooks under rigid isolation protocols.
          </p>

          <div className="pt-6 flex items-center gap-6 font-mono text-[9px] tracking-widest text-[#1D211F]/40 uppercase select-none">
            <div>[ SPECIFICATION REV: v2.4.0 ]</div>
            <div>[ LAST UPDATED: JUNE 2026 ]</div>
          </div>
        </div>
      </section>

      {/* 3. Immersive Interactive Visual Panel (Sovereignty Simulator) */}
      <section className="py-16 md:py-20 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 border-b border-[#1D211F]/8">
        <div className="space-y-4 mb-10 text-left">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ SYSTEM OBSERVABILITY ]</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-[#1D211F]">
            Interactive Sovereignty Map: <span className="italic font-normal text-[#2E4A3F]">How data flows</span>
          </h2>
          <p className="text-[#1D211F]/70 text-xs sm:text-sm max-w-2xl font-medium">
            Click through our dynamic visual engine to explore the physical logical borders, HMAC validation signatures, database segregation structures, and Meta edge node dispatches.
          </p>
        </div>

        <div className="bg-[#1D211F] text-[#FAF7F2] rounded-xl overflow-hidden shadow-2xl border border-white/10 grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">

          <div className="lg:col-span-4 bg-[#171A19] border-r border-[#FAF7F2]/8 p-6 flex flex-col justify-between select-none">
            <div className="space-y-4">
              <div className="text-[10px] font-mono tracking-widest text-[#FAF7F2]/30 uppercase pb-2 border-b border-[#FAF7F2]/5">SYSTEM NODES:</div>
              <div className="space-y-2.5">
                {[
                  { id: "transit", num: "01", label: "Webhook In-Transit", icon: RefreshCw },
                  { id: "postgres", num: "02", label: "PostgreSQL Isolation", icon: Database },
                  { id: "meta", num: "03", label: "Meta Cloud Dispatch", icon: Server },
                ].map((node) => {
                  const Icon = node.icon;
                  const isActive = activeNode === node.id;
                  return (
                    <button
                      key={node.id}
                      onClick={() => setActiveNode(node.id as FlowNode)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-lg text-left transition-all duration-300 border ${
                        isActive
                          ? "bg-[#2E4A3F] border-[#2E4A3F] text-white shadow-md scale-102"
                          : "bg-transparent border-[#FAF7F2]/8 text-[#FAF7F2]/55 hover:text-[#FAF7F2] hover:border-[#FAF7F2]/20"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded ${isActive ? "bg-white/10" : "bg-[#1D211F]"}`}>
                          <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#FAF7F2]/50"}`} />
                        </div>
                        <span className="text-xs font-semibold tracking-wide truncate">{node.label}</span>
                      </div>
                      <span className="font-mono text-[9px] opacity-40">{node.num}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 border-t border-[#FAF7F2]/5 mt-8 space-y-2 text-[9px] font-mono text-[#FAF7F2]/30">
              <div className="flex items-center justify-between">
                <span>SECURITY STANDARDS:</span>
                <span className="text-[#FAF7F2]/70">SOC2 COMPLIANT</span>
              </div>
              <div className="flex items-center justify-between">
                <span>DATABASE CLUSTERS:</span>
                <span className="text-emerald-400 font-bold">100% HEALTHY</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 p-6 md:p-8 flex flex-col justify-between bg-[#1D211F] space-y-6">

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-[#FAF7F2]/10 border border-[#FAF7F2]/10 text-white font-mono text-[8px] tracking-widest uppercase px-2 py-0.5 rounded font-bold">
                  Active Spec
                </span>
                <span className="font-mono text-[9px] text-[#D05E3C] tracking-widest uppercase font-bold">
                  {simulationDetails[activeNode].subtitle}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="font-serif text-2xl sm:text-3xl font-light text-[#FAF7F2]">
                  {simulationDetails[activeNode].title}
                </h3>
                <p className="text-[#FAF7F2]/75 text-xs sm:text-sm leading-relaxed max-w-2xl font-medium">
                  {simulationDetails[activeNode].desc}
                </p>
              </div>

              <div className="py-4 border-y border-[#FAF7F2]/8 mt-2">
                <span className="font-mono text-[9px] tracking-widest text-[#FAF7F2]/30 uppercase block mb-3">NODE GRAPH FLOW:</span>

                {activeNode === "transit" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-xs font-mono">
                    <div className="bg-[#171A19] border border-[#FAF7F2]/10 p-3 rounded text-center space-y-1 select-none">
                      <span className="text-[#FAF7F2]/40 text-[8px] uppercase tracking-wider block">Source Webhook</span>
                      <span className="font-bold text-[#D05E3C] truncate block">Shopify/WooCommerce</span>
                    </div>
                    <div className="text-center font-bold text-[#FAF7F2]/30 flex flex-col items-center select-none">
                      <div className="w-full flex items-center justify-center gap-1.5 animate-pulse text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[9px]">TLS 1.3 SIGNED</span>
                      </div>
                      <div className="text-lg">————&gt;</div>
                    </div>
                    <div className="bg-[#2E4A3F] border border-white/10 p-3 rounded text-center space-y-1 relative select-none">
                      <span className="text-white/50 text-[8px] uppercase tracking-wider block">LeapCrew AI Ingress</span>
                      <span className="font-bold text-white block">In-Memory HMAC Verify</span>
                    </div>
                  </div>
                )}

                {activeNode === "postgres" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-xs font-mono">
                    <div className="bg-[#2E4A3F] border border-white/10 p-3 rounded text-center space-y-1 select-none">
                      <span className="text-white/50 text-[8px] uppercase tracking-wider block">API Verified JWT</span>
                      <span className="font-bold text-white block">Client Context Token</span>
                    </div>
                    <div className="text-center font-bold text-[#FAF7F2]/30 flex flex-col items-center select-none">
                      <div className="w-full flex items-center justify-center gap-1.5 text-[#D05E3C]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D05E3C]" />
                        <span className="text-[9px]">RLS ENFORCED</span>
                      </div>
                      <div className="text-lg">————&gt;</div>
                    </div>
                    <div className="bg-[#171A19] border border-[#FAF7F2]/10 p-3 rounded text-center space-y-1 select-none">
                      <span className="text-[#FAF7F2]/40 text-[8px] uppercase tracking-wider block">Postgres DB cluster</span>
                      <span className="font-bold text-emerald-400 block">Tenant Schema UUID</span>
                    </div>
                  </div>
                )}

                {activeNode === "meta" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-xs font-mono">
                    <div className="bg-[#171A19] border border-[#FAF7F2]/10 p-3 rounded text-center space-y-1 select-none">
                      <span className="text-[#FAF7F2]/40 text-[8px] uppercase tracking-wider block">LeapCrew AI Server</span>
                      <span className="font-bold text-white block">Campaign Queue</span>
                    </div>
                    <div className="text-center font-bold text-[#FAF7F2]/30 flex flex-col items-center select-none">
                      <div className="w-full flex items-center justify-center gap-1.5 text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="text-[9px]">HTTPS POST</span>
                      </div>
                      <div className="text-lg">————&gt;</div>
                    </div>
                    <div className="bg-[#D05E3C]/20 border border-[#D05E3C]/40 p-3 rounded text-center space-y-1 select-none">
                      <span className="text-[#D05E3C] text-[8px] uppercase tracking-wider block">Meta Cloud Edge</span>
                      <span className="font-bold text-white block">WhatsApp Network</span>
                    </div>
                  </div>
                )}
              </div>

              <ul className="space-y-2 pt-2 text-xs font-medium">
                {simulationDetails[activeNode].steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-[#FAF7F2]/85">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#171A19] border border-white/5 rounded-lg p-4 font-mono text-[10px] text-[#FAF7F2]/60 space-y-2 select-none">
              <div className="flex items-center justify-between border-b border-[#FAF7F2]/5 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-[#D05E3C]" />
                  <span className="text-[8px] text-[#FAF7F2]/30 uppercase tracking-widest">Real-time Node execution telemetry</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[8px] text-emerald-400">CONNECTED</span>
                </div>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                {simulationDetails[activeNode].terminalLogs.map((log, idx) => (
                  <div key={idx} className={log.includes("successfully") || log.includes("resolved") || log.includes("200 OK") ? "text-emerald-400" : log.includes("Error") ? "text-[#D05E3C]" : "text-[#FAF7F2]/75"}>
                    &gt; {log}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. Document Content Layout */}
      <section className="py-16 md:py-24 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

          <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6 lg:border-r border-[#1D211F]/8 lg:pr-8 select-none">
            <div className="space-y-2">
              <span className="font-mono text-[9px] tracking-widest text-[#D05E3C] uppercase font-bold">Policy Index</span>
              <h3 className="font-serif text-2xl font-light text-[#1D211F]">
                Specifications <span className="italic font-normal text-[#2E4A3F]">&amp; limits.</span>
              </h3>
            </div>

            <nav className="flex flex-col gap-1.5">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => {
                    setActiveSection(sec.id);
                    const el = document.getElementById(sec.id);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                  }}
                  className={`w-full flex items-center justify-between py-2.5 px-3 rounded-md text-left transition-all duration-300 text-xs font-semibold ${
                    activeSection === sec.id
                      ? "bg-[#1D211F] text-[#FAF7F2] font-bold"
                      : "text-[#1D211F]/60 hover:bg-[#1D211F]/5 hover:text-[#1D211F]"
                  }`}
                >
                  <span className="truncate max-w-[80%]">{sec.title}</span>
                  <span className="font-mono text-[9px] opacity-55">{sec.num}</span>
                </button>
              ))}
            </nav>

            <div className="pt-6 border-t border-[#1D211F]/8 space-y-4">
              <div className="text-[9px] font-mono text-[#1D211F]/40 uppercase tracking-widest leading-relaxed">
                Need a print specification copy for corporate data compliance review teams?
              </div>
              <button
                onClick={() => window.print()}
                className="w-full text-center py-2.5 rounded border border-[#1D211F]/20 hover:border-[#1D211F]/60 text-xs font-bold uppercase tracking-wide transition-all active:scale-98"
              >
                Print Policy
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-16">
            {sections.map((sec) => (
              <div
                key={sec.id}
                id={sec.id}
                className="group border-t border-[#1D211F]/10 pt-10 scroll-mt-28 space-y-6 text-left transition-all duration-300"
              >
                <div className="flex items-baseline justify-between select-none">
                  <span className="font-mono text-[9px] tracking-widest text-[#D05E3C] uppercase font-bold">
                    SECTION PROTOCOL // {sec.num}
                  </span>
                  <span className="font-mono text-[9px] text-[#1D211F]/30 font-bold">
                    SYSTEM BOUNDARY
                  </span>
                </div>

                <h3 className="font-serif text-2xl sm:text-3xl font-light text-[#1D211F] group-hover:text-[#2E4A3F] transition-colors duration-300">
                  {sec.title}
                </h3>

                <div className="font-sans text-sm text-[#1D211F]/80 leading-relaxed space-y-4 font-medium">
                  {sec.content}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 5. Editorial Footer */}
      <footer className="bg-[#171A19] text-[#FAF7F2]/80 border-t border-[#FAF7F2]/10 py-16 px-6 md:px-12 relative z-10 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-8 text-xs select-none">

          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-[#FAF7F2]/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-[#FAF7F2]" />
              </div>
              <span className="font-sans font-extrabold tracking-tight text-white text-base">LeapCrew AI</span>
            </div>
            <p className="text-[#FAF7F2]/40 max-w-sm font-medium">
              A product of smritix AI LLP, India. Architectural customer communication systems with secure multi-tenant CRM isolation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 md:gap-12 text-left">
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-[#FAF7F2]/30 uppercase tracking-widest">Environment Version</div>
              <div className="font-mono text-[#FAF7F2]/80 uppercase">v2.4.0-SaaS // SQL Secure</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-[#FAF7F2]/30 uppercase tracking-widest">Global Status</div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-[#FAF7F2]/80 uppercase">Systems Operational</span>
              </div>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-[#FAF7F2]/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-[#FAF7F2]/30 font-mono">
          <p>© 2026 smritix AI LLP. LeapCrew AI is a product of smritix AI LLP, India.</p>
          <div className="flex flex-wrap gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Operations</Link>
            <Link href="/legal/cookies" className="hover:text-white transition-colors">Cookie Policy</Link>
            <Link href="/legal/dpa" className="hover:text-white transition-colors">DPA</Link>
            <Link href="/legal/refund" className="hover:text-white transition-colors">Refund Policy</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
