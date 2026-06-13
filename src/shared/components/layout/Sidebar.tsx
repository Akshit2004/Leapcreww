"use client";

import React, { useState, useCallback, useEffect } from "react";
import { ChevronDown, LogOut, Sparkles, X, Menu, Wifi, WifiOff } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useApp } from "../../context/AppContext";
import { NAV_GROUPS, type NavItem } from "../../config/navigation";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenCopilot?: () => void;
}

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      AppEvents: { logPageView: () => void };
      login: (cb: (response: { authResponse?: { accessToken: string } }) => void, opts: { scope: string }) => void;
    };
    fbAsyncInit?: () => void;
  }
}

// Mobile bottom nav: the 5 most important items
const MOBILE_PRIMARY_IDS = ["overview", "inbox", "customers", "campaigns", "templates"];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onOpenCopilot }) => {
  const { contacts, organization } = useApp();
  const { data: session } = useSession();
  const waConnected = organization?.whatsappConnected ?? false;

  const [isHovered, setIsHovered] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  const sessionUser = session?.user as { name?: string; organizations?: { role: string }[] } | undefined;
  const agentName = sessionUser?.name || "User";
  const userRole = sessionUser?.organizations?.[0]?.role || "Member";
  const totalUnread = contacts.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const isExpanded = isHovered;

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const handleNav = useCallback(
    (id: string) => {
      setActiveTab(id);
      setMoreDrawerOpen(false);
    },
    [setActiveTab]
  );

  // Close more drawer on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const getBadge = (id: string) => {
    if (id === "inbox" && totalUnread > 0) return totalUnread;
    return undefined;
  };

  const NavButton = ({
    item,
    compact = false,
  }: {
    item: NavItem;
    compact?: boolean;
  }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const badge = getBadge(item.id);

    return (
      <button
        key={item.id}
        onClick={() => handleNav(item.id)}
        title={!isExpanded || compact ? item.label : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 transition-all group relative cursor-pointer border ${
          isActive
            ? "bg-stone-950 text-white font-bold border-stone-950"
            : "hover:bg-stone-100 text-stone-600 hover:text-stone-950 border-transparent"
        } ${!isExpanded && !compact ? "lg:px-2.5 lg:justify-center" : ""}`}
      >
        <Icon
          className={`w-4 h-4 shrink-0 ${
            isActive ? "text-white" : "text-stone-400 group-hover:text-stone-900"
          }`}
        />

        {/* Label — hidden when sidebar is collapsed (icon-only mode) */}
        {(isExpanded || compact) && (
          <span className="text-xs font-semibold flex-1 text-left truncate">{item.label}</span>
        )}

        {/* Badge */}
        {badge !== undefined && (isExpanded || compact) && (
          <span
            className={`text-[9px] font-black px-1.5 py-0.5 shrink-0 border ${
              isActive
                ? "bg-white/20 border-white/30 text-white"
                : "bg-stone-100 border-stone-200 text-stone-900"
            }`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}

        {/* Dot badge on collapsed sidebar */}
        {badge !== undefined && !isExpanded && !compact && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-wa-green border border-white rounded-full hidden lg:block" />
        )}

        {/* Active left bar */}
        {isActive && !compact && (
          <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-wa-green" />
        )}
      </button>
    );
  };

  const allNonPrimaryItems = NAV_GROUPS.flatMap((g) =>
    g.items.filter((i) => !MOBILE_PRIMARY_IDS.includes(i.id))
  );

  return (
    <>
      {/* ─── DESKTOP SIDEBAR ─────────────────────────────────────── */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`max-lg:hidden lg:flex flex-col bg-[#fafaf9] text-stone-900 border-r border-stone-200 h-screen select-none shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? "w-[220px]" : "w-[60px]"
        }`}
      >
        {/* Brand */}
        <div
          className={`border-b border-stone-200 shrink-0 flex items-center transition-all duration-300 ${
            isExpanded ? "px-4 py-4 gap-3" : "px-[10px] py-4 justify-center"
          }`}
        >
          <div className="w-9 h-9 bg-stone-950 text-white flex items-center justify-center font-black text-sm shrink-0">
            LC
          </div>
          {isExpanded && (
            <div className="overflow-hidden flex-1 min-w-0">
              <h1 className="font-extrabold text-sm text-stone-950 leading-none tracking-tight truncate">
                LeapCreww
              </h1>
              <span className="text-[9px] text-stone-500 font-bold tracking-wider uppercase">
                v2.4.0
              </span>
            </div>
          )}
          {/* WhatsApp connection status */}
          <div
            title={waConnected ? "WhatsApp connected" : "WhatsApp disconnected"}
            className={`shrink-0 flex items-center justify-center ${isExpanded ? "" : "mt-1"}`}
          >
            {waConnected ? (
              <Wifi className="w-3.5 h-3.5 text-wa-green" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {NAV_GROUPS.map((group) => {
            const isCollapsed = !!collapsedGroups[group.id];
            const hasActiveItem = group.items.some((i) => i.id === activeTab);

            return (
              <div key={group.id} className="mb-1">
                {/* Group header — only shown when expanded */}
                {isExpanded && (
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-2 py-1.5 mb-0.5 group cursor-pointer"
                  >
                    <span
                      className={`text-[9px] font-black tracking-wider uppercase transition-colors ${
                        hasActiveItem && isCollapsed
                          ? "text-wa-green"
                          : "text-stone-400 group-hover:text-stone-600"
                      }`}
                    >
                      {group.label}
                    </span>
                    <ChevronDown
                      className={`w-3 h-3 text-stone-300 group-hover:text-stone-500 transition-transform duration-200 ${
                        isCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                  </button>
                )}

                {/* Divider on collapsed sidebar between groups */}
                {!isExpanded && group.id !== "main" && (
                  <div className="mx-2 mb-1 border-t border-stone-100" />
                )}

                {/* Items */}
                {!isCollapsed &&
                  group.items.map((item) => (
                    <NavButton key={item.id} item={item} />
                  ))}

                {/* Collapsed group: show a dot if has active item */}
                {isCollapsed && isExpanded && hasActiveItem && (
                  <div className="px-3 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-wa-green ml-1" />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom: AI Copilot + Profile */}
        <div className="shrink-0 border-t border-stone-200 bg-[#fafaf9]">
          {/* Copilot */}
          <button
            onClick={() => onOpenCopilot?.()}
            className={`w-full flex items-center gap-3 px-3 py-3 border-b border-stone-100 text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all group cursor-pointer ${
              !isExpanded ? "lg:justify-center lg:px-2.5" : ""
            }`}
            title={!isExpanded ? "AI Copilot" : undefined}
          >
            <Sparkles className="w-4 h-4 shrink-0 group-hover:text-emerald-500" />
            {isExpanded && (
              <span className="text-xs font-semibold flex-1 text-left">AI Copilot</span>
            )}
            {isExpanded && (
              <>
                <span className="text-[9px] font-black text-stone-400 border border-stone-200 px-1.5 py-0.5 tracking-wider shrink-0">
                  ⌘K
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </>
            )}
          </button>

          {/* Profile */}
          <div
            className={`flex items-center px-3 py-3 gap-3 ${
              !isExpanded ? "lg:justify-center lg:px-2.5" : ""
            }`}
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 bg-stone-950 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                {agentName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-wa-green border border-white rounded-full" />
            </div>

            {isExpanded && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-stone-950 truncate leading-none mb-0.5">
                    {agentName}
                  </div>
                  <div className="text-[9px] text-stone-400 font-bold tracking-wider uppercase">
                    {userRole}
                  </div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Sign out"
                  className="p-1.5 text-stone-400 hover:text-stone-950 hover:bg-stone-100 transition-all cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ─── MOBILE BOTTOM NAV ───────────────────────────────────── */}
      <nav className="max-lg:flex lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 items-center pb-safe">
        {/* Primary 5 items */}
        {MOBILE_PRIMARY_IDS.map((id) => {
          const item = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === id);
          if (!item) return null;
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const badge = getBadge(item.id);
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-1 relative transition-colors cursor-pointer ${
                isActive ? "text-stone-950" : "text-stone-400 hover:text-stone-700"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-stone-950" />
              )}
              <div className="relative mb-1">
                <Icon className="w-5 h-5" />
                {badge !== undefined && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] flex items-center justify-center bg-wa-green text-white text-[8px] font-bold rounded-full px-1 border border-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-bold tracking-wider uppercase truncate w-full text-center px-1">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreDrawerOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center py-3 px-1 relative transition-colors cursor-pointer ${
            moreDrawerOpen || (!MOBILE_PRIMARY_IDS.includes(activeTab))
              ? "text-stone-950"
              : "text-stone-400 hover:text-stone-700"
          }`}
        >
          {(!MOBILE_PRIMARY_IDS.includes(activeTab)) && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-stone-950" />
          )}
          <Menu className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold tracking-wider uppercase">More</span>
        </button>
      </nav>

      {/* ─── MOBILE MORE DRAWER ──────────────────────────────────── */}
      {moreDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="max-lg:fixed lg:hidden inset-0 z-50 bg-black/40"
            onClick={() => setMoreDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="max-lg:fixed lg:hidden bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 rounded-t-none max-h-[75vh] overflow-y-auto pb-safe">
            {/* Handle */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 sticky top-0 bg-white z-10">
              <span className="text-xs font-black tracking-wider uppercase text-stone-500">
                All Features
              </span>
              <button
                onClick={() => setMoreDrawerOpen(false)}
                className="p-1.5 hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 py-3 space-y-4">
              {NAV_GROUPS.filter((g) =>
                g.items.some((i) => !MOBILE_PRIMARY_IDS.includes(i.id))
              ).map((group) => {
                const mobileItems = group.items.filter(
                  (i) => !MOBILE_PRIMARY_IDS.includes(i.id)
                );
                if (mobileItems.length === 0) return null;
                return (
                  <div key={group.id}>
                    <p className="text-[9px] font-black tracking-wider uppercase text-stone-400 px-2 mb-1">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {mobileItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNav(item.id)}
                            className={`flex flex-col items-center justify-center py-3 px-2 gap-1.5 border transition-colors cursor-pointer ${
                              isActive
                                ? "bg-stone-950 text-white border-stone-950"
                                : "bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-100"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-[9px] font-bold tracking-wider uppercase text-center leading-tight">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* AI Copilot */}
              <div>
                <p className="text-[9px] font-black tracking-wider uppercase text-stone-400 px-2 mb-1">
                  Assistant
                </p>
                <button
                  onClick={() => {
                    setMoreDrawerOpen(false);
                    onOpenCopilot?.();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold">AI Copilot</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-auto" />
                </button>
              </div>

              {/* Sign out */}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-3 px-4 py-3 border border-stone-100 text-stone-500 hover:bg-stone-50 hover:text-red-500 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-xs font-bold">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
