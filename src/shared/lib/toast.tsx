"use client";

import toast from "react-hot-toast";
import { CheckCircle2, AlertTriangle, Info, Loader2 } from "lucide-react";
import React from "react";

/**
 * Unified, editorial-styled toast notifications.
 *
 * The whole app routes user feedback through this helper so positioning,
 * styling, and stacking stay consistent. Built on react-hot-toast's
 * `toast.custom` so we can render the Swiss-editorial two-line look
 * (sharp borders, off-white surfaces) instead of the library defaults.
 */

type Variant = "success" | "error" | "info" | "loading";

const VARIANT_STYLES: Record<
  Variant,
  { border: string; bar: string; icon: React.ReactNode }
> = {
  success: {
    border: "border-stone-900",
    bar: "bg-stone-900",
    icon: <CheckCircle2 className="w-4 h-4 text-wa-green shrink-0" />,
  },
  error: {
    border: "border-red-300",
    bar: "bg-red-400",
    icon: <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />,
  },
  info: {
    border: "border-stone-300",
    bar: "bg-stone-400",
    icon: <Info className="w-4 h-4 text-stone-600 shrink-0" />,
  },
  loading: {
    border: "border-stone-300",
    bar: "bg-stone-400",
    icon: <Loader2 className="w-4 h-4 text-stone-600 shrink-0 animate-spin" />,
  },
};

const DURATION_MS = 5000;

function emit(variant: Variant, title: string, message?: string, options?: { id?: string; duration?: number }) {
  const styles = VARIANT_STYLES[variant];
  return toast.custom(
    (t) => (
      <div
        className={`pointer-events-auto w-[calc(100vw-2rem)] sm:w-96 transition-all duration-300 ${
          t.visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2"
        }`}
      >
        <div
          className={`bg-white border ${styles.border} rounded-none overflow-hidden shadow-lg`}
        >
          <div className="flex items-start gap-3 p-3.5">
            <div className="mt-0.5">{styles.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-stone-900 uppercase tracking-wide leading-snug">
                {title}
              </p>
              {message && (
                <p className="text-[11px] text-stone-500 leading-relaxed mt-1 break-words">
                  {message}
                </p>
              )}
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-stone-400 hover:text-stone-900 transition-colors cursor-pointer text-sm leading-none shrink-0 -mt-0.5"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
          {variant !== "loading" && (
            <div className="h-0.5 w-full bg-stone-100">
              <div
                key={t.id}
                className={`h-full animate-toast-bar ${styles.bar}`}
              />
            </div>
          )}
        </div>
      </div>
    ),
    { id: options?.id, duration: options?.duration ?? DURATION_MS }
  );
}

export const notify = {
  success: (title: string, message?: string) => emit("success", title, message),
  error: (title: string, message?: string) => emit("error", title, message),
  info: (title: string, message?: string) => emit("info", title, message),
  /** Persistent toast (no auto-dismiss) for in-progress work. Returns the toast id. */
  loading: (title: string, message?: string) => emit("loading", title, message, { duration: Infinity }),
  /** Replace an existing toast in place (e.g. a `loading` toast) by id — used for live progress updates. */
  update: (id: string, variant: Variant, title: string, message?: string) =>
    emit(variant, title, message, { id, duration: variant === "loading" ? Infinity : DURATION_MS }),
  dismiss: (id?: string) => toast.dismiss(id),
};
