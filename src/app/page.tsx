"use client";

import React from "react";
import Link from "next/link";
import { 
  Bot, 
  MessageSquare, 
  Megaphone, 
  Cpu, 
  ArrowRight,
  Sparkles,
  CheckCircle,
  ExternalLink
} from "lucide-react";

export default function LandingPage() {
  const features = [
    {
      title: "Shared Team Inbox",
      desc: "Connect your team to a single WhatsApp number. Assign leads, manage dynamic unread badges, and automate live support flows instantly.",
      icon: MessageSquare,
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      title: "Smart Campaign Broadcasts",
      desc: "Launch pre-approved templates to targeted tag lists. Track Sent, Delivered, Read, and Click-Through rates with live database metrics.",
      icon: Megaphone,
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      title: "Visual Chatbot Visualizer",
      desc: "Design conversational paths with triggers and option routing nodes. Test visual workflows in our real-time simulated smartphone frame.",
      icon: Bot,
      color: "text-purple-500 bg-purple-500/10",
    },
    {
      title: "Webhook Integrations",
      desc: "Connect Shopify abandoned cart webhooks, WooCommerce invoice triggers, and Google Sheets sync integrations natively.",
      icon: Cpu,
      color: "text-teal-500 bg-teal-500/10",
    },
  ];

  const pricing = [
    {
      name: "Startup Core",
      price: "$15",
      period: "per month",
      desc: "Perfect for growing businesses exploring WhatsApp outreach.",
      features: [
        "1 Workspace Seat",
        "Up to 1,000 CRM Contacts",
        "Pre-approved Meta Templates",
        "Core Campaigns Broadcasts",
        "Standard Webhook Logs",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Growth Scaler",
      price: "$29",
      period: "per month",
      desc: "Designed for scaling brands needing visual automation.",
      features: [
        "Unlimited Support Agents",
        "Up to 10,000 Sync Contacts",
        "Visual Chatbots Flow Builder",
        "Shopify & WooCommerce webhooks",
        "Advanced Click-Through Analytics",
      ],
      cta: "Go Unlimited Now",
      popular: true,
    },
    {
      name: "Enterprise Custom",
      price: "Custom",
      period: "dedicated WABA",
      desc: "For large-scale messaging with high volume SLA.",
      features: [
        "Dedicated Meta Cloud APIs",
        "Custom Database Clusters",
        "Dedicated Support Managers",
        "Uncapped Message Cadence",
        "Private API Custom Webhooks",
      ],
      cta: "Schedule Demo Call",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-slate-900 flex flex-col font-sans overflow-x-hidden relative selection:bg-emerald-600 selection:text-white">
      {/* Background glowing meshes */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* 1. Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-filter backdrop-blur-md border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8.5 h-8.5 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-lg text-emerald-600 tracking-wide">WappFlow</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-zinc-400">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#solutions" className="hover:text-slate-900 transition-colors">SaaS Solutions</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing Models</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="text-xs font-semibold text-zinc-350 hover:text-slate-900 px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20 transition-all hover:scale-102 active:scale-98"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="pt-36 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center space-y-8 relative z-10">
        <div className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20 flex items-center gap-2 select-none">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Complete Multi-Tenant SaaS Workspace</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight max-w-3xl leading-tight text-slate-900">
          The Ultimate WhatsApp <br />
          <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 bg-clip-text text-transparent">
            Marketing & CRM Suite
          </span>
        </h1>

        <p className="text-slate-500 text-sm sm:text-base max-w-xl leading-relaxed">
          Scale your customer engagements. Launch template broadcasts, orchestrate visual chatbot routing, manage shared team inboxes, and sync third-party webhooks in real-time.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 shrink-0">
          <Link 
            href="/signup" 
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2 hover:scale-102 active:scale-98 transition-all"
          >
            <span>Register Free Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link 
            href="/login" 
            className="w-full sm:w-auto bg-white border border-emerald-100 hover:bg-emerald-50/50 text-slate-700 font-bold text-xs px-6 py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all"
          >
            <span>Access Member Login</span>
            <ExternalLink className="w-4 h-4 text-slate-500" />
          </Link>
        </div>
      </section>

      {/* 3. Core Features Showcase */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto space-y-16 relative z-10 scroll-mt-18">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Engineered For Dynamic Growth</h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">Discover the visual interfaces configured to streamline customer conversation pathways instantly.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div 
                key={idx} 
                className="bg-white border border-slate-100 p-6 rounded-2xl flex flex-col justify-between hover:border-emerald-350 hover:-translate-y-1 transition-all duration-300 group shadow-sm"
              >
                <div className="space-y-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${feat.color} shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{feat.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium select-text">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Pricing Matrices */}
      <section id="pricing" className="py-20 px-6 max-w-7xl mx-auto space-y-16 relative z-10 scroll-mt-18">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-sans">Transparent SaaS Plans</h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">Simple, tiered models offering features tailored to your organizational scale.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricing.map((plan, idx) => (
            <div 
              key={idx} 
              className={`bg-white border p-8 rounded-2xl flex flex-col justify-between space-y-8 relative overflow-hidden transition-all duration-300 bg-gradient-to-b from-emerald-50/10 to-white ${
                plan.popular 
                  ? "border-emerald-500 shadow-emerald-500/5 shadow-2xl scale-[1.02]" 
                  : "border-slate-200 hover:border-emerald-200"
              }`}
            >
              {/* Popular glow badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-xl select-none leading-none">
                  Most Popular Plan
                </div>
              )}

              {/* Price Content */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-sm text-zinc-450 uppercase tracking-wide leading-none">{plan.name}</h4>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-4xl font-black text-slate-900 tracking-tight">{plan.price}</span>
                    <span className="text-[10px] text-zinc-500 font-semibold">{plan.period}</span>
                  </div>
                  <p className="text-xs text-zinc-550 mt-2 font-medium">{plan.desc}</p>
                </div>

                {/* Features listing */}
                <ul className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-500 select-text">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA button */}
              <Link 
                href="/signup"
                className={`w-full text-center py-3 rounded-xl text-xs font-bold transition-all ${
                  plan.popular 
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20" 
                    : "bg-emerald-50 hover:bg-emerald-100 text-slate-700"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="bg-emerald-50/20 border-t border-emerald-100 py-12 px-6 relative z-10 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-zinc-500 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-6.5 h-6.5 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-emerald-600 tracking-wide">WappFlow</span>
          </div>
          <p>© {new Date().getFullYear()} WappFlow Inc. All rights reserved. Secured Local DB instances.</p>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-zinc-650 tracking-wider font-mono">v2.4.0-SaaS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
