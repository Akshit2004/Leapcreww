"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Bot, 
  ArrowLeft, 
  ShieldCheck, 
  Database, 
  Cpu, 
  Lock, 
  Server, 
  Layers, 
  Check, 
  Terminal, 
  RefreshCw, 
  Send,
  Sparkles,
  Smartphone,
  Eye,
  Key
} from "lucide-react";

type FlowNode = "transit" | "postgres" | "meta";

export default function PrivacyPage() {
  const [activeNode, setActiveNode] = useState<FlowNode>("transit");
  const [activeSection, setActiveSection] = useState<string>("sec-1");

  // Simulation node details
  const simulationDetails = {
    transit: {
      title: "In-Transit Verification Pipeline",
      subtitle: "REAL-TIME SECURITY ORCHESTRATION",
      desc: "Incoming requests (e.g., from Shopify, WooCommerce, or your bespoke webhooks) are encrypted using TLS 1.3 and validated using dynamic SHA-256 HMAC headers. Payloads are checked and routed entirely in-memory with zero temporary disk writes.",
      badge: "TLS 1.3 SECURE",
      steps: [
        "Dynamic HMAC verification (x-wappflow-signature header)",
        "Zero temporary storage caching in persistent media",
        "Stateless ingress verification nodes with isolated runtime memory"
      ],
      terminalLogs: [
        "POST /api/v1/webhook [INGRESS STATE: ACTIVE]",
        "Checking HMAC signature header x-wappflow-signature...",
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
        "Executing query with tenant claim: TenantID = 9e248a3... ",
        "Row-Level Security (RLS) active. Query records fetched: 1",
        "AES-256 decrypting credential 'META_ACCESS_TOKEN'...",
        "Credential retrieved in secure scope. Task resolved."
      ]
    },
    meta: {
      title: "Direct Meta Cloud API Dispatch",
      subtitle: "SECURE END-TO-END META INTEGRATION",
      desc: "Messages are delivered directly to Meta Cloud API endpoints through verified SSL connections. WappFlow maintains zero-knowledge log indexes, saving only critical transmission metadata needed for campaign delivery statistics.",
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
      title: "Data Isolation & Multi-Tenancy Specs",
      content: (
        <div className="space-y-4">
          <p>
            WappFlow utilizes a highly isolated, multi-tenant database architecture. Every customer workspace is segmented within a dedicated relational database space using unique, high-entropy <strong>UUID identifiers</strong>.
          </p>
          <p>
            This logical isolation is tightly governed by database-level Row-Level Security (RLS) policies. Under no circumstances can data from one tenant workspace leak into or be queried by another workspace. All relational indexes are bound to your tenant context, verified cryptographically at the API level using validated JSON Web Tokens (JWT) on every query.
          </p>
          <div className="bg-[#FAF7F2] border border-[#1D211F]/10 rounded-lg p-5 space-y-3 mt-6">
            <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">Storage Infrastructure Details:</h5>
            <ul className="text-xs space-y-2 text-[#1D211F]/80">
              <li className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
                <span>Primary transactional storage: AWS Aurora PostgreSQL Serverless v2.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
                <span>Backups: Automatic daily incremental backups, stored inside encrypted S3 containers with a strict 30-day retention schedule.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
                <span>Key Management: Dedicated AWS Key Management Service (KMS) handles dynamic key rotations for encrypted fields.</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: "sec-2",
      num: "02",
      title: "Meta Cloud API Compliance & Message Dispatch",
      content: (
        <div className="space-y-4">
          <p>
            As a platform integrated with the <strong>WhatsApp Business Cloud API (Meta)</strong>, WappFlow routes communication payloads directly to Meta's endpoints.
          </p>
          <p>
            When you broadcast campaigns or chat via the team inbox, your messages bypass secondary third-party brokers. The transmission uses secure, end-to-end TLS 1.3 tunnels routed straight to Meta's global data centers. 
          </p>
          <p>
            WappFlow operates under a <strong>zero-knowledge message retention philosophy</strong> for historical chat bodies. We do not persist the raw contents of your customer conversations on our servers beyond what is required to display your active support queue. Once a chat is archived or resolved, message body records are queued for complete scrub cycles.
          </p>
        </div>
      )
    },
    {
      id: "sec-3",
      num: "03",
      title: "Third-Party Integrations & Custom Webhooks",
      content: (
        <div className="space-y-4">
          <p>
            WappFlow lets you bind external webhook systems (such as Shopify, WooCommerce, and custom API integrations) to trigger automated messaging nodes.
          </p>
          <p>
            All outbound and inbound webhook traffic is governed by modern cryptographic standards:
          </p>
          <ul className="list-disc pl-5 text-xs space-y-2 text-[#1D211F]/80">
            <li><strong>HMAC Signature Verification:</strong> We sign outbound payloads using SHA-256 HMAC keys, allowing your servers to verify the authenticity of WappFlow requests.</li>
            <li><strong>IP Address Whitelisting:</strong> All integration traffic originates from a static pool of designated IP addresses, enabling strict firewall rule setups.</li>
            <li><strong>Retry Protocol Boundaries:</strong> Webhook payloads that fail to deliver are held in a secure, ephemeral queue for 24 hours with exponential backoff before being completely purged from memory.</li>
          </ul>
        </div>
      )
    },
    {
      id: "sec-4",
      num: "04",
      title: "Data Sovereignty & User Erasure Rights",
      content: (
        <div className="space-y-4">
          <p>
            We respect global data sovereignty regulations, including the <strong>GDPR (General Data Protection Regulation)</strong>, <strong>CCPA</strong>, and localized compliance mandates.
          </p>
          <p>
            As a WappFlow tenant, you retain complete sovereignty over your data assets. You can exercise your rights directly from the account portal:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="border border-[#1D211F]/8 p-4 rounded-lg bg-white space-y-1.5">
              <span className="font-mono text-[9px] text-[#D05E3C] font-bold uppercase">[ Export Capability ]</span>
              <h6 className="font-serif text-sm font-semibold text-[#1D211F]">Right to Portability</h6>
              <p className="text-xs text-[#1D211F]/70 leading-relaxed">
                Export all sync databases, contact lists, templates, and campaign statistics in structured JSON formats with a single click.
              </p>
            </div>
            <div className="border border-[#1D211F]/8 p-4 rounded-lg bg-white space-y-1.5">
              <span className="font-mono text-[9px] text-[#D05E3C] font-bold uppercase">[ Deletion Cycle ]</span>
              <h6 className="font-serif text-sm font-semibold text-[#1D211F]">Right to be Forgotten</h6>
              <p className="text-xs text-[#1D211F]/70 leading-relaxed">
                Initiate full database erasure. Your tenant schema, access tokens, and campaign history are permanently deleted from database clusters in 48 hours.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "sec-5",
      num: "05",
      title: "Cookies & Local Storage Restraint",
      content: (
        <div className="space-y-4">
          <p>
            WappFlow maintains an absolute minimum cookie footprint. We refuse to use intrusive tracking cookies, persistent marketing pixels, or third-party behavioral fingerprinting frameworks.
          </p>
          <p>
            We rely exclusively on secure, first-party cookie records essential to system operations:
          </p>
          <table className="min-w-full text-xs text-left border-collapse border border-[#1D211F]/8 mt-4">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#1D211F]/8 font-mono text-[9px] uppercase tracking-wider text-[#1D211F]/60">
                <th className="p-3 border-r border-[#1D211F]/8">Identifier</th>
                <th className="p-3 border-r border-[#1D211F]/8">Purpose</th>
                <th className="p-3">Lifespan</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#1D211F]/8">
                <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C]">__wappflow_session</td>
                <td className="p-3 border-r border-[#1D211F]/8 font-medium">Validates authenticated administrator login sessions using JWT.</td>
                <td className="p-3">Session-bound</td>
              </tr>
              <tr>
                <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C]">__wappflow_theme</td>
                <td className="p-3 border-r border-[#1D211F]/8 font-medium">Stores workspace visual preferences (Light/Dark toggles).</td>
                <td className="p-3">1 Year</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    },
    {
      id: "sec-6",
      num: "06",
      title: "Administrative Contacts & System Integrity",
      content: (
        <div className="space-y-4">
          <p>
            WappFlow is engineered and managed by a dedicated team of cloud architects. We maintain real-time observability matrices over all ingress, database clusters, and API dispatch nodes to prevent and neutralize potential security vector intrusions.
          </p>
          <p>
            Should you have concerns regarding system integrity, logical isolation strategies, or Meta API compliance protocols, please reach out directly to our security orchestrators:
          </p>
          <div className="bg-[#1D211F] text-[#FAF7F2] rounded-lg p-6 space-y-4 mt-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#D05E3C]" />
              <span className="font-serif text-sm font-semibold tracking-wide">WappFlow Data Security Operations</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-[#FAF7F2]/80">
              <div>
                <span className="text-[#FAF7F2]/45 uppercase text-[9px] tracking-wider block">Contact</span>
                <span className="font-semibold text-white">smritix.ai.1@gmail.com</span>
              </div>
              <div>
                <span className="text-[#FAF7F2]/45 uppercase text-[9px] tracking-wider block">Meta Compliance Inquiries</span>
                <span className="font-semibold text-white">smritix.ai.1@gmail.com</span>
              </div>
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
            <span className="font-sans font-extrabold text-xl tracking-tight text-[#1D211F]">WappFlow</span>
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
            We believe privacy isn't a passive legal checklist—it's an engineering constraint. WappFlow orchestrates message relays, multi-tenant databases, and external webhooks under rigid isolation protocols.
          </p>

          <div className="pt-6 flex items-center gap-6 font-mono text-[9px] tracking-widest text-[#1D211F]/40 uppercase select-none">
            <div>[ SPECIFICATION REV: v2.4.0 ]</div>
            <div>[ LAST REVISED: MAY 31, 2026 ]</div>
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

        {/* The Simulator UI */}
        <div className="bg-[#1D211F] text-[#FAF7F2] rounded-xl overflow-hidden shadow-2xl border border-white/10 grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
          
          {/* Simulator Sidebar (Switches) */}
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
                <span className="text-[#FAF7F2]/70 text-emerald-400 font-bold">100% HEALTHY</span>
              </div>
            </div>
          </div>

          {/* Simulator Main Workspace */}
          <div className="lg:col-span-8 p-6 md:p-8 flex flex-col justify-between bg-[#1D211F] space-y-6">
            
            {/* Top Node Specs Block */}
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

              {/* Dynamic Interactive Diagram Boxes */}
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
                      <span className="text-white/50 text-[8px] uppercase tracking-wider block">WappFlow Ingress</span>
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
                      <span className="text-[#FAF7F2]/40 text-[8px] uppercase tracking-wider block">WappFlow Server</span>
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

              {/* Bullet details */}
              <ul className="space-y-2 pt-2 text-xs font-medium">
                {simulationDetails[activeNode].steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-[#FAF7F2]/85">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom Console Terminal */}
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

      {/* 4. Asymmetrical Document Content Layout */}
      <section className="py-16 md:py-24 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column - Sticky Quick Jump Navigation */}
          <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6 lg:border-r border-[#1D211F]/8 lg:pr-8 select-none">
            <div className="space-y-2">
              <span className="font-mono text-[9px] tracking-widest text-[#D05E3C] uppercase font-bold">Policy Index</span>
              <h3 className="font-serif text-2xl font-light text-[#1D211F]">
                Specifications <span className="italic font-normal text-[#2E4A3F]">& limits.</span>
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
                Print Specifications
              </button>
            </div>
          </div>

          {/* Right Column - Beautiful Editorial Details */}
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
              <span className="font-sans font-extrabold tracking-tight text-white text-base">WappFlow</span>
            </div>
            <p className="text-[#FAF7F2]/40 max-w-sm font-medium">
              Architectural customer communication systems. Secure localized database deployments with multi-tenant CRM isolation.
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
          <p>© {new Date().getFullYear()} WappFlow Inc. All rights reserved. Distributed under strict Meta Cloud API SLAs.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <a href="#" className="hover:text-white transition-colors">Terms of Operations</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
