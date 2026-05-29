"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Megaphone, 
  FileText, 
  Bot, 
  Cpu, 
  LogOut,
  X,
  ShoppingBag,
  Smartphone,
  CheckCircle2,
  Loader,
  AlertCircle,
  Settings,
  BarChart3,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useApp } from "../../context/AppContext";
import { useParams } from "next/navigation";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      AppEvents: {
        logPageView: () => void;
      };
      login: (cb: (response: { authResponse?: { accessToken: string } }) => void, opts: { scope: string }) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab,
  isOpen = false,
  onClose
}) => {
  const params = useParams();
  const orgId = params.orgId as string;
  const { contacts } = useApp();
  const { data: session } = useSession();

  const [waConnected, setWaConnected] = useState(false);
  const [waPhoneNumberId, setWaPhoneNumberId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = isHovered;

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // ─── Data & Config ──────────────────────────────────────────────
  const totalUnread = contacts.reduce((acc, contact) => acc + (contact.unreadCount || 0), 0);
  const sessionName = (session?.user as { name?: string })?.name || "";
  const agentName = sessionName || "Agent";
  const appName = "WappFlow";
  const appVersion = "v2.4.0";

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "inbox", label: "Team Inbox", icon: MessageSquare, badge: totalUnread > 0 ? totalUnread : undefined },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "chatbot", label: "Bot Builder", icon: Cpu },
    { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // ─── API Effects ────────────────────────────────────────────────
  useEffect(() => {
    const fetchStatus = async () => {
      if (!orgId) return;
      try {
        const res = await fetch(`/api/whatsapp/status?orgId=${orgId}`);
        if (res.ok) {
          const data = await res.json();
          setWaConnected(data.connected);
          setWaPhoneNumberId(data.phoneNumberId || null);
        }
      } catch {}
    };
    fetchStatus();
  }, [orgId]);

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!appId || typeof window === "undefined") return;
    if (window.FB) {
      window.FB.init({ appId, cookie: true, xfbml: true, version: "v21.0" });
      return;
    }
    window.fbAsyncInit = function () {
      window.FB?.init({ appId, cookie: true, xfbml: true, version: "v21.0" });
      window.FB?.AppEvents.logPageView();
    };
    ((d, s, id) => {
      const fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      const script = d.createElement(s) as HTMLScriptElement;
      script.id = id;
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs?.parentNode?.insertBefore(script, fjs);
    })(document, "script", "facebook-jssdk");
  }, []);

  // ─── WhatsApp Handlers ──────────────────────────────────────────
  const handleConnectWhatsApp = () => {
    setConnectError("");
    if (typeof window !== "undefined" && window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setConnectError("HTTPS required. Deploy to Vercel or use a HTTPS proxy for local dev.");
      return;
    }
    if (!window.FB) {
      setConnectError("Facebook SDK not loaded. Please refresh.");
      return;
    }
    setConnecting(true);
    window.FB.login((response) => {
      if (response.authResponse) {
        const token = response.authResponse.accessToken;
        fetch("/api/whatsapp/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fbToken: token, orgId }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) { setConnectError(data.error); }
            else { setWaConnected(true); setWaPhoneNumberId(data.phoneNumberId); }
          })
          .catch(() => setConnectError("Network error. Try again."))
          .finally(() => setConnecting(false));
      } else {
        setConnectError("Facebook login cancelled or failed.");
        setConnecting(false);
      }
    }, {
      scope: "whatsapp_business_management,whatsapp_business_messaging,business_management",
    });
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/whatsapp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      setWaConnected(false);
      setWaPhoneNumberId(null);
    } catch {}
  };

  // ─── Render ─────────────────────────────────────────────────────
  // isHovered  → controls sidebar width (expands immediately)
  // isExpanded → controls label visibility (one frame later, after delays are set)

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/45 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-350 cursor-pointer animate-fade-in"
        />
      )}

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed inset-y-0 left-0 z-50 lg:static bg-[#050b09]/95 backdrop-blur-2xl text-stone-300 flex flex-col border-r border-emerald-950/30 h-screen select-none shrink-0 transition-all duration-300 ease-in-out relative overflow-hidden ${
          isOpen ? "translate-x-0 w-[264px]" : "-translate-x-full lg:translate-x-0"
        } ${isHovered ? "lg:w-[264px] lg:rounded-r-[20px] shadow-[5px_0_30px_rgba(0,0,0,0.4)] lg:shadow-none" : "lg:w-20"}`}
      >
        {/* Ambient Glows */}
        <div className="absolute top-[-10%] left-[-20%] w-[150%] h-[35%] bg-gradient-to-br from-emerald-500/8 to-transparent rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-20%] w-[150%] h-[30%] bg-gradient-to-tl from-teal-500/8 to-transparent rounded-full blur-[100px] pointer-events-none" />

        {/* Brand Signature */}
        <div className={`p-6 border-b border-white/[0.04] flex items-center justify-between shrink-0 bg-gradient-to-b from-emerald-950/10 via-transparent to-transparent relative z-10 transition-all duration-300 ${
          isExpanded ? "" : "lg:px-5"
        }`}>
          <div className={`flex items-center transition-all duration-300 overflow-hidden ${
            isExpanded ? "gap-3" : "lg:gap-0"
          }`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-650 flex items-center justify-center shadow-lg shadow-emerald-900/30 border border-emerald-400/20 shrink-0 animate-glow-pulse">
              <Bot className="w-5.5 h-5.5 text-white animate-pulse-soft" />
            </div>
            <div
              className={`transition-all duration-300 ${
                isExpanded ? "min-w-[120px] opacity-100 translate-x-0" : "lg:opacity-0 lg:-translate-x-4 lg:pointer-events-none lg:w-0 lg:min-w-0 lg:overflow-hidden"
              }`}
            >
              <h1 className="font-extrabold text-lg bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-350 bg-clip-text text-transparent leading-none tracking-tight">{appName}</h1>
              <span className="text-[9px] text-emerald-450 border border-emerald-500/25 bg-emerald-500/10 font-black tracking-wider uppercase px-1.5 py-0.5 rounded-md mt-1.5 inline-block">{appVersion}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-xl hover:bg-white/5 text-stone-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar relative z-10">
          <div
            data-stagger-pos="0.12"
            className={`text-[10px] font-black text-emerald-500/40 tracking-widest uppercase px-2 mb-3.5 transition-all duration-300 ${
              isExpanded ? "opacity-100" : "lg:opacity-0 lg:pointer-events-none lg:mb-0"
            }`}
          >
            Management
          </div>
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const pos = 0.15 + (idx / Math.max(menuItems.length - 1, 1)) * 0.60;
            return (
              <button
                key={item.id}
                data-stagger-pos={pos.toFixed(3)}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 group relative cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/5 text-emerald-350 font-extrabold border border-emerald-500/35 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
                    : "hover:bg-white/[0.02] hover:border-white/5 border border-transparent text-stone-400 hover:text-emerald-350"
                } ${isExpanded ? "" : "lg:px-2.5"}`}
                title={!isExpanded ? item.label : undefined}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Icon className={`w-5 h-5 transition-all duration-300 shrink-0 ${
                    isActive ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] scale-110" : "text-stone-500 group-hover:text-emerald-400 group-hover:scale-105"
                  }`} />
                  <span className={`text-[13px] font-semibold transition-all duration-300 min-w-[120px] text-left ${
                    isExpanded ? "opacity-100 translate-x-0" : "lg:opacity-0 lg:-translate-x-4 lg:pointer-events-none"
                  }`}>{item.label}</span>
                </div>
                
                {item.badge !== undefined && (
                  isExpanded ? (
                    <span className="bg-emerald-550/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                      {item.badge}
                    </span>
                  ) : (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 border border-[#060d0b] rounded-full lg:block hidden animate-pulse-soft" />
                  )
                )}

                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-400 rounded-r-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* WhatsApp Connection Status */}
        <div className="px-4 pt-3 pb-1 shrink-0 bg-gradient-to-t from-white/[0.01] to-transparent border-t border-white/[0.03] relative z-10">
          <div
            data-stagger-pos="0.85"
            className="rounded-xl transition-all duration-300 overflow-hidden w-full"
          >
            {waConnected ? (
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 backdrop-blur-md transition-all duration-300 shadow-inner">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-650 flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <CheckCircle2 className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-450 border border-[#050b09] rounded-full" />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-450 rounded-full animate-ping opacity-75" />
                </div>
                <div
                  data-stagger-pos="0.88"
                  className={`flex-1 min-w-[130px] transition-all duration-300 ${
                    isExpanded ? "opacity-100 translate-x-0" : "lg:opacity-0 lg:-translate-x-4 lg:pointer-events-none"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-emerald-400 leading-none">WhatsApp Live</p>
                      <p className="text-[9px] text-emerald-500/60 font-bold mt-1 font-mono leading-none">
                        {waPhoneNumberId ? `ID: ${waPhoneNumberId.slice(0, 10)}…` : "Linked"}
                      </p>
                    </div>
                    <button
                      onClick={handleDisconnect}
                      className="p-1.5 rounded-lg text-stone-555 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent transition-all duration-200 cursor-pointer"
                      title="Disconnect WhatsApp"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md transition-all duration-300 shadow-inner">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shadow-inner text-stone-400 border border-white/5">
                    <Smartphone className="w-4.5 h-4.5" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 border border-[#050b09] rounded-full" />
                </div>
                <div
                  data-stagger-pos="0.88"
                  className={`flex-1 min-w-[130px] transition-all duration-300 ${
                    isExpanded ? "opacity-100 translate-x-0" : "lg:opacity-0 lg:-translate-x-4 lg:pointer-events-none"
                  }`}
                >
                  {connectError && (
                    <p className="text-[8.5px] text-rose-400 font-bold flex items-center gap-1 mb-1 leading-tight">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {connectError}
                    </p>
                  )}
                  <button
                    onClick={handleConnectWhatsApp}
                    disabled={connecting}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-lg disabled:opacity-50 transition-all duration-200 cursor-pointer shadow-md shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/20"
                  >
                    {connecting ? (
                      <Loader className="w-3 h-3 animate-spin" />
                    ) : (
                      <Smartphone className="w-3 h-3" />
                    )}
                    {connecting ? "Linking…" : "Connect WABA"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Profile / Signout */}
        <div className="p-4 border-t border-white/[0.04] bg-white/[0.01] shrink-0 relative z-10">
          <div className="flex items-center px-2 py-1.5 transition-all duration-300 overflow-hidden lg:px-0 lg:justify-center">
            <div className="relative shrink-0 group/avatar">
              <div className="w-9.5 h-9.5 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-550 to-emerald-400 flex items-center justify-center text-sm font-black text-white shadow-lg shadow-emerald-950/50 uppercase border border-white/20 transition-transform duration-300 group-hover/avatar:scale-105">
                {agentName.split(" ").map((n: string) => n[0]).join("")}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border border-[#050b09] rounded-full animate-pulse" />
            </div>
            
            <div
              data-stagger-pos="0.94"
              className={`flex-1 min-w-[120px] transition-all duration-300 text-left ${
                isExpanded ? "opacity-100 translate-x-0 ml-3" : "lg:opacity-0 lg:-translate-x-4 lg:pointer-events-none"
              }`}
            >
              <div className="text-sm font-bold text-white truncate leading-none mb-1">{agentName}</div>
              <div className="text-[10px] text-emerald-500/60 font-black tracking-wider uppercase leading-none">Agent Portal</div>
            </div>

            <div
              data-stagger-pos="0.97"
              className={`transition-all duration-300 ${
                isExpanded ? "opacity-100 scale-100 ml-2" : "lg:opacity-0 lg:scale-95 lg:pointer-events-none"
              }`}
            >
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sign out"
                className="p-2 rounded-xl text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent transition-all duration-200 cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
