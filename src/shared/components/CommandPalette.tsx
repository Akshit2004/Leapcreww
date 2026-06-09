"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Search, CornerDownLeft, Sparkles, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { NAV_ITEMS } from "../config/navigation";

interface CommandPaletteProps {
  onNavigate: (tab: string) => void;
  onOpenCopilot?: () => void;
}

interface Command {
  id: string;
  label: string;
  group: string;
  icon: React.ReactNode;
  keywords: string[];
  run: () => void;
}

/**
 * ⌘K / Ctrl+K command palette. Jump between tabs and trigger quick actions
 * without touching the mouse. Self-manages its open state via a global
 * keydown listener so it can be mounted once at the dashboard root.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onNavigate,
  onOpenCopilot,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const commands = useMemo<Command[]>(() => {
    const navCommands: Command[] = NAV_ITEMS.map((item) => {
      const Icon = item.icon;
      return {
        id: `nav-${item.id}`,
        label: `Go to ${item.label}`,
        group: "Navigation",
        icon: <Icon className="w-4 h-4" />,
        keywords: [item.label.toLowerCase(), ...(item.keywords || [])],
        run: () => {
          onNavigate(item.id);
          close();
        },
      };
    });

    const actionCommands: Command[] = [
      {
        id: "action-copilot",
        label: "Open AI Copilot",
        group: "Actions",
        icon: <Sparkles className="w-4 h-4" />,
        keywords: ["ai", "assistant", "copilot", "help"],
        run: () => {
          onOpenCopilot?.();
          close();
        },
      },
      {
        id: "action-signout",
        label: "Sign out",
        group: "Actions",
        icon: <LogOut className="w-4 h-4" />,
        keywords: ["logout", "exit", "leave"],
        run: () => signOut({ callbackUrl: "/login" }),
      },
    ];

    return [...navCommands, ...actionCommands];
  }, [onNavigate, onOpenCopilot, close]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.includes(q))
    );
  }, [commands, query]);

  // Global open shortcut (⌘K / Ctrl+K).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input + reset highlight when opening.
  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[activeIndex]?.run();
    }
  };

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[250] flex items-start justify-center pt-[12vh] px-4">
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]"
        onClick={close}
      />
      <div
        className="relative w-full max-w-lg bg-white border border-stone-300 rounded-none shadow-2xl animate-slide-up overflow-hidden"
        onKeyDown={onKeyDown}
      >
        {/* Search field */}
        <div className="flex items-center gap-3 px-4 border-b border-stone-200">
          <Search className="w-4 h-4 text-stone-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions, jump to a page…"
            className="flex-1 py-4 text-sm text-stone-900 placeholder:text-stone-400 bg-transparent outline-none"
          />
          <kbd className="hidden sm:block text-[9px] font-bold text-stone-400 border border-stone-200 px-1.5 py-0.5 uppercase tracking-wider">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[52vh] overflow-y-auto custom-scrollbar py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-stone-400">
              No matching commands.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const showHeader = cmd.group !== lastGroup;
              lastGroup = cmd.group;
              const isActive = idx === activeIndex;
              return (
                <React.Fragment key={cmd.id}>
                  {showHeader && (
                    <div className="px-4 pt-3 pb-1 text-[9px] font-black text-stone-400 tracking-wider uppercase">
                      {cmd.group}
                    </div>
                  )}
                  <button
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => cmd.run()}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                      isActive
                        ? "bg-wa-green text-white"
                        : "text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <span
                      className={isActive ? "text-white" : "text-stone-400"}
                    >
                      {cmd.icon}
                    </span>
                    <span className="flex-1 text-xs font-semibold">
                      {cmd.label}
                    </span>
                    {isActive && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-white/80" />
                    )}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-stone-200 bg-stone-50 text-[9px] text-stone-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <kbd className="border border-stone-200 px-1 py-0.5">↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="border border-stone-200 px-1 py-0.5">↵</kbd> Select
          </span>
        </div>
      </div>
    </div>
  );
};
