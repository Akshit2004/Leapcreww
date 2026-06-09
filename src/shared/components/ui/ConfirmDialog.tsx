"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useEffect,
} from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

/**
 * Promise-based confirmation dialog.
 *
 * Replaces native `window.confirm()` so destructive actions stay on-brand
 * (Swiss-editorial: sharp borders, off-white surfaces). Usage:
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete campaign?", tone: "danger" })) { ... }
 */

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface DialogState extends ConfirmOptions {
  open: boolean;
}

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<DialogState | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState((prev) => (prev ? { ...prev, open: false } : null));
  }, []);

  // Keyboard: Esc cancels, Enter confirms.
  useEffect(() => {
    if (!state?.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        close(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state?.open, close]);

  const isDanger = state?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state?.open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px] animate-slide-up"
            onClick={() => close(false)}
          />
          {/* Dialog */}
          <div
            role="alertdialog"
            aria-modal="true"
            className="relative w-full max-w-sm bg-white border border-stone-300 rounded-none shadow-xl animate-slide-up"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 flex items-center justify-center border shrink-0 ${
                    isDanger
                      ? "bg-red-50 border-red-100"
                      : "bg-stone-50 border-stone-200"
                  }`}
                >
                  {isDanger ? (
                    <Trash2 className="w-5 h-5 text-red-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-stone-600" />
                  )}
                </div>
                <div className="space-y-1.5 pt-0.5">
                  <h3 className="font-bold text-stone-900 text-sm leading-snug">
                    {state.title}
                  </h3>
                  {state.description && (
                    <p className="text-stone-500 text-xs leading-relaxed">
                      {state.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => close(false)}
                  className="flex-1 border border-stone-200 hover:border-stone-400 text-stone-700 font-bold text-xs py-2.5 transition-colors cursor-pointer rounded-none"
                >
                  {state.cancelLabel || "Cancel"}
                </button>
                <button
                  autoFocus
                  onClick={() => close(true)}
                  className={`flex-1 text-white font-bold text-xs py-2.5 transition-colors cursor-pointer rounded-none ${
                    isDanger
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-stone-950 hover:bg-stone-800"
                  }`}
                >
                  {state.confirmLabel || (isDanger ? "Delete" : "Confirm")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx;
}
