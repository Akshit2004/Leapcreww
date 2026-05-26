"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Megaphone, 
  FileText, 
  Bot, 
  Cpu, 
  Sparkles,
  LogOut,
  X,
  ShoppingBag,
  Smartphone,
  CheckCircle2,
  Loader,
  AlertCircle,
  Settings,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useApp } from "../context/AppContext";
import { useParams } from "next/navigation";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: any;
  }
}

declare function require(name: string): any;

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab,
  isOpen = false,
  onClose
}) => {
  const params = useParams();
  const orgId = params.orgId as string;
  const { contacts, members } = useApp();
  const { data: session } = useSession();

  const [waConnected, setWaConnected] = useState(false);
  const [waPhoneNumberId, setWaPhoneNumberId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  // Calculate total unread messages
  const totalUnread = contacts.reduce((acc, contact) => acc + (contact.unreadCount || 0), 0);
  
  // Use session user name, fallback to env var
  const sessionName = (session?.user as any)?.name || "";
  const agentName = sessionName || "Agent";
  const appName = "WappFlow";
  const appVersion = "v2.4.0";

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "inbox", label: "Team Inbox", icon: MessageSquare, badge: totalUnread > 0 ? totalUnread : undefined },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "chatbot", label: "Bot Builder", icon: Cpu },
    { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Fetch WhatsApp connection status
  const fetchStatus = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/whatsapp/status?orgId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setWaConnected(data.connected);
        setWaPhoneNumberId(data.phoneNumberId || null);
      }
    } catch {}
  }, [orgId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Initialize Facebook SDK (runs once)
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!appId || typeof window === "undefined") return;

    // If FB is already loaded, just init
    if (window.FB) {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v21.0",
      });
      return;
    }

    // Set up async init
    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v21.0",
      });
      window.FB.AppEvents.logPageView();
    };

    // Load FB SDK
    ((d, s, id) => {
      const fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      const script = d.createElement(s) as HTMLScriptElement;
      script.id = id;
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs?.parentNode?.insertBefore(script, fjs);
    })(document, "script", "facebook-jssdk");
  }, []);

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

    window.FB.login((response: any) => {
      if (response.authResponse) {
        const token = response.authResponse.accessToken;
        fetch("/api/whatsapp/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fbToken: token, orgId }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              setConnectError(data.error);
            } else {
              setWaConnected(true);
              setWaPhoneNumberId(data.phoneNumberId);
            }
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

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity duration-300 cursor-pointer"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 lg:static w-64 bg-white text-stone-700 flex flex-col border-r border-orange-200 h-screen select-none shrink-0 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Brand Signature */}
        <div className="p-6 border-b border-orange-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-stone-900 leading-none tracking-wide">{appName}</h1>
              <span className="text-[10px] text-stone-500 font-mono mt-0.5 block">{appVersion}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg hover:bg-orange-50 text-stone-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div className="text-[11px] font-semibold text-stone-500 tracking-wider uppercase px-2 mb-2">
            Management
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 group relative cursor-pointer ${
                  isActive
                    ? "bg-orange-600 text-white font-medium shadow-md shadow-orange-600/10"
                    : "hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? "text-white scale-110" : "text-zinc-400 group-hover:text-orange-700 group-hover:scale-105"
                  }`} />
                  <span className="text-sm">{item.label}</span>
                </div>
                
                {item.badge !== undefined && (
                  <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 animate-pulse-soft">
                    {item.badge}
                  </span>
                )}

                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-orange-300 rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* WhatsApp Connection Card */}
        <div className="px-4 pt-3 pb-1">
          <div className={`p-3 rounded-xl border ${
            waConnected
              ? "bg-green-50 border-green-200/60"
              : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200/60"
          }`}>
            <div className="flex items-start gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                waConnected ? "bg-green-600" : "bg-orange-600"
              }`}>
                {waConnected ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Smartphone className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-stone-800 leading-tight">
                  {waConnected ? "WhatsApp Connected" : "Connect WhatsApp"}
                </h4>
                {waConnected ? (
                  <div className="mt-1.5 space-y-1.5">
                    <p className="text-[10px] text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Phone ID: {waPhoneNumberId ? `${waPhoneNumberId.slice(0, 8)}...` : "Linked"}
                    </p>
                    <button
                      onClick={handleDisconnect}
                      className="text-[10px] text-red-500 hover:text-red-600 underline underline-offset-2"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div className="mt-1.5 space-y-1.5">
                    <p className="text-[10px] text-stone-500 leading-relaxed">
                      Link your WhatsApp Business number via Facebook.
                    </p>
                    {connectError && (
                      <p className="text-[10px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {connectError}
                      </p>
                    )}
                    <button
                      onClick={handleConnectWhatsApp}
                      disabled={connecting}
                      className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-500 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {connecting ? (
                        <Loader className="w-3 h-3 animate-spin" />
                      ) : (
                        <Smartphone className="w-3 h-3" />
                      )}
                      {connecting ? "Connecting..." : "Connect with Facebook"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Profile / Signout */}
        <div className="p-4 border-t border-orange-100 bg-orange-50/60">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-sm font-semibold text-stone-700 border border-orange-200 uppercase">
              {agentName.split(" ").map((n: string) => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-stone-900 truncate">{agentName}</div>
              <div className="text-[11px] text-stone-500">Signed in</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
              className="p-2 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
