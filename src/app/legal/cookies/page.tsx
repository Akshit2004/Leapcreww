"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bot,
  ArrowLeft,
  Cookie,
  ShieldCheck,
  Database,
  Settings,
  Check,
  Terminal,
} from "lucide-react";

type FlowNode = "session" | "csrf" | "prefs";

export default function CookiesPage() {
  const [activeNode, setActiveNode] = useState<FlowNode>("session");
  const [activeSection, setActiveSection] = useState<string>("sec-1");

  const simulationDetails: Record<
    FlowNode,
    {
      title: string;
      subtitle: string;
      desc: string;
      badge: string;
      steps: string[];
      terminalLogs: string[];
      diagramLeft: { label: string; value: string };
      diagramMiddle: { label: string; color: string };
      diagramRight: { label: string; value: string };
    }
  > = {
    session: {
      title: "Session Authentication Cookie Handler",
      subtitle: "NEXTAUTH SESSION MANAGEMENT",
      desc: "The next-auth.session-token cookie is an HttpOnly, Secure, SameSite=Lax session identifier issued by NextAuth.js upon successful login. It carries a JWT-signed payload referencing your workspace session. No user-identifying data is stored inside the cookie itself — only an opaque session reference resolved server-side against PostgreSQL.",
      badge: "SESSION AUTH",
      steps: [
        "HttpOnly flag prevents JavaScript access to session token",
        "Secure flag enforces HTTPS-only transmission at all times",
        "SameSite=Lax mitigates cross-site request exposure vectors",
      ],
      terminalLogs: [
        "COOKIE_ENGINE [SESSION HANDLER ACTIVE]",
        "Issuing next-auth.session-token post successful credential check...",
        "Token payload: { sub: 'usr_9e248a3f', org: 'org_f901' }",
        "HttpOnly: true | Secure: true | SameSite: Lax",
        "Session registered in PostgreSQL session store. Cookie dispatched.",
      ],
      diagramLeft: { label: "User Login Event", value: "Credential Verified" },
      diagramMiddle: { label: "JWT SIGNED", color: "emerald" },
      diagramRight: { label: "NextAuth Issuer", value: "HttpOnly Cookie" },
    },
    csrf: {
      title: "CSRF Guard Token Enforcement",
      subtitle: "CROSS-SITE REQUEST PROTECTION",
      desc: "The next-auth.csrf-token cookie is a cryptographically paired double-submit CSRF token. It is validated on every state-mutating request (POST, PATCH, DELETE) processed through NextAuth.js endpoints. Any request presenting a mismatched or absent CSRF token is rejected with a 403 Forbidden before reaching application logic.",
      badge: "CSRF GUARD",
      steps: [
        "Double-submit cookie pattern — cookie value must match request header",
        "Regenerated on every session initiation to prevent token fixation",
        "Enforced on all mutation endpoints: sign-in, sign-out, callbacks",
      ],
      terminalLogs: [
        "CSRF_GUARD [REQUEST VALIDATION ENGINE]",
        "Incoming POST /api/auth/callback/credentials",
        "Validating x-csrf-token header against next-auth.csrf-token cookie...",
        "Token match confirmed. CSRF check: PASS",
        "Request forwarded to authentication handler. 200 OK.",
      ],
      diagramLeft: { label: "Mutation Request", value: "POST /api/auth/*" },
      diagramMiddle: { label: "TOKEN MATCH", color: "rust" },
      diagramRight: { label: "CSRF Validator", value: "403 / 200 Branch" },
    },
    prefs: {
      title: "Preference Store — UI & Consent Cookies",
      subtitle: "FUNCTIONAL PREFERENCE STORAGE",
      desc: "Two non-session cookies store user preferences: leapcrew_theme (30-day) persists your selected UI theme across sessions without server round-trips, and leapcrew_consent (365-day) records your explicit cookie consent decision so the consent banner does not re-appear. Neither cookie contains personal data; both are scoped to the leapcrew.ai domain and cannot be read by third-party scripts.",
      badge: "PREF STORE",
      steps: [
        "leapcrew_theme: UI preference, 30-day expiry, no PII stored",
        "leapcrew_consent: consent acknowledgement, 365-day expiry",
        "Both cookies are first-party, SameSite=Strict, no external exposure",
      ],
      terminalLogs: [
        "PREF_STORE [FUNCTIONAL COOKIE ENGINE]",
        "Reading leapcrew_consent cookie...",
        "Consent: { functional: true, analytics: false } | Issued: 2026-06-01",
        "Reading leapcrew_theme cookie...",
        "Theme: 'editorial-dark' | Expires in: 28 days. Preferences applied.",
      ],
      diagramLeft: { label: "Consent Banner", value: "User Accepts Prefs" },
      diagramMiddle: { label: "FIRST-PARTY", color: "amber" },
      diagramRight: { label: "Preference Store", value: "SameSite=Strict" },
    },
  };

  const sections = [
    {
      id: "sec-1",
      num: "01",
      title: "What Are Cookies",
      content: (
        <div className="space-y-4">
          <p>
            Cookies are small text files that a website stores in your browser
            when you visit. They allow the website to remember information about
            your visit — such as your login session or display preferences — so
            that interactions feel consistent and secure across page loads.
          </p>
          <p>
            LeapCrew AI uses cookies sparingly and purposefully. We do{" "}
            <strong>not</strong> use advertising networks, behavioral tracking
            pixels, or third-party analytics cookies. Our cookie footprint is
            limited to what is technically necessary to operate a secure,
            authenticated SaaS platform.
          </p>
          <div className="bg-[#2E4A3F] text-[#FAF7F2] rounded-lg p-4 mt-4">
            <p className="text-xs font-semibold">
              Meta Pixel is NOT used on any LeapCrew AI page. We do not share
              browser data with Meta Platforms Inc. for advertising purposes.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "sec-2",
      num: "02",
      title: "Cookies We Use",
      content: (
        <div className="space-y-4">
          <p>
            The following table lists every cookie set by LeapCrew AI. This list
            is exhaustive — no undisclosed cookies are placed on your device.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full text-xs text-left border-collapse border border-[#1D211F]/8">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#1D211F]/8 font-mono text-[9px] uppercase tracking-wider text-[#1D211F]/60">
                  <th className="p-3 border-r border-[#1D211F]/8">Name</th>
                  <th className="p-3 border-r border-[#1D211F]/8">Purpose</th>
                  <th className="p-3 border-r border-[#1D211F]/8">Type</th>
                  <th className="p-3">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#1D211F]/8">
                  <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C] text-[10px]">
                    next-auth.session-token
                  </td>
                  <td className="p-3 border-r border-[#1D211F]/8 font-medium">
                    Authenticated session management — identifies your logged-in
                    workspace session.
                  </td>
                  <td className="p-3 border-r border-[#1D211F]/8 font-mono text-[9px] text-[#1D211F]/60 uppercase">
                    Essential
                  </td>
                  <td className="p-3 font-mono">Session</td>
                </tr>
                <tr className="border-b border-[#1D211F]/8">
                  <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C] text-[10px]">
                    next-auth.csrf-token
                  </td>
                  <td className="p-3 border-r border-[#1D211F]/8 font-medium">
                    CSRF protection — validates that state-mutating requests
                    originate from legitimate authenticated sessions.
                  </td>
                  <td className="p-3 border-r border-[#1D211F]/8 font-mono text-[9px] text-[#1D211F]/60 uppercase">
                    Essential
                  </td>
                  <td className="p-3 font-mono">Session</td>
                </tr>
                <tr className="border-b border-[#1D211F]/8">
                  <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C] text-[10px]">
                    leapcrew_theme
                  </td>
                  <td className="p-3 border-r border-[#1D211F]/8 font-medium">
                    UI preference storage — remembers your selected interface
                    theme so it persists across browser sessions.
                  </td>
                  <td className="p-3 border-r border-[#1D211F]/8 font-mono text-[9px] text-[#1D211F]/60 uppercase">
                    Functional
                  </td>
                  <td className="p-3 font-mono">30 days</td>
                </tr>
                <tr>
                  <td className="p-3 border-r border-[#1D211F]/8 font-mono font-bold text-[#D05E3C] text-[10px]">
                    leapcrew_consent
                  </td>
                  <td className="p-3 border-r border-[#1D211F]/8 font-medium">
                    Cookie consent acknowledgement — records your decision on
                    the consent banner so it is not re-displayed unnecessarily.
                  </td>
                  <td className="p-3 border-r border-[#1D211F]/8 font-mono text-[9px] text-[#1D211F]/60 uppercase">
                    Functional
                  </td>
                  <td className="p-3 font-mono">365 days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: "sec-3",
      num: "03",
      title: "Types of Cookies",
      content: (
        <div className="space-y-4">
          <p>
            Cookie categories used across the web vary widely. LeapCrew AI
            deploys only two of the five standard categories:
          </p>
          <div className="space-y-3 mt-2">
            {[
              {
                name: "Essential Cookies",
                status: "Active",
                statusColor: "text-emerald-600",
                desc: "Strictly necessary for the platform to function. These cookies enable session authentication and CSRF protection. They cannot be disabled without breaking platform login. Covered by our legitimate interest in providing a secure, functional service.",
              },
              {
                name: "Functional Cookies",
                status: "Minimal",
                statusColor: "text-amber-600",
                desc: "Store your UI preferences and consent decisions. Not technically required for core functionality, but meaningfully improve your experience. You may clear these at any time from your browser settings — the platform will continue to work normally.",
              },
              {
                name: "Analytics Cookies",
                status: "Not Used",
                statusColor: "text-[#D05E3C]",
                desc: "We do not use third-party analytics cookies (e.g., Google Analytics, Mixpanel, Hotjar). Any usage data we collect for product improvement is aggregated server-side from application logs — no browser-level analytics tracking is performed.",
              },
            ].map((cat) => (
              <div
                key={cat.name}
                className="border border-[#1D211F]/8 rounded-lg p-4 space-y-2 bg-white"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif text-sm font-semibold text-[#1D211F]">
                    {cat.name}
                  </span>
                  <span
                    className={`font-mono text-[9px] uppercase tracking-wider font-bold ${cat.statusColor}`}
                  >
                    {cat.status}
                  </span>
                </div>
                <p className="text-xs text-[#1D211F]/70 leading-relaxed">
                  {cat.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="bg-[#FAF7F2] border border-[#1D211F]/10 rounded-lg p-5 mt-4 space-y-2">
            <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">
              Not Used: Advertising & Targeting Cookies
            </h5>
            <p className="text-xs text-[#1D211F]/80 leading-relaxed">
              LeapCrew AI does not place or permit advertising or targeting
              cookies of any kind. No retargeting pixels, no social media
              tracking scripts, no cross-site behavioral profiling.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "sec-4",
      num: "04",
      title: "Third-Party Cookies",
      content: (
        <div className="space-y-4">
          <p>
            All cookies placed on your device when using LeapCrew AI are
            first-party cookies — issued and readable only by the leapcrew.ai
            domain. We do not load scripts from third-party advertising networks
            that would result in third-party cookies being placed.
          </p>
          <div className="bg-[#1D211F] text-[#FAF7F2] rounded-lg p-5 mt-4 space-y-3">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[#FAF7F2]/40">
              THIRD-PARTY COOKIE AUDIT:
            </div>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-[#FAF7F2]/85">
                  <strong className="text-white">Meta Pixel:</strong> NOT
                  installed. LeapCrew AI does not share browser or visit data
                  with Meta Platforms Inc. for ad targeting.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-[#FAF7F2]/85">
                  <strong className="text-white">Google Analytics:</strong> NOT
                  used. No Google tracking scripts are embedded on any LeapCrew
                  AI page.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-[#FAF7F2]/85">
                  <strong className="text-white">
                    Razorpay (Payment Flows):
                  </strong>{" "}
                  Razorpay&apos;s payment modal may set its own functional
                  cookies scoped to their domain during checkout. These are
                  governed by{" "}
                  <a
                    href="https://razorpay.com/privacy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#D05E3C] hover:underline"
                  >
                    Razorpay&apos;s Privacy Policy
                  </a>
                  .
                </span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "sec-5",
      num: "05",
      title: "Managing Your Cookie Preferences",
      content: (
        <div className="space-y-4">
          <p>
            You have full control over cookies in your browser. Below are
            instructions for the most common browsers. Note that disabling
            essential cookies (session and CSRF tokens) will prevent you from
            logging into the platform.
          </p>
          <div className="space-y-3 mt-2">
            {[
              {
                browser: "Chrome",
                path: "Settings → Privacy and Security → Cookies and other site data",
              },
              {
                browser: "Firefox",
                path: "Settings → Privacy & Security → Cookies and Site Data → Manage Data",
              },
              {
                browser: "Safari",
                path: "Settings → Privacy → Manage Website Data",
              },
              {
                browser: "Edge",
                path: "Settings → Cookies and Site Permissions → Cookies and Site Data",
              },
            ].map((b) => (
              <div
                key={b.browser}
                className="border border-[#1D211F]/8 rounded-lg p-4 bg-white flex items-start gap-3"
              >
                <span className="font-mono text-[9px] text-[#D05E3C] uppercase font-bold shrink-0 pt-0.5">
                  {b.browser}
                </span>
                <span className="text-xs text-[#1D211F]/70 leading-relaxed">
                  {b.path}
                </span>
              </div>
            ))}
          </div>
          <div className="bg-[#FAF7F2] border border-[#1D211F]/10 rounded-lg p-5 mt-4 space-y-2">
            <h5 className="font-mono text-[9px] uppercase tracking-wider text-[#D05E3C] font-bold">
              Clearing leapcrew_consent
            </h5>
            <p className="text-xs text-[#1D211F]/80 leading-relaxed">
              To reset your cookie consent decision, clear the{" "}
              <code className="font-mono bg-[#1D211F]/8 px-1 rounded text-[10px]">
                leapcrew_consent
              </code>{" "}
              cookie for the leapcrew.ai domain using your browser&apos;s
              developer tools (Application → Cookies) or site data manager. The
              consent banner will re-appear on your next visit.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "sec-6",
      num: "06",
      title: "Changes to This Policy",
      content: (
        <div className="space-y-4">
          <p>
            We may update this Cookie Policy if our cookie usage changes or
            applicable regulations require updated disclosure. Any additions to
            the cookies we use will be documented in this table before they are
            deployed.
          </p>
          <p>
            Material changes will be notified via in-app banner on your next
            login. The &quot;Last Revised&quot; date at the top of this page
            reflects the most recent update. Continued use of LeapCrew AI after
            any revision constitutes acceptance of the updated policy.
          </p>
        </div>
      ),
    },
    {
      id: "sec-7",
      num: "07",
      title: "Contact",
      content: (
        <div className="space-y-4">
          <p>
            For questions about our cookie practices or to exercise data rights
            related to cookie-stored information, contact us at:
          </p>
          <div className="bg-[#1D211F] text-[#FAF7F2] rounded-lg p-6 space-y-4 mt-6">
            <div className="flex items-center gap-3">
              <Cookie className="w-5 h-5 text-[#D05E3C]" />
              <span className="font-serif text-sm font-semibold tracking-wide">
                LeapCrew AI — Privacy &amp; Cookie Compliance
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-[#FAF7F2]/80">
              <div>
                <span className="text-[#FAF7F2]/45 uppercase text-[9px] tracking-wider block">
                  Cookie Inquiries
                </span>
                <span className="font-semibold text-white">
                  hello@leapcrew.ai
                </span>
              </div>
              <div>
                <span className="text-[#FAF7F2]/45 uppercase text-[9px] tracking-wider block">
                  Grievance Officer (India)
                </span>
                <span className="font-semibold text-white">
                  grievance@leapcrew.ai
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-[#FAF7F2]/10 text-[9px] font-mono text-[#FAF7F2]/40 uppercase tracking-widest">
              smritix AI LLP — India | Response within 72 hours
            </div>
          </div>
        </div>
      ),
    },
  ];

  const nodes: { id: FlowNode; num: string; label: string; icon: React.ElementType }[] = [
    { id: "session", num: "01", label: "Session Auth", icon: ShieldCheck },
    { id: "csrf", num: "02", label: "CSRF Guard", icon: Settings },
    { id: "prefs", num: "03", label: "Preference Store", icon: Database },
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
            <Cookie className="w-3.5 h-3.5 text-[#D05E3C]" />
            <span className="font-mono text-[9px] tracking-widest text-[#D05E3C] uppercase font-bold">
              Cookie Consent Enforcement
            </span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.05] text-[#1D211F]">
            Minimal cookies,{" "}
            <span className="italic font-normal text-[#2E4A3F]">
              maximum transparency.
            </span>
          </h1>

          <p className="text-[#1D211F]/70 text-sm sm:text-base leading-relaxed font-medium max-w-2xl">
            LeapCrew AI places only what is strictly necessary to secure your
            session and remember your preferences. No advertising networks. No
            behavioral tracking. No Meta Pixel.
          </p>

          <div className="pt-6 flex items-center gap-6 font-mono text-[9px] tracking-widest text-[#1D211F]/40 uppercase select-none">
            <div>[ COOKIE SPEC REV: v2.4.0 ]</div>
            <div>[ LAST REVISED: JUNE 1, 2026 ]</div>
          </div>
        </div>
      </section>

      {/* 3. Immersive Interactive Visual Panel */}
      <section className="py-16 md:py-20 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 border-b border-[#1D211F]/8">
        <div className="space-y-4 mb-10 text-left">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">
            [ COOKIE CONSENT ENFORCEMENT ENGINE ]
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-[#1D211F]">
            Interactive Cookie Map:{" "}
            <span className="italic font-normal text-[#2E4A3F]">
              How each cookie works
            </span>
          </h2>
          <p className="text-[#1D211F]/70 text-xs sm:text-sm max-w-2xl font-medium">
            Step through each cookie category to understand its technical
            purpose, security attributes, and lifecycle within the LeapCrew AI
            session architecture.
          </p>
        </div>

        <div className="bg-[#1D211F] text-[#FAF7F2] rounded-xl overflow-hidden shadow-2xl border border-white/10 grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">

          {/* Simulator Sidebar */}
          <div className="lg:col-span-4 bg-[#171A19] border-r border-[#FAF7F2]/8 p-6 flex flex-col justify-between select-none">
            <div className="space-y-4">
              <div className="text-[10px] font-mono tracking-widest text-[#FAF7F2]/30 uppercase pb-2 border-b border-[#FAF7F2]/5">
                COOKIE NODES:
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
                <span>ADVERTISING COOKIES:</span>
                <span className="text-[#D05E3C] font-bold">NONE USED</span>
              </div>
              <div className="flex items-center justify-between">
                <span>TRACKING PIXELS:</span>
                <span className="text-[#D05E3C] font-bold">BLOCKED</span>
              </div>
            </div>
          </div>

          {/* Simulator Main Workspace */}
          <div className="lg:col-span-8 p-6 md:p-8 flex flex-col justify-between bg-[#1D211F] space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-[#FAF7F2]/10 border border-[#FAF7F2]/10 text-white font-mono text-[8px] tracking-widest uppercase px-2 py-0.5 rounded font-bold">
                  Cookie Spec
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
                  COOKIE FLOW:
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
                    Real-time Cookie Telemetry
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[8px] text-emerald-400">
                    CONSENT ENFORCED
                  </span>
                </div>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {simulationDetails[activeNode].terminalLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={
                      log.includes("PASS") ||
                      log.includes("dispatched") ||
                      log.includes("applied") ||
                      log.includes("registered")
                        ? "text-emerald-400"
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
                Cookie Policy Index
              </span>
              <h3 className="font-serif text-2xl font-light text-[#1D211F]">
                What we store,{" "}
                <span className="italic font-normal text-[#2E4A3F]">
                  and why.
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
                Need a print copy for data compliance review?
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
                    COOKIE PROTOCOL // {sec.num}
                  </span>
                  <span className="font-mono text-[9px] text-[#1D211F]/30 font-bold">
                    CONSENT BOUNDARY
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
                Cookie Status
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-[#FAF7F2]/80 uppercase">
                  Consent Enforced
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
