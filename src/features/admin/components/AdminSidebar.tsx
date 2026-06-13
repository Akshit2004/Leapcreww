"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  FileText,
  ScrollText,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

interface NavItem {
  icon: React.ElementType;
  label: string;
  id: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Overview", id: "overview" },
  { icon: Building2, label: "Organizations", id: "orgs" },
  { icon: Users, label: "Users", id: "users" },
  { icon: CreditCard, label: "Billing", id: "billing" },
  { icon: FileText, label: "Templates", id: "templates" },
  { icon: ScrollText, label: "System Logs", id: "logs" },
];

interface AdminSidebarProps {
  activeSection: string;
  setSection: (id: string) => void;
  session: Session | null;
}

export function AdminSidebar({ activeSection, setSection, session }: AdminSidebarProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const email = session?.user?.email ?? "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleNav = (id: string) => {
    setSection(id);
    setMobileDrawerOpen(false);
  };

  const activeName = NAV_ITEMS.find((n) => n.id === activeSection)?.label ?? "Overview";

  return (
    <>
      {/* ─── DESKTOP SIDEBAR ─────────────────────────────── */}
      <aside className="max-lg:hidden lg:flex flex-col bg-[#fafaf9] border-r border-stone-200 h-screen w-[220px] shrink-0 select-none">
        {/* Brand header */}
        <div className="border-b border-stone-200 px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-stone-950 text-white flex items-center justify-center font-black text-sm shrink-0">
            LC
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-sm text-stone-950 leading-none tracking-tight truncate">
              LeapCreww
            </h1>
            <span className="text-[9px] text-stone-500 font-bold tracking-wider uppercase">
              Platform
            </span>
          </div>
          <span className="border border-red-300 text-red-600 bg-red-50 text-[9px] font-black px-1.5 py-0.5 uppercase tracking-wider shrink-0">
            ADMIN
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 transition-all cursor-pointer border relative ${
                  isActive
                    ? "bg-stone-950 text-white border-stone-950 font-bold"
                    : "hover:bg-stone-100 text-stone-600 hover:text-stone-950 border-transparent"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-white" : "text-stone-400"
                  }`}
                />
                <span className="text-xs font-semibold flex-1 text-left truncate">
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-wa-green" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-stone-200 px-3 py-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-black text-red-600 uppercase">SA</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-stone-950 truncate leading-none mb-0.5">
                {email}
              </div>
              <span className="text-[9px] font-black px-1 py-0.5 border border-red-200 bg-red-50 text-red-600 uppercase tracking-wider">
                Platform Admin
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
              className="p-1.5 text-stone-400 hover:text-stone-950 hover:bg-stone-100 transition-all cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MOBILE TOP BAR ──────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-stone-200 h-12 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-stone-950 text-white flex items-center justify-center font-black text-xs shrink-0">
            LC
          </div>
          <span className="border border-red-300 text-red-600 bg-red-50 text-[9px] font-black px-1.5 py-0.5 uppercase tracking-wider">
            ADMIN
          </span>
          <span className="text-xs font-black uppercase tracking-tight text-stone-700">
            {activeName}
          </span>
        </div>
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="p-1.5 text-stone-600 hover:bg-stone-100 transition-all cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ─── MOBILE DRAWER ───────────────────────────────── */}
      {mobileDrawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/40"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 sticky top-0 bg-white z-10">
              <span className="text-xs font-black tracking-wider uppercase text-stone-500">
                Admin Navigation
              </span>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-3 py-3">
              <div className="grid grid-cols-2 gap-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
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
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="mt-3 w-full flex items-center gap-3 px-4 py-3 border border-stone-100 text-stone-500 hover:bg-stone-50 hover:text-red-500 transition-colors cursor-pointer"
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
}
