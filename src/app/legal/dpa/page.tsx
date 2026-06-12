"use client";

import React, { useState } from "react";
import Link from "next/link";
import {

  ArrowLeft,
  FileText,
  Cpu,
  GitBranch,
  UserCheck,
  Check,
  Terminal,
  ShieldCheck,
} from "lucide-react";

type FlowNode = "instruction" | "subprocessor" | "dsr";

export default function DpaPage() {
  const [activeNode, setActiveNode] = useState<FlowNode>("instruction");
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
    instruction: {
      title: "Instruction Processing — Controller Commands",
      subtitle: "DOCUMENTED INSTRUCTION ENFORCEMENT",
      desc: "LeapCrew AI (Processor) processes personal data exclusively in accordance with documented instructions from the Organization (Controller). Instructions are embedded in workspace configuration: which contacts to message, which templates to use, which webhook sources to ingest. No data processing occurs outside these documented boundaries. Any request to process data outside instruction scope triggers an immediate compliance alert.",
      steps: [
        "All processing operations traced to a documented Controller instruction",
        "Undocumented processing requests rejected at API layer with 403 Forbidden",
        "Controller instruction audit log maintained in immutable system log table",
      ],
      terminalLogs: [
        "INSTRUCTION_ENGINE [CONTROLLER INSTRUCTION VALIDATOR]",
        "Incoming processing request: broadcast_campaign_id=camp_9a3f...",
        "Validating against Controller documented instructions...",
        "Instruction match: { type: 'campaign_broadcast', authorized: true }",
        "Processing authorized. Dispatch initiated under Controller instruction.",
      ],
      diagramLeft: { label: "Controller Config", value: "Workspace Instructions" },
      diagramMiddle: { label: "INSTRUCTION GATE", color: "emerald" },
      diagramRight: { label: "Processor Engine", value: "Authorized Dispatch" },
    },
    subprocessor: {
      title: "Sub-Processor Chain Compliance",
      subtitle: "EU SCC & ADEQUACY CHAIN",
      desc: "LeapCrew AI engages three sub-processors: Meta Platforms Inc. (WhatsApp delivery), Razorpay (payment processing), and a cloud hosting provider (infrastructure). Each sub-processor engagement is governed by a Data Processing Agreement. EU data transfers are covered by Standard Contractual Clauses (SCCs) or adequacy decisions. The sub-processor chain is disclosed to Controllers in full.",
      steps: [
        "Meta Platforms Inc.: WhatsApp Cloud API — EU SCCs in place",
        "Razorpay Software Pvt. Ltd.: Payments — Indian entity, DPDP Act compliant",
        "Cloud Hosting Provider: Infrastructure — AES-256 at rest, TLS 1.3 in transit",
      ],
      terminalLogs: [
        "SUBPROCESSOR_CHAIN [COMPLIANCE AUDIT ENGINE]",
        "Auditing sub-processor engagement: Meta Platforms Inc.",
        "EU SCCs: active | Adequacy: Meta-EU DPA signed | Status: COMPLIANT",
        "Auditing sub-processor: Razorpay Software Pvt. Ltd.",
        "DPDP Act 2023 compliance: confirmed | India-to-India transfer: no SCC needed.",
      ],
      diagramLeft: { label: "Controller Data", value: "EU/India Subjects" },
      diagramMiddle: { label: "SCC CHAIN", color: "amber" },
      diagramRight: { label: "Sub-Processors", value: "Meta / Razorpay / Cloud" },
    },
    dsr: {
      title: "Data Subject Rights — Fulfilment Handler",
      subtitle: "DSR ASSISTANCE WITHIN 72 HOURS",
      desc: "When a Controller receives a Data Subject Rights (DSR) request — access, rectification, deletion, portability, objection — LeapCrew AI provides the technical assistance necessary for the Controller to fulfil it. DSR assistance is initiated within 72 hours of the Controller's written request to LeapCrew AI. Deletion requests result in permanent scrubbing of the relevant tenant data within 48 hours of confirmation.",
      steps: [
        "Controller submits DSR assistance request to hello@leapcrew.ai",
        "LeapCrew AI responds with scoped data export or deletion within 72 hours",
        "Deletion: permanent tenant data scrub in 48 hours of confirmed request",
      ],
      terminalLogs: [
        "DSR_HANDLER [DATA SUBJECT RIGHTS ENGINE]",
        "Incoming DSR assistance request from Controller (org_f901)...",
        "DSR type: RIGHT_TO_DELETION | Subject: phone +91-98765-XXXXX",
        "Locating all records: contacts, campaign logs, webhook events...",
        "Permanent deletion queued. All records scrubbed within 48h. DSR fulfilled.",
      ],
      diagramLeft: { label: "Data Subject", value: "DSR Request to Controller" },
      diagramMiddle: { label: "72H ASSIST", color: "rust" },
      diagramRight: { label: "LeapCrew Processor", value: "Scrub / Export" },
    },
  };

  const sections = [
    {
      id: "sec-1",
      num: "01",
      title: "Definitions",
      content: (
        <div className="space-y-4">
          <p>
            For the purposes of this Data Processing Agreement, the following
            terms carry the meanings defined below:
          </p>
          <div className="space-y-3 mt-2">
            {[
              {
                term: "Controller",
                def: "The Organization (legal entity) that determines the purposes and means of processing personal data within its LeapCrew AI workspace. The Controller is solely responsible for ensuring a lawful basis for processing.",
              },
              {
                term: "Processor",
                def: "LeapCrew AI (smritix AI LLP), which processes personal data on behalf of and under the instructions of the Controller.",
              },
              {
                term: "Data Subject",
                def: "Any identified or identifiable natural person whose personal data is processed. In the context of LeapCrew AI, Data Subjects are primarily the contacts in the Controller&apos;s CRM who receive WhatsApp communications.",
              },
              {
                term: "Personal Data",
                def: "Any information relating to an identified or identifiable natural person, including but not limited to: name, phone number, and message interaction metadata.",
              },
              {
                term: "Processing",
                def: "Any operation performed on personal data, including collection, storage, transmission, retrieval, use, and deletion.",
              },
              {
                term: "Sub-Processor",
                def: "A third party engaged by the Processor (LeapCrew AI) to carry out specific processing activities on behalf of the Controller. LeapCrew AI remains responsible for the Sub-Processors it engages.",
              },
            ].map((item) => (
              <div
                key={item.term}
                className="border border-[#1D211F]/8 rounded-lg p-4 space-y-1.5 bg-white"
              >
                <span className="font-mono text-[9px] text-[#D05E3C] font-bold uppercase">
                  [ {item.term} ]
                </span>
                <p className="text-xs text-[#1D211F]/70 leading-relaxed">
                  {item.def}
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "sec-2",
      num: "02",
      title: "Scope & Subject Matter",
      content: (
        <div className="space-y-4">
          <p>
            This DPA governs the processing of personal data by LeapCrew AI on
            behalf of the Controller in connection with the provision of the
            LeapCrew AI SaaS platform.
          </p>
          <div className="space-y-3">
            <div className="bg-[#FAF7F2] border border-[#1D211F]/10 rounded-lg p-5 space-y-3">
              <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">
                Categories of Personal Data Processed
              </h5>
              <ul className="space-y-2 text-xs text-[#1D211F]/80">
                <li className="flex items-start gap-2.5">
                  <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
                  <span>
                    <strong>Contact identifiers:</strong> Phone numbers, names,
                    and email addresses in the CRM.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
                  <span>
                    <strong>Message metadata:</strong> Delivery timestamps,
                    read receipts, and campaign association IDs (no message
                    body content is retained by LeapCrew AI beyond the
                    Controller&apos;s active session).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
                  <span>
                    <strong>Webhook event data:</strong> Contact identifiers and
                    event payloads ingested from Shopify, WooCommerce, or
                    custom integrations as configured by the Controller.
                  </span>
                </li>
              </ul>
            </div>
            <div className="bg-[#FAF7F2] border border-[#1D211F]/10 rounded-lg p-5 space-y-3">
              <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">
                Purposes of Processing
              </h5>
              <ul className="space-y-2 text-xs text-[#1D211F]/80">
                <li className="flex items-start gap-2.5">
                  <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
                  <span>Campaign delivery via WhatsApp Business Cloud API.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
                  <span>
                    Chatbot flow routing and conversational automation.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
                  <span>
                    Webhook ingestion and CRM synchronisation from external
                    commerce platforms.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "sec-3",
      num: "03",
      title: "Controller & Processor Obligations",
      content: (
        <div className="space-y-4">
          <p>
            The Organization (Controller) and LeapCrew AI (Processor) agree to
            the following allocation of obligations:
          </p>
          <div className="space-y-3 mt-2">
            <div className="border border-[#1D211F]/8 rounded-lg p-5 space-y-3 bg-white">
              <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">
                Controller Obligations
              </h5>
              <ul className="space-y-2 text-xs text-[#1D211F]/80">
                {[
                  "Ensure a valid lawful basis for processing Data Subjects' personal data before importing into LeapCrew AI.",
                  "Obtain explicit opt-in consent from all CRM contacts before sending WhatsApp communications.",
                  "Respond to Data Subject Rights requests, with LeapCrew AI's technical assistance where required.",
                  "Notify LeapCrew AI promptly of any DSR, regulatory inquiry, or supervisory authority request.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-[#1D211F]/8 rounded-lg p-5 space-y-3 bg-white">
              <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">
                Processor Obligations (LeapCrew AI)
              </h5>
              <ul className="space-y-2 text-xs text-[#1D211F]/80">
                {[
                  "Process personal data only on documented Controller instructions; flag and refuse any undocumented processing request.",
                  "Maintain confidentiality: all personnel with access to personal data are bound by confidentiality obligations.",
                  "Implement and maintain the security measures described in Section 6.",
                  "Engage Sub-Processors only under the terms of Section 4; remain responsible for their compliance.",
                  "Provide all reasonable assistance to the Controller in fulfilling DSRs, DPIAs, and regulatory cooperation.",
                  "Notify the Controller of any personal data breach within 72 hours of becoming aware.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "sec-4",
      num: "04",
      title: "Sub-Processors",
      content: (
        <div className="space-y-4">
          <p>
            LeapCrew AI engages the following Sub-Processors to deliver
            platform services. The Controller authorises these engagements by
            accepting this DPA. LeapCrew AI will notify Controllers of any
            material Sub-Processor changes with 30 days advance notice.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full text-xs text-left border-collapse border border-[#1D211F]/8">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#1D211F]/8 font-mono text-[9px] uppercase tracking-wider text-[#1D211F]/60">
                  <th className="p-3 border-r border-[#1D211F]/8">
                    Sub-Processor
                  </th>
                  <th className="p-3 border-r border-[#1D211F]/8">Purpose</th>
                  <th className="p-3 border-r border-[#1D211F]/8">Location</th>
                  <th className="p-3">Transfer Basis</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#1D211F]/8">
                  <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C] text-[10px]">
                    Meta Platforms Inc.
                  </td>
                  <td className="p-3 border-r border-[#1D211F]/8 font-medium">
                    WhatsApp Business Cloud API — message delivery
                  </td>
                  <td className="p-3 border-r border-[#1D211F]/8">USA / EU</td>
                  <td className="p-3 font-mono text-[10px]">
                    Meta-EU DPA + EU SCCs
                  </td>
                </tr>
                <tr className="border-b border-[#1D211F]/8">
                  <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C] text-[10px]">
                    Razorpay Software Pvt. Ltd.
                  </td>
                  <td className="p-3 border-r border-[#1D211F]/8 font-medium">
                    Payment processing — wallet top-ups, subscription billing
                  </td>
                  <td className="p-3 border-r border-[#1D211F]/8">India</td>
                  <td className="p-3 font-mono text-[10px]">
                    India — DPDP Act 2023
                  </td>
                </tr>
                <tr>
                  <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C] text-[10px]">
                    Cloud Hosting Provider
                  </td>
                  <td className="p-3 border-r border-[#1D211F]/8 font-medium">
                    Infrastructure, database hosting, and compute
                  </td>
                  <td className="p-3 border-r border-[#1D211F]/8">India / EU</td>
                  <td className="p-3 font-mono text-[10px]">
                    EU SCCs or Adequacy Decision
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: "sec-5",
      num: "05",
      title: "Data Subject Rights Assistance",
      content: (
        <div className="space-y-4">
          <p>
            LeapCrew AI will provide the Controller with technical assistance
            to fulfil Data Subject Rights requests under GDPR, the DPDP Act
            2023, and applicable data protection law.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {[
              {
                right: "Right of Access",
                desc: "LeapCrew AI will export all personal data held for a specific Data Subject within 72 hours of the Controller's written request.",
              },
              {
                right: "Right to Rectification",
                desc: "LeapCrew AI will correct inaccurate personal data on the Controller's documented instruction.",
              },
              {
                right: "Right to Deletion",
                desc: "All personal data records for the specified Data Subject will be permanently scrubbed from all systems within 48 hours of confirmed Controller instruction.",
              },
              {
                right: "Right to Portability",
                desc: "Data exports are provided in structured JSON or CSV format, scoped to the requesting Data Subject's records.",
              },
              {
                right: "Right to Object",
                desc: "LeapCrew AI will cease processing for the specified Data Subject on documented Controller instruction; this may limit certain platform features.",
              },
              {
                right: "Assistance Timeline",
                desc: "LeapCrew AI commits to a maximum 72-hour response SLA for all DSR assistance requests from Controllers. Deletion execution: 48 hours.",
              },
            ].map((item) => (
              <div
                key={item.right}
                className="border border-[#1D211F]/8 rounded-lg p-4 bg-white space-y-1.5"
              >
                <span className="font-mono text-[9px] text-[#D05E3C] font-bold uppercase">
                  [ {item.right} ]
                </span>
                <p className="text-xs text-[#1D211F]/70 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "sec-6",
      num: "06",
      title: "Security Measures",
      content: (
        <div className="space-y-4">
          <p>
            LeapCrew AI implements the following technical and organisational
            security measures appropriate to the risk presented by processing
            personal data:
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full text-xs text-left border-collapse border border-[#1D211F]/8">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#1D211F]/8 font-mono text-[9px] uppercase tracking-wider text-[#1D211F]/60">
                  <th className="p-3 border-r border-[#1D211F]/8">Layer</th>
                  <th className="p-3 border-r border-[#1D211F]/8">Measure</th>
                  <th className="p-3">Standard</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    layer: "Data in Transit",
                    measure: "All API, web, and webhook traffic encrypted",
                    std: "TLS 1.3",
                  },
                  {
                    layer: "Data at Rest",
                    measure: "PostgreSQL storage encryption",
                    std: "AES-256-GCM",
                  },
                  {
                    layer: "Tenant Isolation",
                    measure: "Row-Level Security prevents cross-tenant queries",
                    std: "PostgreSQL RLS + JWT",
                  },
                  {
                    layer: "Access Control",
                    measure:
                      "Production access restricted to named engineers with MFA",
                    std: "Principle of Least Privilege",
                  },
                  {
                    layer: "Secrets Management",
                    measure:
                      "Meta tokens, webhook keys encrypted in database fields",
                    std: "AES-256-GCM encrypted fields",
                  },
                  {
                    layer: "Audit & Review",
                    measure: "Annual security review; breach response plan",
                    std: "Internal + Third-Party Audit",
                  },
                ].map((row) => (
                  <tr key={row.layer} className="border-b border-[#1D211F]/8 last:border-0">
                    <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C] text-[10px]">
                      {row.layer}
                    </td>
                    <td className="p-3 border-r border-[#1D211F]/8 font-medium">
                      {row.measure}
                    </td>
                    <td className="p-3 font-mono text-[10px] text-[#1D211F]/70">
                      {row.std}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: "sec-7",
      num: "07",
      title: "International Data Transfers",
      content: (
        <div className="space-y-4">
          <p>
            Personal data may be transferred to or processed in jurisdictions
            outside the European Economic Area (EEA) or India in the course of
            delivering the LeapCrew AI platform. All such transfers are governed
            by appropriate safeguards:
          </p>
          <div className="space-y-3 mt-2">
            {[
              {
                jurisdiction: "European Union / EEA Controllers",
                detail:
                  "Transfers to LeapCrew AI (India) and to Meta Platforms Inc. (USA) are covered by Standard Contractual Clauses (SCCs) under EU GDPR Article 46(2)(c). Controllers in the EU may request copies of applicable SCCs from hello@leapcrew.ai.",
              },
              {
                jurisdiction: "India (DPDP Act 2023)",
                detail:
                  "Processing of data pertaining to Indian Data Principals is conducted in compliance with the Digital Personal Data Protection Act 2023. Razorpay processes payment data within India under applicable Indian law.",
              },
              {
                jurisdiction: "Meta Cloud API Transfers",
                detail:
                  "Message data transmitted via the WhatsApp Business Cloud API is processed by Meta Platforms Inc. under Meta's own Data Processing Terms and EU SCCs. LeapCrew AI acts as a downstream controller in this chain.",
              },
            ].map((item) => (
              <div
                key={item.jurisdiction}
                className="border border-[#1D211F]/8 rounded-lg p-4 space-y-1.5 bg-white"
              >
                <span className="font-mono text-[9px] text-[#D05E3C] font-bold uppercase">
                  {item.jurisdiction}
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
      id: "sec-8",
      num: "08",
      title: "Data Retention & Deletion",
      content: (
        <div className="space-y-4">
          <p>
            LeapCrew AI retains personal data only for the duration required to
            deliver the service and meet legal obligations:
          </p>
          <ul className="space-y-2 text-xs text-[#1D211F]/80">
            <li className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
              <span>
                <strong>Active workspace data</strong> (contacts, campaigns,
                chatbot nodes, system logs) is retained for the duration of the
                Controller&apos;s active subscription.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
              <span>
                <strong>Upon workspace termination</strong> or written request,
                all personal data within the Controller&apos;s tenant schema is
                permanently and irreversibly deleted within <strong>48 hours</strong> of confirmation.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
              <span>
                <strong>Billing and transaction records</strong> are retained for
                up to 7 years as required by Indian tax and accounting law
                (Income Tax Act, GST Act).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-3.5 h-3.5 text-[#2E4A3F] shrink-0 mt-0.5" />
              <span>
                <strong>Anonymised aggregated analytics</strong> (e.g.,
                campaign delivery rates with no identifiers) may be retained
                indefinitely for product improvement.
              </span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "sec-9",
      num: "09",
      title: "Audit Rights",
      content: (
        <div className="space-y-4">
          <p>
            The Controller has the right to verify LeapCrew AI&apos;s compliance
            with the obligations under this DPA, subject to the following
            conditions:
          </p>
          <div className="space-y-3 mt-2">
            {[
              {
                label: "Annual Audit Right",
                detail:
                  "The Controller may request one audit per calendar year. Audits must be scoped to processing activities relevant to the Controller's data and conducted by the Controller or a mutually agreed third-party auditor.",
              },
              {
                label: "Notice Period",
                detail:
                  "A minimum of 30 days written notice is required before commencing an audit. Audits must be scheduled to minimise disruption to platform operations.",
              },
              {
                label: "Audit Costs",
                detail:
                  "The Controller bears the costs of any audit conducted at its request. LeapCrew AI will cooperate fully at no additional charge for reasonable documentation requests.",
              },
              {
                label: "Certification Alternative",
                detail:
                  "LeapCrew AI may satisfy the Controller's audit request by providing relevant third-party security assessment reports (e.g., penetration test results, SOC2 reports) where available.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="border border-[#1D211F]/8 rounded-lg p-4 space-y-1.5 bg-white"
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
      id: "sec-10",
      num: "10",
      title: "Governing Law",
      content: (
        <div className="space-y-4">
          <p>
            This Data Processing Agreement is governed by and construed in
            accordance with the laws of India.
          </p>
          <div className="space-y-3 mt-2">
            <div className="border border-[#1D211F]/8 rounded-lg p-4 space-y-1.5 bg-white">
              <span className="font-mono text-[9px] text-[#D05E3C] font-bold uppercase">
                [ Indian Law — Dispute Resolution ]
              </span>
              <p className="text-xs text-[#1D211F]/70 leading-relaxed">
                Any dispute arising under this DPA shall be resolved by
                arbitration under the Indian Arbitration and Conciliation Act
                1996, with the seat of arbitration in Bengaluru, India.
              </p>
            </div>
            <div className="border border-[#1D211F]/8 rounded-lg p-4 space-y-1.5 bg-white">
              <span className="font-mono text-[9px] text-[#D05E3C] font-bold uppercase">
                [ EU GDPR Controllers ]
              </span>
              <p className="text-xs text-[#1D211F]/70 leading-relaxed">
                For Controllers subject to EU GDPR, the applicable supervisory
                authority is the data protection authority of the Controller&apos;s
                EU Member State. LeapCrew AI cooperates with all supervisory
                authority investigations.
              </p>
            </div>
            <div className="border border-[#1D211F]/8 rounded-lg p-4 space-y-1.5 bg-white">
              <span className="font-mono text-[9px] text-[#D05E3C] font-bold uppercase">
                [ India DPDP Act 2023 ]
              </span>
              <p className="text-xs text-[#1D211F]/70 leading-relaxed">
                Processing of personal data of Indian Data Principals is subject
                to the Digital Personal Data Protection Act 2023. The Data
                Protection Board of India (DPBI) is the competent supervisory
                authority for Indian data subjects.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "sec-11",
      num: "11",
      title: "Contact & DPO",
      content: (
        <div className="space-y-4">
          <p>
            For DPA inquiries, data breach notifications, DSR assistance
            requests, or cooperation with supervisory authorities, contact
            LeapCrew AI&apos;s compliance team:
          </p>
          <div className="bg-[#1D211F] text-[#FAF7F2] rounded-lg p-6 space-y-4 mt-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#D05E3C]" />
              <span className="font-serif text-sm font-semibold tracking-wide">
                LeapCrew AI — Data Protection &amp; Compliance
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-[#FAF7F2]/80">
              <div>
                <span className="text-[#FAF7F2]/45 uppercase text-[9px] tracking-wider block">
                  DPA &amp; Compliance Inquiries
                </span>
                <span className="font-semibold text-white">
                  hello@leapcrew.ai
                </span>
              </div>
              <div>
                <span className="text-[#FAF7F2]/45 uppercase text-[9px] tracking-wider block">
                  Grievance Officer (India DPDP Act)
                </span>
                <span className="font-semibold text-white">
                  grievance@leapcrew.ai
                </span>
              </div>
              <div>
                <span className="text-[#FAF7F2]/45 uppercase text-[9px] tracking-wider block">
                  Breach Notification
                </span>
                <span className="font-semibold text-white">
                  hello@leapcrew.ai (72h SLA)
                </span>
              </div>
              <div>
                <span className="text-[#FAF7F2]/45 uppercase text-[9px] tracking-wider block">
                  Registered Entity
                </span>
                <span className="font-semibold text-white">
                  smritix AI LLP, India
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-[#FAF7F2]/10 text-[9px] font-mono text-[#FAF7F2]/40 uppercase tracking-widest">
              smritix AI LLP — India | DSR assistance: within 72 hours
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
    { id: "instruction", num: "01", label: "Instruction Processing", icon: Cpu },
    { id: "subprocessor", num: "02", label: "Sub-Processor Chain", icon: GitBranch },
    { id: "dsr", num: "03", label: "DSR Handler", icon: UserCheck },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1D211F] flex flex-col font-sans overflow-x-hidden selection:bg-[#2E4A3F] selection:text-[#FAF7F2] relative">

      {/* 1. Sticky Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#1D211F]/8 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/leapcrew-logo.png" alt="LeapCrew AI" className="h-11 w-auto object-contain transition-opacity group-hover:opacity-75" style={{ maxWidth: 180, background: "none" }} />
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
            <span className="font-mono text-[9px] tracking-widest text-[#D05E3C] uppercase font-bold">
              DPA Compliance Enforcement
            </span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.05] text-[#1D211F]">
            Processing on instruction,{" "}
            <span className="italic font-normal text-[#2E4A3F]">
              never beyond.
            </span>
          </h1>

          <p className="text-[#1D211F]/70 text-sm sm:text-base leading-relaxed font-medium max-w-2xl">
            This Data Processing Agreement formalises the Controller–Processor
            relationship between your Organisation and LeapCrew AI (smritix AI
            LLP). It governs how we process personal data on your behalf in
            strict compliance with GDPR, the DPDP Act 2023, and applicable
            Indian law.
          </p>

          <div className="pt-6 flex items-center gap-6 font-mono text-[9px] tracking-widest text-[#1D211F]/40 uppercase select-none">
            <div>[ DPA SPEC REV: v2.4.0 ]</div>
            <div>[ LAST REVISED: JUNE 1, 2026 ]</div>
          </div>
        </div>
      </section>

      {/* 3. Immersive Interactive Visual Panel */}
      <section className="py-16 md:py-20 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 border-b border-[#1D211F]/8">
        <div className="space-y-4 mb-10 text-left">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">
            [ DPA COMPLIANCE ENFORCEMENT LAYER ]
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-[#1D211F]">
            Interactive Compliance Map:{" "}
            <span className="italic font-normal text-[#2E4A3F]">
              How processing is governed
            </span>
          </h2>
          <p className="text-[#1D211F]/70 text-xs sm:text-sm max-w-2xl font-medium">
            Step through the three compliance enforcement layers — instruction
            validation, sub-processor chain, and data subject rights handling —
            to understand how LeapCrew AI enforces this DPA technically.
          </p>
        </div>

        <div className="bg-[#1D211F] text-[#FAF7F2] rounded-xl overflow-hidden shadow-2xl border border-white/10 grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">

          {/* Simulator Sidebar */}
          <div className="lg:col-span-4 bg-[#171A19] border-r border-[#FAF7F2]/8 p-6 flex flex-col justify-between select-none">
            <div className="space-y-4">
              <div className="text-[10px] font-mono tracking-widest text-[#FAF7F2]/30 uppercase pb-2 border-b border-[#FAF7F2]/5">
                DPA NODES:
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
                <span>GDPR COMPLIANCE:</span>
                <span className="text-emerald-400 font-bold">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between">
                <span>DPDP ACT 2023:</span>
                <span className="text-emerald-400 font-bold">ENFORCED</span>
              </div>
            </div>
          </div>

          {/* Simulator Main Workspace */}
          <div className="lg:col-span-8 p-6 md:p-8 flex flex-col justify-between bg-[#1D211F] space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-[#FAF7F2]/10 border border-[#FAF7F2]/10 text-white font-mono text-[8px] tracking-widest uppercase px-2 py-0.5 rounded font-bold">
                  DPA Spec
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
                  COMPLIANCE FLOW:
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
                    DPA Compliance Engine Telemetry
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[8px] text-emerald-400">
                    DPA ENFORCED
                  </span>
                </div>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {simulationDetails[activeNode].terminalLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={
                      log.includes("authorized") ||
                      log.includes("COMPLIANT") ||
                      log.includes("fulfilled") ||
                      log.includes("within 48h")
                        ? "text-emerald-400"
                        : log.includes("Deducting") || log.includes("needed")
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
                DPA Index
              </span>
              <h3 className="font-serif text-2xl font-light text-[#1D211F]">
                Processing{" "}
                <span className="italic font-normal text-[#2E4A3F]">
                  boundaries.
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
                Need a signed DPA for enterprise compliance review?
              </div>
              <button
                onClick={() => window.print()}
                className="w-full text-center py-2.5 rounded border border-[#1D211F]/20 hover:border-[#1D211F]/60 text-xs font-bold uppercase tracking-wide transition-all active:scale-98"
              >
                Print DPA
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
                    DPA CLAUSE // {sec.num}
                  </span>
                  <span className="font-mono text-[9px] text-[#1D211F]/30 font-bold">
                    LEGAL BOUNDARY
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
            <div className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/leapcrew-logo.png" alt="LeapCrew AI" className="h-10 w-auto object-contain brightness-0 invert" style={{ maxWidth: 160, background: "none" }} />
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
                DPA Status
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-[#FAF7F2]/80 uppercase">
                  Enforced & Auditable
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
