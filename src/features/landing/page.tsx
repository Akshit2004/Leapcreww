"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  MessageSquare,
  Megaphone,
  Cpu,
  ArrowRight,
  ExternalLink,
  Terminal,
  Check,
  Zap,
  RefreshCw,
  Sliders,
  Play
} from "lucide-react";

export default function LandingPage() {
  // Simulator active tab state
  const [activeTab, setActiveTab] = useState<"inbox" | "campaigns" | "chatbot">("inbox");
  
  // Interactive Simulator States
  // 1. Inbox States
  const [inboxMessages, setInboxMessages] = useState([
    { id: 1, sender: "user", text: "Hi there! I'd like to integrate your API with my WooCommerce cart.", time: "10:24 AM" },
    { id: 2, sender: "system", text: "Welcome to WappFlow. Let me help you trigger the dynamic CRM integration.", time: "10:24 AM" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [inboxSelectedReply, setInboxSelectedReply] = useState<string | null>(null);
  
  // 2. Campaign States
  const [campaignProgress, setCampaignProgress] = useState(85);
  const [campaignStats, setCampaignStats] = useState({
    sent: 3420,
    delivered: 3392,
    read: 2914,
    clicks: 1256
  });
  const [campaignRunning, setCampaignRunning] = useState(false);
  
  // 3. Chatbot States
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [botLog, setBotLog] = useState<string[]>(["System initialized. Waiting for trigger..."]);

  // Typing effect trigger for Simulator - Inbox
  const handleQuickReply = (replyType: "setup" | "agent") => {
    if (inboxSelectedReply) return; // Prevent double clicks
    
    setInboxSelectedReply(replyType);
    const userText = replyType === "setup" ? "⚡ Trigger Setup Guide" : "👥 Assign to Live Support Agent";
    
    // Add user message
    setInboxMessages(prev => [...prev, { id: prev.length + 1, sender: "user", text: userText, time: "10:26 AM" }]);
    
    // Trigger simulated agent typing
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      if (replyType === "setup") {
        setInboxMessages(prev => [
          ...prev, 
          { 
            id: prev.length + 1, 
            sender: "system", 
            text: "Here is your custom integration payload: POST /api/v1/webhook with headers x-wappflow-signature. Select an option to proceed.", 
            time: "10:26 AM" 
          }
        ]);
      } else {
        setInboxMessages(prev => [
          ...prev, 
          { 
            id: prev.length + 1, 
            sender: "system", 
            text: "Re-routing conversation to support agent (Alex Carter)... Connected! How can I help you with your custom CRM integration?", 
            time: "10:26 AM" 
          }
        ]);
      }
      setInboxSelectedReply(null);
    }, 1500);
  };

  // Live animation loop for Campaign Broadcast metrics
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (campaignRunning) {
      interval = setInterval(() => {
        setCampaignProgress(prev => {
          if (prev >= 100) {
            setCampaignRunning(false);
            return 100;
          }
          return prev + 1.5;
        });
        setCampaignStats(prev => ({
          sent: 3420,
          delivered: Math.min(3420, prev.delivered + Math.floor(Math.random() * 3) + 1),
          read: Math.min(3392, prev.read + Math.floor(Math.random() * 4) + 1),
          clicks: Math.min(2914, prev.clicks + Math.floor(Math.random() * 2) + 1)
        }));
      }, 300);
    }
    return () => clearInterval(interval);
  }, [campaignRunning]);

  const runCampaignSimulation = () => {
    setCampaignProgress(85);
    setCampaignStats({
      sent: 3420,
      delivered: 3380,
      read: 2880,
      clicks: 1220
    });
    setCampaignRunning(true);
  };

  // Chatbot state machine trigger
  const runChatbotSimulation = () => {
    setActiveNode(1);
    setBotLog(["[Node 1] Incoming Customer Message: 'Join'", "Analyzing trigger criteria..."]);
    
    setTimeout(() => {
      setActiveNode(2);
      setBotLog(prev => [...prev, "[Node 2] Filter passed: customer tag 'vip' matches.", "Retrieving metadata payloads..."]);
      
      setTimeout(() => {
        setActiveNode(3);
        setBotLog(prev => [...prev, "[Node 3] Action dispatched: WhatsApp Template sent.", "[Node 3] Outbound Shopify Webhook fired! (Status 200 OK)"]);
        
        setTimeout(() => {
          setActiveNode(null);
          setBotLog(prev => [...prev, "Simulation finished successfully. Flow idle."]);
        }, 1200);
      }, 1200);
    }, 1200);
  };

  const features = [
    {
      index: "01",
      title: "Shared Team Inbox",
      subtitle: "CONVERSATIONAL FLOWS",
      desc: "Connect your team to a single WhatsApp Business API number. Seamlessly route chats to agents, assign customer segments, manage dynamic unread badges, and automate live support handoffs without active server polling.",
    },
    {
      index: "02",
      title: "Smart Campaign Broadcasts",
      subtitle: "CRM DISPATCH SYSTEM",
      desc: "Launch pre-approved meta templates to targeted tag lists. Monitor live deliverability metrics (Sent, Delivered, Read, and Click-Through rates) synchronized directly with your secure local PostgreSQL database.",
    },
    {
      index: "03",
      title: "Visual Chatbot Visualizer",
      subtitle: "AUTOMATION ENGINE",
      desc: "Architect complex conversational paths with absolute structural clarity. Design branch routing triggers, optional node choices, and third-party webhook integrations in a custom workspace engineered for high-throughput messaging.",
    },
    {
      index: "04",
      title: "Webhook Integrations",
      subtitle: "EXTERNAL ORCHESTRATION",
      desc: "Synchronize customer actions across your technology stack natively. Bind Shopify abandoned carts, WooCommerce payment receipts, and automated Google Sheets logs directly to your secure WhatsApp channel without third-party delay.",
    },
  ];

  const pricing = [
    {
      name: "Startup Core",
      price: "$15",
      period: "per month",
      desc: "Perfect for scaling teams exploring WhatsApp channels.",
      features: [
        "1 Workspace Seat",
        "Up to 1,000 CRM Contacts",
        "Pre-approved Meta Templates",
        "Core Campaigns Broadcasts",
        "Standard Webhook Logs",
      ],
      cta: "Activate Core Workspace",
      popular: false,
    },
    {
      name: "Growth Scaler",
      price: "$29",
      period: "per month",
      desc: "Engineered for growing brands requiring visual flow automation.",
      features: [
        "Unlimited Support Agents",
        "Up to 10,000 Sync Contacts",
        "Visual Chatbots Flow Builder",
        "Shopify & WooCommerce Webhooks",
        "Advanced Click-Through Analytics",
      ],
      cta: "Upgrade to Growth Plan",
      popular: true,
    },
    {
      name: "Enterprise Custom",
      price: "Custom",
      period: "dedicated WABA",
      desc: "For large-scale operations with dedicated SLAs and high volume.",
      features: [
        "Dedicated Meta Cloud APIs",
        "Custom Database Clusters",
        "Dedicated Support Managers",
        "Uncapped Message Cadence",
        "Private API Custom Webhooks",
      ],
      cta: "Consult Systems Architect",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1D211F] flex flex-col font-sans overflow-x-hidden selection:bg-[#2E4A3F] selection:text-[#FAF7F2] relative">
      
      {/* 1. Header Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#1D211F]/8 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#1D211F] flex items-center justify-center transition-transform hover:scale-102">
              <Bot className="w-5 h-5 text-[#FAF7F2]" />
            </div>
            <span className="font-sans font-extrabold text-xl tracking-tight text-[#1D211F]">WappFlow</span>
          </div>

          <nav className="max-md:hidden md:flex items-center gap-10">
            <a href="#features" className="text-xs font-semibold tracking-wider text-[#1D211F]/60 hover:text-[#1D211F] transition-colors uppercase">Features</a>
            <a href="#simulator" className="text-xs font-semibold tracking-wider text-[#1D211F]/60 hover:text-[#1D211F] transition-colors uppercase">Workspace Sim</a>
            <a href="#pricing" className="text-xs font-semibold tracking-wider text-[#1D211F]/60 hover:text-[#1D211F] transition-colors uppercase">Pricing</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-xs font-bold tracking-wider text-[#1D211F]/60 hover:text-[#1D211F] px-4 py-2.5 rounded-md transition-colors uppercase"
            >
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="bg-[#1D211F] hover:bg-[#2E4A3F] text-[#FAF7F2] font-semibold text-xs tracking-wider uppercase px-5 py-3 rounded-md flex items-center gap-2 cursor-pointer shadow-sm transition-all duration-300 active:scale-98"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="pt-36 pb-24 md:pt-48 md:pb-36 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 border-b border-[#1D211F]/8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Text Block */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D05E3C]/20 bg-[#D05E3C]/5 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D05E3C] animate-pulse" />
              <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">Multi-Tenant CRM Suite</span>
            </div>

            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-tight leading-[1.05] text-[#1D211F]">
              Conversational systems, built for <span className="italic font-normal text-[#2E4A3F]">architectural scale.</span>
            </h1>

            <p className="text-[#1D211F]/70 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
              Scale client communications with complete clarity. WappFlow orchestrates pre-approved Meta broadcasts, visual chatbot automation nodes, and transactional webhook relays under a unified, high-security dashboard workspace.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <Link 
                href="/signup" 
                className="bg-[#1D211F] hover:bg-[#2E4A3F] text-[#FAF7F2] font-bold text-xs tracking-wider uppercase px-6 py-4 rounded-md cursor-pointer flex items-center justify-center gap-2 transition-all duration-300 shadow-sm active:scale-98 text-center"
              >
                <span>Register Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/login" 
                className="bg-[#FAF7F2] border border-[#1D211F]/20 hover:border-[#1D211F]/60 text-[#1D211F] font-bold text-xs tracking-wider uppercase px-6 py-4 rounded-md cursor-pointer flex items-center justify-center gap-2 transition-all text-center"
              >
                <span>Access Dashboard</span>
                <ExternalLink className="w-4 h-4 text-[#1D211F]/50" />
              </Link>
            </div>

            <div className="pt-6 border-t border-[#1D211F]/8 flex items-center gap-6 font-mono text-[9px] tracking-widest text-[#1D211F]/40 uppercase">
              <div>[ RELEASE v2.4.0 ]</div>
              <div>[ SECURE SQL STORAGE ]</div>
              <div>[ ZERO LATENCY API ]</div>
            </div>
          </div>

          {/* Right Interactive Simulator Box */}
          <div id="simulator" className="lg:col-span-6 w-full lg:sticky lg:top-28 scroll-mt-24">
            <div className="bg-[#1D211F] text-[#FAF7F2] rounded-xl overflow-hidden shadow-2xl border border-[#FAF7F2]/10 flex flex-col h-[520px] transition-all duration-300">
              
              {/* Simulator Header */}
              <div className="bg-[#171A19] px-4 py-3 border-b border-[#FAF7F2]/8 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D05E3C]/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2E4A3F]/80" />
                </div>
                <div className="bg-[#1D211F] rounded-md px-3 py-1 text-[10px] font-mono tracking-wider text-[#FAF7F2]/50 border border-[#FAF7F2]/5 w-[50%] text-center truncate">
                  wappflow.app/workspace/active
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-mono text-[9px] text-emerald-400 tracking-wider">LIVE</span>
                </div>
              </div>

              {/* Simulator Inner Columns */}
              <div className="flex flex-1 min-h-0">
                
                {/* Simulator Mini Sidebar */}
                <div className="w-16 bg-[#171A19] border-r border-[#FAF7F2]/8 flex flex-col items-center py-6 gap-6 shrink-0">
                  <button 
                    onClick={() => setActiveTab("inbox")}
                    className={`p-2.5 rounded-lg transition-all ${activeTab === "inbox" ? "bg-[#2E4A3F] text-[#FAF7F2]" : "text-[#FAF7F2]/40 hover:text-[#FAF7F2]"}`}
                    title="Shared Inbox"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setActiveTab("campaigns")}
                    className={`p-2.5 rounded-lg transition-all ${activeTab === "campaigns" ? "bg-[#2E4A3F] text-[#FAF7F2]" : "text-[#FAF7F2]/40 hover:text-[#FAF7F2]"}`}
                    title="Campaign Broadcasts"
                  >
                    <Megaphone className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setActiveTab("chatbot")}
                    className={`p-2.5 rounded-lg transition-all ${activeTab === "chatbot" ? "bg-[#2E4A3F] text-[#FAF7F2]" : "text-[#FAF7F2]/40 hover:text-[#FAF7F2]"}`}
                    title="Chatbot Automation"
                  >
                    <Bot className="w-5 h-5" />
                  </button>
                  <div className="mt-auto p-2 text-[#FAF7F2]/20">
                    <Terminal className="w-4 h-4" />
                  </div>
                </div>

                {/* Simulator Content Area */}
                <div className="flex-1 flex flex-col bg-[#1D211F] p-5 overflow-y-auto custom-scrollbar min-w-0">
                  
                  {/* TAB 1: SHARED INBOX */}
                  {activeTab === "inbox" && (
                    <div className="flex flex-col h-full space-y-4">
                      <div className="flex items-center justify-between border-b border-[#FAF7F2]/8 pb-2 shrink-0">
                        <div>
                          <div className="font-bold text-xs tracking-wide">Shared Support Queue</div>
                          <div className="text-[10px] text-[#FAF7F2]/50 font-mono">Assigned to: Alex Carter</div>
                        </div>
                        <span className="bg-emerald-500/10 text-emerald-400 font-mono text-[9px] px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">Connected</span>
                      </div>

                      {/* Chat messages viewport */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs min-h-0">
                        {inboxMessages.map((msg) => (
                          <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                            <div className={`max-w-[85%] rounded-lg p-2.5 leading-relaxed font-medium ${
                              msg.sender === "user" 
                                ? "bg-[#2E4A3F] text-[#FAF7F2]" 
                                : "bg-[#171A19] text-[#FAF7F2]/90 border border-[#FAF7F2]/5"
                            }`}>
                              {msg.text}
                            </div>
                            <span className="text-[9px] text-[#FAF7F2]/30 mt-1 px-1">{msg.time}</span>
                          </div>
                        ))}

                        {/* Typing indicator */}
                        {isTyping && (
                          <div className="flex flex-col items-start animate-pulse">
                            <div className="bg-[#171A19] border border-[#FAF7F2]/5 text-[#FAF7F2]/40 rounded-lg px-3 py-2 text-[10px] italic flex items-center gap-1.5 font-mono">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>WappFlow assistant is typing...</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Quick Replies Options */}
                      <div className="pt-3 border-t border-[#FAF7F2]/8 shrink-0 space-y-2">
                        <div className="text-[10px] font-mono tracking-wider text-[#FAF7F2]/40 uppercase">Interactive Quick Replies:</div>
                        <div className="flex flex-wrap gap-2">
                          <button 
                            onClick={() => handleQuickReply("setup")}
                            disabled={isTyping || !!inboxSelectedReply}
                            className="bg-[#171A19] hover:bg-[#FAF7F2]/5 border border-[#FAF7F2]/10 text-xs font-semibold px-3 py-1.5 rounded text-left transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-[#FAF7F2]"
                          >
                            ⚡ Trigger Setup Guide
                          </button>
                          <button 
                            onClick={() => handleQuickReply("agent")}
                            disabled={isTyping || !!inboxSelectedReply}
                            className="bg-[#171A19] hover:bg-[#FAF7F2]/5 border border-[#FAF7F2]/10 text-xs font-semibold px-3 py-1.5 rounded text-left transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-[#FAF7F2]"
                          >
                            👥 Assign Support Agent
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: CAMPAIGN BROADCASTS */}
                  {activeTab === "campaigns" && (
                    <div className="flex flex-col h-full space-y-4">
                      <div className="flex items-center justify-between border-b border-[#FAF7F2]/8 pb-2 shrink-0">
                        <div>
                          <div className="font-bold text-xs tracking-wide">PostgreSQL Campaign Synced</div>
                          <div className="text-[10px] text-[#FAF7F2]/50 font-mono">Table: `waba_broadcasts`</div>
                        </div>
                        <button 
                          onClick={runCampaignSimulation}
                          disabled={campaignRunning}
                          className="bg-[#2E4A3F] hover:bg-[#3d6354] disabled:opacity-50 disabled:cursor-not-allowed text-[#FAF7F2] font-semibold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Run Campaign</span>
                        </button>
                      </div>

                      {/* Campaign details */}
                      <div className="space-y-4 flex-1 overflow-y-auto">
                        
                        {/* Progress Bar */}
                        <div className="bg-[#171A19] border border-[#FAF7F2]/5 rounded-lg p-3 space-y-2">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-[#FAF7F2]/60 uppercase tracking-wider">Broadcast dispatch progress</span>
                            <span className="font-bold text-emerald-400">{Math.floor(campaignProgress)}%</span>
                          </div>
                          <div className="w-full bg-[#1D211F] h-1.5 rounded overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full transition-all duration-300 ease-out"
                              style={{ width: `${campaignProgress}%` }}
                            />
                          </div>
                        </div>

                        {/* Broadcast specs stats grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-[#171A19] border border-[#FAF7F2]/5 rounded-lg p-3 space-y-1">
                            <div className="text-[9px] font-mono tracking-widest text-[#FAF7F2]/40 uppercase">Sent Queue</div>
                            <div className="text-xl font-bold font-mono text-[#FAF7F2]">{campaignStats.sent}</div>
                            <div className="text-[9px] text-[#FAF7F2]/30">Target Tag: `shopify-active`</div>
                          </div>
                          <div className="bg-[#171A19] border border-[#FAF7F2]/5 rounded-lg p-3 space-y-1">
                            <div className="text-[9px] font-mono tracking-widest text-[#FAF7F2]/40 uppercase">Delivered</div>
                            <div className="text-xl font-bold font-mono text-emerald-400">{campaignStats.delivered}</div>
                            <div className="text-[9px] text-[#FAF7F2]/30">{((campaignStats.delivered/campaignStats.sent)*100).toFixed(1)}% Rate</div>
                          </div>
                          <div className="bg-[#171A19] border border-[#FAF7F2]/5 rounded-lg p-3 space-y-1">
                            <div className="text-[9px] font-mono tracking-widest text-[#FAF7F2]/40 uppercase">Read Confirmation</div>
                            <div className="text-xl font-bold font-mono text-[#D05E3C]">{campaignStats.read}</div>
                            <div className="text-[9px] text-[#FAF7F2]/30">{((campaignStats.read/campaignStats.delivered)*100).toFixed(1)}% Read Index</div>
                          </div>
                          <div className="bg-[#171A19] border border-[#FAF7F2]/5 rounded-lg p-3 space-y-1">
                            <div className="text-[9px] font-mono tracking-widest text-[#FAF7F2]/40 uppercase">Interactive Clicks</div>
                            <div className="text-xl font-bold font-mono text-amber-400">{campaignStats.clicks}</div>
                            <div className="text-[9px] text-[#FAF7F2]/30">{((campaignStats.clicks/campaignStats.read)*100).toFixed(1)}% CTR</div>
                          </div>
                        </div>

                        {/* Template editor mockup */}
                        <div className="bg-[#171A19] border border-[#FAF7F2]/5 rounded-lg p-3 space-y-1.5">
                          <div className="text-[9px] font-mono text-[#FAF7F2]/40 uppercase tracking-wider">Meta Broadcast Template Preview:</div>
                          <p className="text-xs bg-[#1D211F] rounded p-2 text-[#FAF7F2]/80 border border-[#FAF7F2]/5 leading-relaxed font-mono">
                            &quot;Hello <span className="text-[#D05E3C] font-bold">{"{{"}customer_name{"}}"}</span>, your subscription is ready for activation. Log in to <span className="text-emerald-400">wappflow.app/verify</span> to authorize access.&quot;
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: CHATBOT NODE AUTOMATION */}
                  {activeTab === "chatbot" && (
                    <div className="flex flex-col h-full space-y-4">
                      <div className="flex items-center justify-between border-b border-[#FAF7F2]/8 pb-2 shrink-0">
                        <div>
                          <div className="font-bold text-xs tracking-wide">Automated Chatbot Logic</div>
                          <div className="text-[10px] text-[#FAF7F2]/50 font-mono">Node Flow Router</div>
                        </div>
                        <button 
                          onClick={runChatbotSimulation}
                          className="bg-[#2E4A3F] hover:bg-[#3d6354] text-[#FAF7F2] font-semibold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                        >
                          <Zap className="w-3 h-3 text-amber-400 fill-current" />
                          <span>Trigger Flow</span>
                        </button>
                      </div>

                      {/* Chatbot flow map */}
                      <div className="flex-1 flex flex-col justify-between py-2 space-y-3 min-h-0 overflow-y-auto">
                        
                        {/* Flow Visual Area */}
                        <div className="relative flex flex-col gap-6 items-center py-2 shrink-0">
                          {/* Node 1 */}
                          <div className={`z-10 w-[85%] bg-[#171A19] border-2 rounded-lg p-3 flex items-center gap-3 transition-all duration-300 ${
                            activeNode === 1 ? "border-[#D05E3C] shadow-lg shadow-[#D05E3C]/10 scale-102" : "border-[#FAF7F2]/10"
                          }`}>
                            <div className="w-7 h-7 rounded bg-[#D05E3C]/15 flex items-center justify-center shrink-0">
                              <MessageSquare className="w-4 h-4 text-[#D05E3C]" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[9px] font-mono text-[#FAF7F2]/45 uppercase tracking-wider">Trigger event</div>
                              <div className="text-xs font-bold truncate">User Message contains &quot;Join&quot;</div>
                            </div>
                          </div>

                          {/* Node 2 */}
                          <div className={`z-10 w-[85%] bg-[#171A19] border-2 rounded-lg p-3 flex items-center gap-3 transition-all duration-300 ${
                            activeNode === 2 ? "border-amber-400 shadow-lg shadow-amber-400/10 scale-102" : "border-[#FAF7F2]/10"
                          }`}>
                            <div className="w-7 h-7 rounded bg-amber-400/15 flex items-center justify-center shrink-0">
                              <Sliders className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[9px] font-mono text-[#FAF7F2]/45 uppercase tracking-wider">Conditional logic filter</div>
                              <div className="text-xs font-bold truncate">Validate User Tag: &quot;vip&quot;</div>
                            </div>
                          </div>

                          {/* Node 3 */}
                          <div className={`z-10 w-[85%] bg-[#171A19] border-2 rounded-lg p-3 flex items-center gap-3 transition-all duration-300 ${
                            activeNode === 3 ? "border-emerald-400 shadow-lg shadow-emerald-400/10 scale-102" : "border-[#FAF7F2]/10"
                          }`}>
                            <div className="w-7 h-7 rounded bg-emerald-400/15 flex items-center justify-center shrink-0">
                              <Cpu className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[9px] font-mono text-[#FAF7F2]/45 uppercase tracking-wider">Action Dispatched</div>
                              <div className="text-xs font-bold truncate">Sync webhook & Dispatch Template</div>
                            </div>
                          </div>
                        </div>

                        {/* Terminal System logs */}
                        <div className="bg-[#171A19] border border-[#FAF7F2]/5 rounded-lg p-3 font-mono text-[10px] text-[#FAF7F2]/60 space-y-1">
                          <div className="text-[8px] text-[#FAF7F2]/30 uppercase tracking-widest pb-1 border-b border-[#FAF7F2]/5">Execution Log Console:</div>
                          <div className="h-20 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {botLog.map((log, idx) => (
                              <div key={idx} className={log.includes("OK") || log.includes("successfully") ? "text-emerald-400" : log.includes("Filter") ? "text-amber-300" : "text-[#FAF7F2]/70"}>
                                &gt; {log}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

              </div>

              {/* Simulator Footer */}
              <div className="bg-[#171A19] border-t border-[#FAF7F2]/8 px-4 py-2 flex items-center justify-between text-[9px] font-mono text-[#FAF7F2]/40 shrink-0 select-none">
                <span>SYSTEM ENVIRONMENT: POSIX // NODE_ENV = PROD</span>
                <span>CONVERSATIONS: ACTIVE</span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. Product Narrative Walkthrough Section (Replacing standard Bento cards) */}
      <section id="features" className="py-24 md:py-36 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 border-b border-[#1D211F]/8 scroll-mt-20">
        
        {/* Typographic Section Intro */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start pb-16">
          <div className="lg:col-span-5 space-y-2">
            <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">CRM Architecture Specs</span>
            <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-[#1D211F]">
              Engineered with extreme <span className="italic font-normal text-[#2E4A3F]">visual precision.</span>
            </h2>
          </div>
          <div className="lg:col-span-7 pt-4 lg:pt-8">
            <p className="text-[#1D211F]/70 text-sm sm:text-base leading-relaxed max-w-2xl font-medium">
              We replaced over-decorated radial meshes and floating isometric 3D shapes with rigorous structural layout columns. Every capability maps directly to real CRM utilities designed for high performance.
            </p>
          </div>
        </div>

        {/* Asymmetrical Layout List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-x-16 lg:gap-y-20 border-t border-[#1D211F]/10 pt-16">
          {features.map((feat, idx) => (
            <div 
              key={idx} 
              className="group space-y-4 border-t border-[#1D211F]/5 pt-8 first:border-none lg:first:border-t lg:border-t transition-all duration-300"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs tracking-widest text-[#D05E3C] uppercase font-bold">{feat.subtitle}</span>
                <span className="font-mono text-xs text-[#1D211F]/30 font-bold">{feat.index}</span>
              </div>
              <h3 className="font-serif text-2xl font-light text-[#1D211F] group-hover:text-[#2E4A3F] transition-colors duration-200">
                {feat.title}
              </h3>
              <p className="text-[#1D211F]/75 text-xs sm:text-sm leading-relaxed font-medium">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>

      </section>

      {/* 4. Swiss Systems Comparison Pricing Grid */}
      <section id="pricing" className="py-24 md:py-36 px-6 md:px-12 max-w-7xl mx-auto w-full relative z-10 scroll-mt-20">
        
        {/* Intro */}
        <div className="text-center space-y-4 max-w-xl mx-auto pb-16">
          <span className="font-mono text-[10px] tracking-widest text-[#D05E3C] uppercase font-bold">Transparent Tiers</span>
          <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-[#1D211F]">
            Tiered subscription models, <span className="italic font-normal text-[#2E4A3F]">without hidden cadences.</span>
          </h2>
          <p className="text-[#1D211F]/60 text-xs sm:text-sm font-medium">
            Clear specifications scaled to your operational throughput. Upgrade or downgrade plans natively inside your tenant space.
          </p>
        </div>

        {/* Pricing Table-Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {pricing.map((plan, idx) => (
            <div 
              key={idx} 
              className={`border p-8 md:p-10 flex flex-col justify-between transition-all duration-300 ${
                plan.popular 
                  ? "bg-[#1D211F] text-[#FAF7F2] border-[#1D211F] shadow-xl scale-[1.03] rounded-lg" 
                  : "bg-white border-[#1D211F]/8 hover:border-[#1D211F]/30 rounded-lg text-[#1D211F]"
              }`}
            >
              
              <div className="space-y-6">
                
                {/* Badge if popular */}
                <div className="flex items-center justify-between">
                  <h4 className={`font-mono text-[10px] tracking-widest uppercase font-bold ${plan.popular ? "text-[#D05E3C]" : "text-[#1D211F]/50"}`}>
                    {plan.name}
                  </h4>
                  {plan.popular && (
                    <span className="bg-[#FAF7F2]/10 border border-[#FAF7F2]/10 text-white font-mono text-[8px] tracking-widest uppercase px-2 py-0.5 rounded font-bold">
                      Popular Plan
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-serif font-light tracking-tight">{plan.price}</span>
                    <span className={`text-[10px] font-mono tracking-wider uppercase font-semibold ${plan.popular ? "text-[#FAF7F2]/50" : "text-[#1D211F]/40"}`}>
                      / {plan.period}
                    </span>
                  </div>
                  <p className={`text-xs font-medium leading-relaxed ${plan.popular ? "text-[#FAF7F2]/70" : "text-[#1D211F]/65"}`}>
                    {plan.desc}
                  </p>
                </div>

                {/* Features Checklist */}
                <ul className="space-y-3.5 pt-6 border-t border-[#1D211F]/10 text-xs font-medium">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.popular ? "text-[#D05E3C]" : "text-[#2E4A3F]"}`} />
                      <span className={plan.popular ? "text-[#FAF7F2]/80" : "text-[#1D211F]/80"}>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-8">
                <Link 
                  href="/signup"
                  className={`w-full text-center py-4 rounded-md text-xs font-bold tracking-wider uppercase transition-all duration-300 block ${
                    plan.popular 
                      ? "bg-[#D05E3C] hover:bg-[#b04826] text-white shadow-md active:scale-98" 
                      : "bg-[#1D211F] hover:bg-[#2E4A3F] text-[#FAF7F2] shadow-sm active:scale-98"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>

            </div>
          ))}
        </div>

      </section>

      {/* 5. Editorial Footer */}
      <footer className="bg-[#171A19] text-[#FAF7F2]/80 border-t border-[#FAF7F2]/10 py-16 px-6 md:px-12 relative z-10 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-8 text-xs select-none">
          
          <div className="space-y-3">
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

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 md:gap-12">
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
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Operations</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
