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

  const [waConnected, setWaConnected] = useState(true);

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

  // ─── API Effects (Sandbox Mode Permanently Active) ──────────────

  // ─── WhatsApp Sandbox Active (No Meta SDK script load) ──────────

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-[#fafaf9]/85 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-350 cursor-pointer animate-fade-in"
        />
      )}

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed inset-y-0 left-0 z-50 lg:static bg-[#fafaf9] text-stone-900 flex flex-col border-r border-stone-200 h-screen select-none shrink-0 transition-all duration-300 ease-in-out relative overflow-hidden ${
          isOpen ? "translate-x-0 w-[264px]" : "-translate-x-full lg:translate-x-0"
        } ${isHovered ? "lg:w-[264px] shadow-[5px_0_30px_rgba(0,0,0,0.05)] lg:shadow-none" : "lg:w-20"}`}
      >
        {/* Brand Signature */}
        <div className={`p-6 border-b border-stone-200 flex items-center justify-between shrink-0 relative z-10 transition-all duration-300 ${
          isExpanded ? "" : "lg:px-5"
        }`}>
          <div className={`flex items-center transition-all duration-300 overflow-hidden ${
            isExpanded ? "gap-3" : "lg:gap-0"
          }`}>
            <div className="w-10 h-10 bg-stone-950 text-white flex items-center justify-center font-bold text-lg shrink-0 border border-stone-950">
              WF
            </div>
            <div
              className={`transition-all duration-300 ${
                isExpanded ? "min-w-[120px] opacity-100 translate-x-0" : "lg:opacity-0 lg:-translate-x-4 lg:pointer-events-none lg:w-0 lg:min-w-0 lg:overflow-hidden"
              }`}
            >
              <h1 className="font-extrabold text-base text-stone-950 leading-none tracking-tight">{appName}</h1>
              <span className="text-[9px] text-stone-900 border border-stone-950 bg-stone-100 font-black tracking-wider uppercase px-1.5 py-0.5 mt-1.5 inline-block rounded-none">{appVersion}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-none hover:bg-stone-100 text-stone-500 hover:text-stone-950 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar relative z-10">
          <div
            data-stagger-pos="0.12"
            className={`text-[9px] font-black text-stone-400 tracking-wider uppercase px-2 mb-3 transition-all duration-300 ${
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
                className={`w-full flex items-center justify-between px-3.5 py-3 transition-all duration-250 group relative cursor-pointer rounded-none border border-transparent ${
                  isActive
                    ? "bg-wa-green text-white font-bold"
                    : "hover:bg-stone-100 text-stone-550 hover:text-stone-950"
                } ${isExpanded ? "" : "lg:px-2.5"}`}
                title={!isExpanded ? item.label : undefined}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Icon className={`w-5 h-5 transition-all duration-300 shrink-0 ${
                    isActive ? "text-white scale-105" : "text-stone-400 group-hover:text-stone-900"
                  }`} />
                  <span className={`text-xs font-semibold transition-all duration-300 min-w-[120px] text-left ${
                    isExpanded ? "opacity-100 translate-x-0" : "lg:opacity-0 lg:-translate-x-4 lg:pointer-events-none"
                  }`}>{item.label}</span>
                </div>
                
                {item.badge !== undefined && (
                  isExpanded ? (
                    <span className={`text-[9px] font-bold px-2 py-0.5 shrink-0 rounded-none border ${
                      isActive ? "bg-wa-green-dark border-wa-green text-white" : "bg-stone-100 border-stone-200 text-stone-900"
                    }`}>
                      {item.badge}
                    </span>
                  ) : (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-wa-green border border-white rounded-full lg:block hidden" />
                  )
                )}

                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-white" />
                )}
              </button>
            );
          })}
        </nav>


        {/* Bottom Profile / Signout */}
        <div className="p-4 border-t border-stone-200 bg-white shrink-0 relative z-10">
          <div className="flex items-center px-2 py-1.5 transition-all duration-300 overflow-hidden lg:px-0 lg:justify-center">
            <div className="relative shrink-0">
              <div className="w-9.5 h-9.5 bg-stone-950 text-white flex items-center justify-center text-xs font-bold uppercase border border-stone-950">
                {agentName.split(" ").map((n: string) => n[0]).join("")}
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-wa-green-light border border-white rounded-full" />
            </div>
            
            <div
              data-stagger-pos="0.94"
              className={`flex-1 min-w-[120px] transition-all duration-300 text-left ${
                isExpanded ? "opacity-100 translate-x-0 ml-3" : "lg:opacity-0 lg:-translate-x-4 lg:pointer-events-none"
              }`}
            >
              <div className="text-xs font-bold text-stone-950 truncate leading-none mb-1">{agentName}</div>
              <div className="text-[9px] text-stone-400 font-bold tracking-wider uppercase leading-none">Agent Portal</div>
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
                className="p-2 text-stone-400 hover:text-stone-950 hover:bg-stone-100 transition-all duration-200 cursor-pointer shrink-0 rounded-none border border-transparent"
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
