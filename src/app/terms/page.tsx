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
  Check, 
  Terminal, 
  RefreshCw, 
  Scale,
  FileText
} from "lucide-react";

type FlowNode = "compliance" | "wallet" | "rate";

export default function TermsPage() {
  const [activeNode, setActiveNode] = useState<FlowNode>("compliance");
  const [activeSection, setActiveSection] = useState<string>("sec-1");

  // Simulation node details for terms
  const simulationDetails = {
    compliance: {
      title: "Meta WhatsApp Business Compliance Engine",
      subtitle: "REAL-TIME POLICY ENFORCEMENT",
      desc: "Our platform routes broadcast templates through automated compliance parsing filters. It validates parameters against Meta templates to prevent policy blockings and ensure standard quality ratings.",
      badge: "META COMPLIANCE",
      steps: [
        "Dynamic parameter matching with approved templates",
        "Automated rejection of unregistered/unapproved variable formatting",
        "Real-time tracking of Meta Business quality tiers"
      ],
      terminalLogs: [
        "POLICY_ENGINE [BROADCAST FILTER ACTIVE]",
        "Verifying message body parameters...",
        "Template 'login_otp' parameter validation: OK",
        "Quality rating status check: High/Green (No restriction)",
        "Broadcast approved. Forwarding to Meta Cloud Edge."
      ]
    },
    wallet: {
      title: "SaaS Wallet Credit Allocation SLA",
      subtitle: "REAL-TIME LEDGER ACCOUNTING",
      desc: "Platform wallets maintain strict ledger integrity. Deductions for Meta utility template sessions (e.g. login OTPs) and marketing broadcasts are processed instantly using atomized ledger transactions.",
      badge: "LEDGER CRYPTO INTEGRITY",
      steps: [
        "Atomized balance checks before campaign relay initiates",
        "Dynamic session rate calculations per country index",
        "Real-time transactional ledger logging inside PostgreSQL"
      ],
      terminalLogs: [
        "LEDGER_ENGINE [CLIENT_ID: 9e248a3f-f901-4475]",
        "Checking active wallet balance...",
        "Required credit: ₹0.30 // Available balance: ₹450.00",
        "Deducting session cost. Transaction logged (ID: tx_8a39fcda).",
        "Ledger synchronized. Broadcast allowed."
      ]
    },
    rate: {
      title: "Rate Limiting & Queue Orchestration",
      subtitle: "HIGH-THROUGHPUT STABILITY RELAY",
      desc: "To prevent Meta API rate failures and network clogging, WappFlow employs persistent queue pools. Broadcasts are dispatched inside dynamic rate-limiting partitions to preserve system health.",
      badge: "STABILITY GUARANTEE",
      steps: [
        "Persistent concurrency control throttled at 80 ms/msg",
        "Automatic fallback queuing for Meta 131030 (Rate Limit) responses",
        "Stateless isolated memory queues for incoming webhook bursts"
      ],
      terminalLogs: [
        "QUEUE_ROUTER [RATE MONITOR ENGINE]",
        "Incoming broadcast payload: 5,000 items in batch",
        "Activating queue concurrency partition (Max: 50 msg/sec)",
        "Executing dispatch sequence...",
        "Meta API rate limit headers: 98% capacity remaining. Queue stable."
      ]
    }
  };

  const sections = [
    {
      id: "sec-1",
      num: "01",
      title: "SaaS Scope of Operations & Meta SLAs",
      content: (
        <div className="space-y-4">
          <p>
            WappFlow serves as an architectural intermediary SaaS application that facilitates seamless integrations with the **WhatsApp Business Cloud API (Meta)**. By registering a tenant workspace, you acknowledge and agree that our software’s operation is strictly bound by Meta’s official Service Level Agreements (SLAs).
          </p>
          <p>
            We represent a stateless and logical multi-tenant CRM layer. Any outages, API modifications, template blocking policies, or number suspensions executed by Meta Business Platform fall entirely outside WappFlow’s structural liabilities. You are obligated to maintain active, compliant Developer accounts and WhatsApp Business accounts directly inside Meta's dashboard.
          </p>
        </div>
      )
    },
    {
      id: "sec-2",
      num: "02",
      title: "WhatsApp Cloud API Compliance & Anti-Spam Mandate",
      content: (
        <div className="space-y-4">
          <p>
            WappFlow enforces a strict **Zero Tolerance Policy for Unsolicited Broadcasts (Spam)**. You must abide by Meta’s official WhatsApp Business Terms of Service and Commerce Policies on all outbound campaigns.
          </p>
          <p>
            You represent that all contacts imported via CSV or synchronized through external webhooks (Shopify/WooCommerce) have explicitly opted in to receive communications on their verified WhatsApp numbers. Any client account identified as receiving high block/spam report ratios inside the Meta Business Manager will be subject to instant workspace suspension.
          </p>
          <div className="bg-[#FAF7F2] border border-[#1D211F]/10 rounded-lg p-5 space-y-3 mt-6">
            <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">Meta Quality Tiers & Limits:</h5>
            <ul className="text-xs space-y-2 text-[#1D211F]/80">
              <li className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
                <span><strong>High/Green Rating</strong>: Full throughput capability without limitation.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
                <span><strong>Medium/Yellow Rating</strong>: Warning threshold. Queue dispatch throttle drops by 50%.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
                <span><strong>Low/Red Rating</strong>: Automatic sandbox lockdown. Broadcast capabilities suspended until quality reviews clear.</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: "sec-3",
      num: "03",
      title: "Workspace Wallet Balances & Payment Processing SLAs",
      content: (
        <div className="space-y-4">
          <p>
            WappFlow utilizes an in-app **SaaS credit wallet system** for template messaging charges and WhatsApp utility session costs.
          </p>
          <p>
            All top-up transactions are executed securely through our integrated payment processor, **Razorpay**. By submitting billing details, you authorize WappFlow to credit your local database wallet ledger with the exact Indian Rupee (INR) amount verified by the processor. 
          </p>
          <ul className="list-disc pl-5 text-xs space-y-2 text-[#1D211F]/80">
            <li><strong>Non-Refundable Balance</strong>: Wallet top-up credits are non-refundable and hold no monetary cash value outside WappFlow campaign operations.</li>
            <li><strong>Session Cost Index</strong>: WhatsApp charges are based on Meta's official country index pricing rules and are deducted dynamically from your wallet ledger upon each webhook dispatch check.</li>
            <li><strong>Automatic Queue Halting</strong>: If your active wallet balance drops below ₹0, the outbound API dispatch pool halts instantly to prevent credit liability build-up.</li>
          </ul>
        </div>
      )
    },
    {
      id: "sec-4",
      num: "04",
      title: "Data Sovereignty & Permanent Portability Rights",
      content: (
        <div className="space-y-4">
          <p>
            Consistent with the GDPR and California Consumer Privacy Act (CCPA), WappFlow respects your absolute rights over your proprietary database assets.
          </p>
          <p>
            You can export all contacts, campaign transmission metrics, template databases, and system logs in structured JSON/CSV formats at any time. If you choose to terminate your workspace instance, you can request a **Permanent System Scrubbing**. Upon confirmation, your entire logical PostgreSQL tenant schema, Meta access credentials, and transaction logs are deleted completely in 48 hours.
          </p>
        </div>
      )
    },
    {
      id: "sec-5",
      num: "05",
      title: "System Stability, Concurrency & Rate Limits",
      content: (
        <div className="space-y-4">
          <p>
            To protect infrastructure integrity and prevent database thrashing, WappFlow establishes strict concurrency boundaries across all workspace instances.
          </p>
          <table className="min-w-full text-xs text-left border-collapse border border-[#1D211F]/8 mt-4">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#1D211F]/8 font-mono text-[9px] uppercase tracking-wider text-[#1D211F]/60">
                <th className="p-3 border-r border-[#1D211F]/8">Resource Interface</th>
                <th className="p-3 border-r border-[#1D211F]/8">Maximum Ceiling Limit</th>
                <th className="p-3">SLA Boundary Action</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#1D211F]/8">
                <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C]">Outbound Campaign Dispatch</td>
                <td className="p-3 border-r border-[#1D211F]/8 font-medium">80 messages per second per tenant</td>
                <td className="p-3">Automatic queuing into concurrency partitions.</td>
              </tr>
              <tr className="border-b border-[#1D211F]/8">
                <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C]">Incoming Webhook Relay Ingress</td>
                <td className="p-3 border-r border-[#1D211F]/8 font-medium">350 requests per second</td>
                <td className="p-3">Temporary stateless buffer holding for up to 3 seconds.</td>
              </tr>
              <tr>
                <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C]">Chatbot Visual Tree Nodes</td>
                <td className="p-3 border-r border-[#1D211F]/8 font-medium">100 visual nodes per organization</td>
                <td className="p-3">Maximum schema limit reached. Further nodes blocked.</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    },
    {
      id: "sec-6",
      num: "06",
      title: "System integrity & Administrative Integrity Compliance",
      content: (
        <div className="space-y-4">
          <p>
            WappFlow is architected with complete end-to-end transparency. We maintain round-the-clock infrastructure checks, logical database schema separations, and dynamic security audits to secure your customer CRM data.
          </p>
          <p>
            For inquiries regarding terms of operations, SOC2 compliance audits, or Meta Business Cloud API SLAs, please contact our core systems orchestrator:
          </p>
          <div className="bg-[#1D211F] text-[#FAF7F2] rounded-lg p-6 space-y-4 mt-6">
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-[#D05E3C]" />
              <span className="font-serif text-sm font-semibold tracking-wide">WappFlow Operations & Compliance Operations</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-[#FAF7F2]/80">
              <div>
                <span className="text-[#FAF7F2]/45 uppercase text-[9px] tracking-wider block">Legal Inquiries</span>
                <span className="font-semibold text-white">smritix.ai.1@gmail.com</span>
              </div>
              <div>
                <span className="text-[#FAF7F2]/45 uppercase text-[9px] tracking-wider block">Security Escalations</span>
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
            <FileText className="w-3.5 h-3.5 text-[#D05E3C]" />
            <span className="font-mono text-[9px] tracking-widest text-[#D05E3C] uppercase font-bold">Workspace Agreement SLAs</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.05] text-[#1D211F]">
            Platform operations, <span className="italic font-normal text-[#2E4A3F]">bound by structural compliance.</span>
          </h1>

          <p className="text-[#1D211F]/70 text-sm sm:text-base leading-relaxed font-medium max-w-2xl">
            Read WappFlow’s terms of service and compliance specifications. Learn about Meta Cloud APIs, rate limits, credit ledger allocation protocols, and logical tenant boundaries.
          </p>

          <div className="pt-6 flex items-center gap-6 font-mono text-[9px] tracking-widest text-[#1D211F]/40 uppercase select-none">
            <div>[ OPERATIONS SPEC REV: v2.4.0 ]</div>
            <div>[ LAST REVISED: JUNE 1, 2026 ]</div>
          </div>
        </div>
      </section>

      {/* 3. Immersive Interactive Visual Panel (SLA Engine Simulator) */}
      <section className="py-16 md:py-20 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 border-b border-[#1D211F]/8">
        <div className="space-y-4 mb-10 text-left">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">[ SYSTEM LEDGER INTEGRITY ]</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-[#1D211F]">
            Interactive SLA Map: <span className="italic font-normal text-[#2E4A3F]">Compliance in action</span>
          </h2>
          <p className="text-[#1D211F]/70 text-xs sm:text-sm max-w-2xl font-medium">
            Explore the real-time operational layers, template compliance filters, in-app ledger transaction accounting, and rate limits keeping our routing cluster completely secure.
          </p>
        </div>

        {/* The Simulator UI */}
        <div className="bg-[#1D211F] text-[#FAF7F2] rounded-xl overflow-hidden shadow-2xl border border-white/10 grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
          
          {/* Simulator Sidebar (Switches) */}
          <div className="lg:col-span-4 bg-[#171A19] border-r border-[#FAF7F2]/8 p-6 flex flex-col justify-between select-none">
            <div className="space-y-4">
              <div className="text-[10px] font-mono tracking-widest text-[#FAF7F2]/30 uppercase pb-2 border-b border-[#FAF7F2]/5">SLA RULES:</div>
              <div className="space-y-2.5">
                {[
                  { id: "compliance", num: "01", label: "Meta Compliance", icon: RefreshCw },
                  { id: "wallet", num: "02", label: "Ledger Accounting", icon: Database },
                  { id: "rate", num: "03", label: "Rate Queue", icon: Server },
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
                <span>API INTEGRATIONS:</span>
                <span className="text-[#FAF7F2]/70 font-mono text-emerald-400">META VERIFIED</span>
              </div>
              <div className="flex items-center justify-between">
                <span>ROUTING CAPACITY:</span>
                <span className="text-[#FAF7F2]/70 font-mono">10,000 msg/min</span>
              </div>
            </div>
          </div>

          {/* Simulator Main Workspace */}
          <div className="lg:col-span-8 p-6 md:p-8 flex flex-col justify-between bg-[#1D211F] space-y-6">
            
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-[#FAF7F2]/10 border border-[#FAF7F2]/10 text-white font-mono text-[8px] tracking-widest uppercase px-2 py-0.5 rounded font-bold">
                  Rule Specification
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

              {/* Dynamic Diagram */}
              <div className="py-4 border-y border-[#FAF7F2]/8 mt-2">
                <span className="font-mono text-[9px] tracking-widest text-[#FAF7F2]/30 uppercase block mb-3">RULE FLOW:</span>
                
                {activeNode === "compliance" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-xs font-mono">
                    <div className="bg-[#171A19] border border-[#FAF7F2]/10 p-3 rounded text-center space-y-1 select-none">
                      <span className="text-[#FAF7F2]/40 text-[8px] uppercase tracking-wider block">Broadcast Request</span>
                      <span className="font-bold text-[#D05E3C] truncate block">Client Campaign Launch</span>
                    </div>
                    <div className="text-center font-bold text-[#FAF7F2]/30 flex flex-col items-center select-none">
                      <div className="w-full flex items-center justify-center gap-1.5 animate-pulse text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[9px]">COMPLIANCE ACTIVE</span>
                      </div>
                      <div className="text-lg">————&gt;</div>
                    </div>
                    <div className="bg-[#2E4A3F] border border-white/10 p-3 rounded text-center space-y-1 relative select-none">
                      <span className="text-white/50 text-[8px] uppercase tracking-wider block">WappFlow Gatekeeper</span>
                      <span className="font-bold text-white block">Template Matcher</span>
                    </div>
                  </div>
                )}

                {activeNode === "wallet" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-xs font-mono">
                    <div className="bg-[#2E4A3F] border border-white/10 p-3 rounded text-center space-y-1 select-none">
                      <span className="text-white/50 text-[8px] uppercase tracking-wider block">Session Dispatch</span>
                      <span className="font-bold text-white block">CRM Relayed Action</span>
                    </div>
                    <div className="text-center font-bold text-[#FAF7F2]/30 flex flex-col items-center select-none">
                      <div className="w-full flex items-center justify-center gap-1.5 text-[#D05E3C]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D05E3C]" />
                        <span className="text-[9px]">LEDGER DEDUCT</span>
                      </div>
                      <div className="text-lg">————&gt;</div>
                    </div>
                    <div className="bg-[#171A19] border border-[#FAF7F2]/10 p-3 rounded text-center space-y-1 select-none">
                      <span className="text-[#FAF7F2]/40 text-[8px] uppercase tracking-wider block">Wallet Balance</span>
                      <span className="font-bold text-emerald-400 block">PostgreSQL Ledger</span>
                    </div>
                  </div>
                )}

                {activeNode === "rate" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-xs font-mono">
                    <div className="bg-[#171A19] border border-[#FAF7F2]/10 p-3 rounded text-center space-y-1 select-none">
                      <span className="text-[#FAF7F2]/40 text-[8px] uppercase tracking-wider block">High throughput batch</span>
                      <span className="font-bold text-white block">10k Broadcast batch</span>
                    </div>
                    <div className="text-center font-bold text-[#FAF7F2]/30 flex flex-col items-center select-none">
                      <div className="w-full flex items-center justify-center gap-1.5 text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="text-[9px]">80ms THROTTLE</span>
                      </div>
                      <div className="text-lg">————&gt;</div>
                    </div>
                    <div className="bg-[#D05E3C]/20 border border-[#D05E3C]/40 p-3 rounded text-center space-y-1 select-none">
                      <span className="text-[#D05E3C] text-[8px] uppercase tracking-wider block">Meta Cloud APIs</span>
                      <span className="font-bold text-white block">API Edge Node</span>
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

            {/* Bottom Console Terminal */}
            <div className="bg-[#171A19] border border-white/5 rounded-lg p-4 font-mono text-[10px] text-[#FAF7F2]/60 space-y-2 select-none">
              <div className="flex items-center justify-between border-b border-[#FAF7F2]/5 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-[#D05E3C]" />
                  <span className="text-[8px] text-[#FAF7F2]/30 uppercase tracking-widest">Real-time Telemetry logs</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span className="text-[8px] text-emerald-400">COMPLIANT</span>
                </div>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                {simulationDetails[activeNode].terminalLogs.map((log, idx) => (
                  <div key={idx} className={log.includes("validation: OK") || log.includes("synchronized") || log.includes("stable") ? "text-emerald-400" : "text-[#FAF7F2]/75"}>
                    &gt; {log}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. Document Index Grid */}
      <section className="py-16 md:py-24 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Navigation Quick Link Index */}
          <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6 lg:border-r border-[#1D211F]/8 lg:pr-8 select-none">
            <div className="space-y-2">
              <span className="font-mono text-[9px] tracking-widest text-[#D05E3C] uppercase font-bold">Terms Index</span>
              <h3 className="font-serif text-2xl font-light text-[#1D211F]">
                Operation <span className="italic font-normal text-[#2E4A3F]">parameters.</span>
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
                Need a physical print copy for legal compliance audits?
              </div>
              <button 
                onClick={() => window.print()}
                className="w-full text-center py-2.5 rounded border border-[#1D211F]/20 hover:border-[#1D211F]/60 text-xs font-bold uppercase tracking-wide transition-all active:scale-98"
              >
                Print Terms
              </button>
            </div>
          </div>

          {/* Right Detailed Copy Column */}
          <div className="lg:col-span-8 space-y-16">
            {sections.map((sec) => (
              <div 
                key={sec.id} 
                id={sec.id}
                className="group border-t border-[#1D211F]/10 pt-10 scroll-mt-28 space-y-6 text-left transition-all duration-300"
              >
                <div className="flex items-baseline justify-between select-none">
                  <span className="font-mono text-[9px] tracking-widest text-[#D05E3C] uppercase font-bold">
                    OPERATIONS PROTOCOL // {sec.num}
                  </span>
                  <span className="font-mono text-[9px] text-[#1D211F]/30 font-bold">
                    INFRASTRUCTURE RULE
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
              <div className="font-mono text-[#FAF7F2]/80 uppercase font-bold">v2.4.0-SaaS // SQL Secure</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-[#FAF7F2]/30 uppercase tracking-widest">Routing Integrity</div>
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
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Operations</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
