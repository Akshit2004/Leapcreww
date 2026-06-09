"use client";

import React from "react";

/** Base shimmer block. Sharp corners to match the editorial aesthetic. */
export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-stone-200/70 rounded-none animate-pulse ${className}`} />
);

/**
 * Full-page workspace skeleton shown while the org data syncs.
 * Mirrors the real dashboard shell (header band, stat cards, table rows)
 * so the layout doesn't jump when content arrives.
 */
export const DashboardSkeleton: React.FC = () => (
  <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8">
    {/* Header band */}
    <div className="space-y-3">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-3 w-80 max-w-full" />
    </div>

    {/* Stat cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="border border-stone-200 bg-white p-5 space-y-3"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-2 w-24" />
        </div>
      ))}
    </div>

    {/* Table / list block */}
    <div className="border border-stone-200 bg-white">
      <div className="border-b border-stone-200 p-4">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y divide-stone-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="w-9 h-9 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-2 w-1/2" />
            </div>
            <Skeleton className="h-3 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  </div>
);
