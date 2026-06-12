"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bot,
  ArrowLeft,
  Receipt,
  Wallet,
  CreditCard,
  ClipboardCheck,
  Check,
  Terminal,
} from "lucide-react";

type FlowNode = "wallet" | "subscription" | "review";

export default function RefundPage() {
  const [activeNode, setActiveNode] = useState<FlowNode>("wallet");
  const [activeSection, setActiveSection] = useState<string>("sec-1");

  const simulationDetails: Record<
    FlowNode,
    {
      title: string;
      subtitle: string;
      desc: string;
      steps: string[];
      terminalLogs: string[];
      diagramLeft: { label: string; value: string };
      diagramMiddle: { label: string; color: string };
      diagramRight: { label: string; value: string };
    }
  > = {
    wallet: {
      title: "Wallet Deduction Ledger Engine",
      subtitle: "NON-REFUNDABLE CREDIT ACCOUNTING",
      desc: "Wallet credits are atomically deducted from your PostgreSQL ledger balance the moment an outbound API dispatch is confirmed by Meta Cloud. Each deduction is logged as an immutable transaction record. Credits hold no monetary cash value outside the LeapCrew AI platform and are consumed entirely by Meta API session fees and platform infrastructure costs.",
      steps: [
        "Atomic deduction: balance decremented inside a database transaction",
        "Immutable ledger entry written with timestamp, amount, and dispatch ID",
        "Zero reverse-credit path for consumed WhatsApp session charges",
      ],
      terminalLogs: [
        "LEDGER_ENGINE [WALLET DEDUCTION ACTIVE]",
        "Dispatch confirmed by Meta Cloud API: broadcast_id=bc_4a9f2...",
        "Deducting ₹0.30 (IN marketing session) from wallet balance...",
        "Ledger entry written: { tx_id: 'tx_8a39fcda', amount: -0.30, ts: 2026-06-12T09:14:22Z }",
        "Ledger synchronized. Balance: ₹449.70. Transaction sealed.",
      ],
      diagramLeft: { label: "Meta API Dispatch", value: "Session Confirmed" },
      diagramMiddle: { label: "LEDGER DEDUCT", color: "rust" },
      diagramRight: { label: "PostgreSQL Ledger", value: "Immutable Entry" },
    },
    subscription: {
      title: "Subscription Billing Cycle Tracker",
      subtitle: "RECURRING PLAN ACCOUNTING",
      desc: "Subscription plans are billed on a fixed monthly cycle via Razorpay recurring charge. Cancellation takes effect at end of the current billing period — access continues until then. No prorated refunds are issued for mid-cycle cancellations; the subscription cost covers platform infrastructure provisioned for the full billing window.",
      steps: [
        "Billing cycle: calendar month from subscription activation date",
        "Cancellation queued for period-end; access not immediately revoked",
        "No prorated refund for unused days within a paid billing window",
      ],
      terminalLogs: [
        "BILLING_ENGINE [SUBSCRIPTION TRACKER]",
        "Plan: Professional | Cycle: 2026-06-01 to 2026-06-30",
        "Cancellation request received at 2026-06-12T14:30:00Z",
        "Status: cancel_at_period_end = true | Access active until 2026-06-30",
        "Proration refund: ₹0.00 (non-prorated policy). Ledger finalized.",
      ],
      diagramLeft: { label: "Cancellation Request", value: "Mid-Cycle Event" },
      diagramMiddle: { label: "PERIOD-END", color: "amber" },
      diagramRight: { label: "Access Control", value: "Expires 30 Jun" },
    },
    review: {
      title: "Refund Review & Approval Gate",
      subtitle: "EXCEPTION CASE PROCESSING",
      desc: "Refund requests are reviewed manually by the LeapCrew AI finance team within 5 business days of submission to hello@leapcrew.ai. Only three exception categories qualify: platform downtime exceeding 72 continuous hours, documented double-charge, or a confirmed Razorpay payment processing error. Approved refunds are processed via Razorpay and credited within 7–10 business days.",
      steps: [
        "Submit request to hello@leapcrew.ai with Razorpay payment ID as proof",
        "Finance team review: 5 business days SLA from receipt",
        "Approved refunds: 7–10 business days via Razorpay reverse transfer",
      ],
      terminalLogs: [
        "REFUND_GATE [EXCEPTION REVIEW ENGINE]",
        "Incoming refund request: { ref: 'pay_OaXx9k2N3', reason: 'double_charge' }",
        "Validating against Razorpay payment ledger...",
        "Duplicate charge confirmed: pay_OaXx9k2N3 and pay_OaXx9k2N4 (same amount, same minute)",
        "Status: APPROVED | Initiating reverse transfer via Razorpay. ETA: 7-10 business days.",
      ],
      diagramLeft: { label: "Refund Submission", value: "hello@leapcrew.ai" },
      diagramMiddle: { label: "5-DAY REVIEW", color: "emerald" },
      diagramRight: { label: "Razorpay Reverse", value: "7–10 Days" },
    },
  };

  const sections = [
    {
      id: "sec-1",
      num: "01",
      title: "Wallet Credit Non-Refundability",
      content: (
        <div className="space-y-4">
          <p>
            LeapCrew AI operates on a prepaid wallet credit system. When you
            top up your workspace wallet, those credits are allocated
            exclusively for WhatsApp Business API session charges and platform
            usage costs. Credits are consumed on a per-dispatch basis and
            deducted atomically from your ledger balance.
          </p>
          <div className="bg-[#1D211F] text-[#FAF7F2] rounded-lg p-5 space-y-3 mt-4">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[#FAF7F2]/40">
              WALLET CREDIT POLICY:
            </div>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 text-[#D05E3C] shrink-0 mt-0.5" />
                <span className="text-[#FAF7F2]/85">
                  <strong className="text-white">Non-monetary:</strong> Wallet
                  credits are not legal tender, currency, or a prepaid payment
                  instrument. They hold no monetary cash value outside the
                  LeapCrew AI platform.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 text-[#D05E3C] shrink-0 mt-0.5" />
                <span className="text-[#FAF7F2]/85">
                  <strong className="text-white">Non-refundable:</strong> Once
                  a top-up transaction is confirmed by Razorpay and credits are
                  loaded to your wallet, the transaction is final and
                  non-reversible.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 text-[#D05E3C] shrink-0 mt-0.5" />
                <span className="text-[#FAF7F2]/85">
                  <strong className="text-white">Cost passthrough:</strong>{" "}
                  Funds are consumed by Meta API fees (WhatsApp Business Cloud
                  API session pricing per Meta&apos;s country index) and platform
                  infrastructure costs. LeapCrew AI does not retain a
                  refundable float.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 text-[#D05E3C] shrink-0 mt-0.5" />
                <span className="text-[#FAF7F2]/85">
                  <strong className="text-white">No expiry:</strong> Unused
                  wallet credits do not expire while your workspace subscription
                  remains active.
                </span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "sec-2",
      num: "02",
      title: "Subscription Plan Cancellation",
      content: (
        <div className="space-y-4">
          <p>
            Subscription plans may be cancelled at any time from the workspace
            billing settings. Cancellation does not immediately revoke access —
            your workspace remains fully functional until the end of the current
            paid billing period.
          </p>
          <div className="space-y-3 mt-2">
            {[
              {
                label: "Cancellation Timing",
                detail:
                  "You may cancel at any point within a billing cycle. Cancellation is effective at the end of that billing period.",
              },
              {
                label: "No Prorated Refunds",
                detail:
                  "LeapCrew AI does not issue prorated refunds for days remaining in a cancelled billing cycle. The subscription fee covers infrastructure provisioned and reserved for the full billing window.",
              },
              {
                label: "Access Until Period End",
                detail:
                  "All workspace features, active campaigns, chatbot flows, and CRM data remain fully accessible until 23:59 IST on the last day of your current billing period.",
              },
              {
                label: "Data After Cancellation",
                detail:
                  "Upon subscription expiry, your workspace enters a 30-day grace read-only period. After 30 days, workspace data is eligible for permanent deletion per our data retention policy.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="border border-[#1D211F]/8 rounded-lg p-4 bg-white space-y-1.5"
              >
                <span className="font-mono text-[9px] text-[#D05E3C] font-bold uppercase">
                  [ {item.label} ]
                </span>
                <p className="text-xs text-[#1D211F]/70 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "sec-3",
      num: "03",
      title: "Exceptional Refund Circumstances",
      content: (
        <div className="space-y-4">
          <p>
            Outside the standard non-refundable policy, LeapCrew AI will
            evaluate refund requests under the following specific, documented
            exception circumstances only:
          </p>
          <div className="space-y-3 mt-2">
            {[
              {
                title: "Platform Downtime Exceeding 72 Continuous Hours",
                desc: "If LeapCrew AI experiences a total service outage (platform inaccessible and all campaigns halted) for more than 72 consecutive hours within a single billing period, and the outage is confirmed in our incident log at status.leapcrew.ai, affected workspace owners may request a partial subscription credit proportional to the outage duration.",
                badge: "DOWNTIME SLA",
              },
              {
                title: "Documented Double-Charge",
                desc: "If your payment method is charged twice for the same billing event within the same processing minute — confirmed by matching Razorpay payment IDs — the duplicate charge will be reversed in full. Proof required: both Razorpay payment IDs and bank/card statement evidence of both charges.",
                badge: "DUPLICATE CHARGE",
              },
              {
                title: "Razorpay Payment Processing Error",
                desc: "If a Razorpay payment gateway error results in funds being debited from your account but credits not being loaded to your wallet, the issue will be investigated and the transaction either reversed or wallet credits issued manually. Razorpay transaction ID and bank statement required.",
                badge: "GATEWAY ERROR",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="border border-[#1D211F]/8 rounded-lg p-5 space-y-2.5 bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-serif text-sm font-semibold text-[#1D211F]">
                    {item.title}
                  </span>
                  <span className="font-mono text-[8px] text-[#D05E3C] uppercase tracking-wider shrink-0 pt-0.5">
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-[#1D211F]/70 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="bg-[#FAF7F2] border border-[#1D211F]/10 rounded-lg p-5 mt-2 space-y-2">
            <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">
              Not Eligible for Refund
            </h5>
            <p className="text-xs text-[#1D211F]/80 leading-relaxed">
              Meta API outages, template rejections by Meta, phone number quality
              downgrades, or campaign delivery failures caused by third-party
              infrastructure outside LeapCrew AI&apos;s control are not eligible
              for refund or credit reversal.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "sec-4",
      num: "04",
      title: "Refund Process & Timeline",
      content: (
        <div className="space-y-4">
          <p>
            To submit a refund request for an eligible exception circumstance,
            follow this process:
          </p>
          <ol className="space-y-4 mt-4">
            {[
              {
                step: "01",
                action: "Submit Request",
                detail:
                  "Email hello@leapcrew.ai with subject line: \"Refund Request — [Razorpay Payment ID]\". Include: your workspace email, the Razorpay payment ID(s), the exception category (downtime / double-charge / gateway error), and supporting documentation.",
              },
              {
                step: "02",
                action: "Review Period",
                detail:
                  "Our finance team will acknowledge receipt within 24 hours and complete the investigation within 5 business days. You will be notified of approval or rejection with a written explanation.",
              },
              {
                step: "03",
                action: "Processing if Approved",
                detail:
                  "Approved refunds are initiated via Razorpay reverse transfer to the original payment source (card or bank account). Processing time: 7–10 business days from approval date, subject to your bank's settlement schedule.",
              },
              {
                step: "04",
                action: "Confirmation",
                detail:
                  "You will receive a Razorpay refund confirmation email once the transfer is initiated. LeapCrew AI will also send a confirmation from hello@leapcrew.ai with the Razorpay refund reference ID.",
              },
            ].map((item) => (
              <li
                key={item.step}
                className="flex items-start gap-4 border-l-2 border-[#2E4A3F] pl-4"
              >
                <span className="font-mono text-xs font-bold text-[#2E4A3F] shrink-0">
                  {item.step}
                </span>
                <div className="space-y-1">
                  <span className="font-semibold text-xs text-[#1D211F]">
                    {item.action}
                  </span>
                  <p className="text-xs text-[#1D211F]/70 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ),
    },
    {
      id: "sec-5",
      num: "05",
      title: "Disputed Charges",
      content: (
        <div className="space-y-4">
          <p>
            If you believe a charge is incorrect, we strongly encourage
            contacting us at{" "}
            <strong>hello@leapcrew.ai</strong> before initiating a bank
            chargeback. Most billing discrepancies can be resolved within 5
            business days without the complexity of a formal dispute.
          </p>
          <div className="space-y-3 mt-2">
            <div className="border border-[#1D211F]/8 rounded-lg p-4 bg-white space-y-1.5">
              <span className="font-mono text-[9px] text-[#D05E3C] font-bold uppercase">
                [ Razorpay Dispute Portal ]
              </span>
              <p className="text-xs text-[#1D211F]/70 leading-relaxed">
                Razorpay provides a formal dispute resolution portal at{" "}
                <a
                  href="https://razorpay.com/support/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#D05E3C] hover:underline"
                >
                  razorpay.com/support
                </a>
                . Disputes submitted through Razorpay are governed by
                Razorpay&apos;s dispute handling policy and timelines.
              </p>
            </div>
            <div className="border border-[#1D211F]/8 rounded-lg p-4 bg-white space-y-1.5">
              <span className="font-mono text-[9px] text-[#D05E3C] font-bold uppercase">
                [ Chargeback Implications ]
              </span>
              <p className="text-xs text-[#1D211F]/70 leading-relaxed">
                Initiating a chargeback with your bank for a charge that was
                legitimately processed under this Refund Policy may result in
                immediate suspension of your LeapCrew AI workspace pending
                resolution. Workspace data will be preserved during the dispute
                period and restored upon resolution in your favour.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "sec-6",
      num: "06",
      title: "Contact",
      content: (
        <div className="space-y-4">
          <p>
            For refund requests, billing inquiries, or questions about this
            Refund Policy, reach our finance and compliance team at:
          </p>
          <div className="bg-[#1D211F] text-[#FAF7F2] rounded-lg p-6 space-y-4 mt-6">
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-[#D05E3C]" />
              <span className="font-serif text-sm font-semibold tracking-wide">
                LeapCrew AI — Finance &amp; Billing Compliance
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-[#FAF7F2]/80">
              <div>
                <span className="text-[#FAF7F2]/45 uppercase text-[9px] tracking-wider block">
                  Billing & Refund Inquiries
                </span>
                <span className="font-semibold text-white">
                  hello@leapcrew.ai
                </span>
              </div>
              <div>
                <span className="text-[#FAF7F2]/45 uppercase text-[9px] tracking-wider block">
                  Response SLA
                </span>
                <span className="font-semibold text-white">
                  Within 24 hours (business days)
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-[#FAF7F2]/10 text-[9px] font-mono text-[#FAF7F2]/40 uppercase tracking-widest">
              smritix AI LLP — India | Refund review: 5 business days
            </div>
          </div>
        </div>
      ),
    },
  ];

  const nodes: {
    id: FlowNode;
    num: string;
    label: string;
    icon: React.ElementType;
  }[] = [
    { id: "wallet", num: "01", label: "Wallet Deduction", icon: Wallet },
    { id: "subscription", num: "02", label: "Subscription Billing", icon: CreditCard },
    { id: "review", num: "03", label: "Refund Review", icon: ClipboardCheck },
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
            <span className="font-sans font-extrabold text-xl tracking-tight text-[#1D211F]">
              LeapCrew AI
            </span>
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
            <Receipt className="w-3.5 h-3.5 text-[#D05E3C]" />
            <span className="font-mono text-[9px] tracking-widest text-[#D05E3C] uppercase font-bold">
              Ledger Refund Integrity
            </span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.05] text-[#1D211F]">
            Credit ledgers,{" "}
            <span className="italic font-normal text-[#2E4A3F]">
              governed by strict integrity.
            </span>
          </h1>

          <p className="text-[#1D211F]/70 text-sm sm:text-base leading-relaxed font-medium max-w-2xl">
            LeapCrew AI&apos;s wallet credits are non-refundable by design —
            consumed entirely by Meta API fees and platform infrastructure. This
            policy documents the exceptional circumstances where refunds apply
            and the process for requesting them.
          </p>

          <div className="pt-6 flex items-center gap-6 font-mono text-[9px] tracking-widest text-[#1D211F]/40 uppercase select-none">
            <div>[ REFUND POLICY REV: v2.4.0 ]</div>
            <div>[ LAST REVISED: JUNE 1, 2026 ]</div>
          </div>
        </div>
      </section>

      {/* 3. Immersive Interactive Visual Panel */}
      <section className="py-16 md:py-20 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 border-b border-[#1D211F]/8">
        <div className="space-y-4 mb-10 text-left">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">
            [ LEDGER REFUND INTEGRITY ENGINE ]
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-[#1D211F]">
            Interactive Ledger Map:{" "}
            <span className="italic font-normal text-[#2E4A3F]">
              How billing flows
            </span>
          </h2>
          <p className="text-[#1D211F]/70 text-xs sm:text-sm max-w-2xl font-medium">
            Step through the three accounting layers that govern every
            transaction on LeapCrew AI — from wallet deductions to subscription
            billing to refund exception processing.
          </p>
        </div>

        <div className="bg-[#1D211F] text-[#FAF7F2] rounded-xl overflow-hidden shadow-2xl border border-white/10 grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">

          {/* Simulator Sidebar */}
          <div className="lg:col-span-4 bg-[#171A19] border-r border-[#FAF7F2]/8 p-6 flex flex-col justify-between select-none">
            <div className="space-y-4">
              <div className="text-[10px] font-mono tracking-widest text-[#FAF7F2]/30 uppercase pb-2 border-b border-[#FAF7F2]/5">
                LEDGER NODES:
              </div>
              <div className="space-y-2.5">
                {nodes.map((node) => {
                  const Icon = node.icon;
                  const isActive = activeNode === node.id;
                  return (
                    <button
                      key={node.id}
                      onClick={() => setActiveNode(node.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-lg text-left transition-all duration-300 border ${
                        isActive
                          ? "bg-[#2E4A3F] border-[#2E4A3F] text-white shadow-md scale-102"
                          : "bg-transparent border-[#FAF7F2]/8 text-[#FAF7F2]/55 hover:text-[#FAF7F2] hover:border-[#FAF7F2]/20"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded ${isActive ? "bg-white/10" : "bg-[#1D211F]"}`}
                        >
                          <Icon
                            className={`w-4 h-4 ${isActive ? "text-white" : "text-[#FAF7F2]/50"}`}
                          />
                        </div>
                        <span className="text-xs font-semibold tracking-wide truncate">
                          {node.label}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] opacity-40">
                        {node.num}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 border-t border-[#FAF7F2]/5 mt-8 space-y-2 text-[9px] font-mono text-[#FAF7F2]/30">
              <div className="flex items-center justify-between">
                <span>PAYMENT PROCESSOR:</span>
                <span className="text-[#FAF7F2]/70 font-bold">RAZORPAY</span>
              </div>
              <div className="flex items-center justify-between">
                <span>LEDGER INTEGRITY:</span>
                <span className="text-emerald-400 font-bold">SEALED</span>
              </div>
            </div>
          </div>

          {/* Simulator Main Workspace */}
          <div className="lg:col-span-8 p-6 md:p-8 flex flex-col justify-between bg-[#1D211F] space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-[#FAF7F2]/10 border border-[#FAF7F2]/10 text-white font-mono text-[8px] tracking-widest uppercase px-2 py-0.5 rounded font-bold">
                  Ledger Spec
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
                <span className="font-mono text-[9px] tracking-widest text-[#FAF7F2]/30 uppercase block mb-3">
                  LEDGER FLOW:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-xs font-mono">
                  <div className="bg-[#171A19] border border-[#FAF7F2]/10 p-3 rounded text-center space-y-1 select-none">
                    <span className="text-[#FAF7F2]/40 text-[8px] uppercase tracking-wider block">
                      {simulationDetails[activeNode].diagramLeft.label}
                    </span>
                    <span className="font-bold text-[#D05E3C] block">
                      {simulationDetails[activeNode].diagramLeft.value}
                    </span>
                  </div>
                  <div className="text-center flex flex-col items-center select-none">
                    <div
                      className={`w-full flex items-center justify-center gap-1.5 ${
                        simulationDetails[activeNode].diagramMiddle.color ===
                        "emerald"
                          ? "text-emerald-400 animate-pulse"
                          : simulationDetails[activeNode].diagramMiddle
                                .color === "rust"
                            ? "text-[#D05E3C]"
                            : "text-amber-400"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          simulationDetails[activeNode].diagramMiddle.color ===
                          "emerald"
                            ? "bg-emerald-400"
                            : simulationDetails[activeNode].diagramMiddle
                                  .color === "rust"
                              ? "bg-[#D05E3C]"
                              : "bg-amber-400"
                        }`}
                      />
                      <span className="text-[9px]">
                        {simulationDetails[activeNode].diagramMiddle.label}
                      </span>
                    </div>
                    <div className="text-lg text-[#FAF7F2]/30 font-bold">
                      ————&gt;
                    </div>
                  </div>
                  <div className="bg-[#2E4A3F] border border-white/10 p-3 rounded text-center space-y-1 select-none">
                    <span className="text-white/50 text-[8px] uppercase tracking-wider block">
                      {simulationDetails[activeNode].diagramRight.label}
                    </span>
                    <span className="font-bold text-white block">
                      {simulationDetails[activeNode].diagramRight.value}
                    </span>
                  </div>
                </div>
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

            {/* Terminal */}
            <div className="bg-[#171A19] border border-white/5 rounded-lg p-4 font-mono text-[10px] text-[#FAF7F2]/60 space-y-2 select-none">
              <div className="flex items-center justify-between border-b border-[#FAF7F2]/5 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-[#D05E3C]" />
                  <span className="text-[8px] text-[#FAF7F2]/30 uppercase tracking-widest">
                    Real-time Ledger Accounting Logs
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[8px] text-emerald-400">
                    LEDGER SEALED
                  </span>
                </div>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {simulationDetails[activeNode].terminalLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={
                      log.includes("synchronized") ||
                      log.includes("APPROVED") ||
                      log.includes("sealed") ||
                      log.includes("active until")
                        ? "text-emerald-400"
                        : log.includes("Deducting") ||
                            log.includes("cancel_at_period_end")
                          ? "text-amber-400"
                          : "text-[#FAF7F2]/75"
                    }
                  >
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

          {/* Left Navigation Index */}
          <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6 lg:border-r border-[#1D211F]/8 lg:pr-8 select-none">
            <div className="space-y-2">
              <span className="font-mono text-[9px] tracking-widest text-[#D05E3C] uppercase font-bold">
                Refund Policy Index
              </span>
              <h3 className="font-serif text-2xl font-light text-[#1D211F]">
                Credits &amp;{" "}
                <span className="italic font-normal text-[#2E4A3F]">
                  exceptions.
                </span>
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
                  <span className="font-mono text-[9px] opacity-55">
                    {sec.num}
                  </span>
                </button>
              ))}
            </nav>

            <div className="pt-6 border-t border-[#1D211F]/8 space-y-4">
              <div className="text-[9px] font-mono text-[#1D211F]/40 uppercase tracking-widest leading-relaxed">
                Need a print copy for finance compliance review?
              </div>
              <button
                onClick={() => window.print()}
                className="w-full text-center py-2.5 rounded border border-[#1D211F]/20 hover:border-[#1D211F]/60 text-xs font-bold uppercase tracking-wide transition-all active:scale-98"
              >
                Print Policy
              </button>
            </div>
          </div>

          {/* Right Content Column */}
          <div className="lg:col-span-8 space-y-16">
            {sections.map((sec) => (
              <div
                key={sec.id}
                id={sec.id}
                className="group border-t border-[#1D211F]/10 pt-10 scroll-mt-28 space-y-6 text-left transition-all duration-300"
              >
                <div className="flex items-baseline justify-between select-none">
                  <span className="font-mono text-[9px] tracking-widest text-[#D05E3C] uppercase font-bold">
                    REFUND PROTOCOL // {sec.num}
                  </span>
                  <span className="font-mono text-[9px] text-[#1D211F]/30 font-bold">
                    LEDGER RULE
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
              <span className="font-sans font-extrabold tracking-tight text-white text-base">
                LeapCrew AI
              </span>
            </div>
            <p className="text-[#FAF7F2]/40 max-w-sm font-medium">
              A product of smritix AI LLP, India. Architectural customer
              communication systems with secure multi-tenant CRM isolation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 md:gap-12 text-left">
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-[#FAF7F2]/30 uppercase tracking-widest">
                Environment Version
              </div>
              <div className="font-mono text-[#FAF7F2]/80 uppercase font-bold">
                v2.4.0-SaaS // SQL Secure
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-[#FAF7F2]/30 uppercase tracking-widest">
                Ledger Integrity
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-[#FAF7F2]/80 uppercase">
                  Sealed & Auditable
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-[#FAF7F2]/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-[#FAF7F2]/30 font-mono">
          <p>© 2026 smritix AI LLP. LeapCrew AI is a product of smritix AI LLP, India.</p>
          <div className="flex flex-wrap gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Operations
            </Link>
            <Link href="/legal/cookies" className="hover:text-white transition-colors">
              Cookie Policy
            </Link>
            <Link href="/legal/dpa" className="hover:text-white transition-colors">
              DPA
            </Link>
            <Link href="/legal/refund" className="hover:text-white transition-colors">
              Refund Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
