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
 *
 * Used as the generic/default fallback for any tab without a dedicated
 * skeleton, and for the outer Suspense boundary (before `activeTab` is
 * known).
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

/* ────────────────────────────────────────────────────────────────────────
   Shared fragments — small building blocks reused across several
   per-tab skeletons so they stay visually consistent.
   ──────────────────────────────────────────────────────────────────────── */

/** Sticky page header band: title + subtitle + action button, like most tabs use. */
const HeaderBand: React.FC<{ withPills?: boolean }> = ({ withPills = false }) => (
  <div className="shrink-0 bg-white border-b border-stone-200 px-4 sm:px-8">
    <div className="flex items-center justify-between py-4 gap-3">
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-9 w-36 shrink-0" />
    </div>
    {withPills && (
      <div className="flex items-center gap-1.5 pb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-16 rounded-full" />
        ))}
      </div>
    )}
  </div>
);

/** A grid of stat / KPI cards. */
const StatCardGrid: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="border border-stone-200 bg-white p-5 space-y-3">
        <Skeleton className="w-9 h-9" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-2 w-20" />
      </div>
    ))}
  </div>
);

/** A grid of broadcast/template/recipe-style cards (colored top bar + header + body). */
const ContentCardGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white border border-stone-200 overflow-hidden">
        <div className="h-1 bg-stone-200" />
        <div className="px-5 pt-4 pb-3 border-b border-stone-100 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-2 w-1/3" />
        </div>
        <div className="px-5 py-4 space-y-2.5">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-5/6" />
          <Skeleton className="h-2 w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

/* ────────────────────────────────────────────────────────────────────────
   Per-tab skeletons
   ──────────────────────────────────────────────────────────────────────── */

/** OverviewTab — hero greeting + 4 hero stat tiles + command bar + 2-col widgets. */
export const OverviewSkeleton: React.FC = () => (
  <div className="flex-1 overflow-y-auto bg-stone-100">
    <div className="px-4 sm:px-6 pt-6 pb-5 space-y-5">
      {/* Greeting header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-8 w-72" />
        </div>
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>

      {/* Hero stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-stone-300 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <Skeleton className="w-10 h-10" />
            </div>
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-2 w-24" />
          </div>
        ))}
      </div>

      {/* Templates + automations mini cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border border-stone-300 px-4 py-3.5 flex items-center gap-3">
            <Skeleton className="w-8 h-8 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-2 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="px-4 sm:px-6 space-y-5 pt-5">
      {/* AI command bar */}
      <Skeleton className="h-16 w-full" />

      {/* Live campaigns + today widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2 bg-white border border-stone-300 p-5 space-y-3">
          <Skeleton className="h-3 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="lg:col-span-1 bg-white border border-stone-300 p-5 space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>

      {/* Quick actions + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="lg:col-span-3 bg-white border border-stone-300 p-5 space-y-2.5">
          <Skeleton className="h-3 w-28 mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

/** AnalyticsTab — sticky header with range pills + KPI cards + gauges + funnel/charts. */
export const AnalyticsSkeleton: React.FC = () => (
  <div className="flex-1 flex flex-col overflow-hidden">
    <div className="shrink-0 bg-white border-b border-stone-200 px-4 sm:px-8">
      <div className="flex items-center justify-between py-4 gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-52" />
        </div>
        <Skeleton className="h-9 w-44" />
      </div>
    </div>
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 bg-stone-100">
      {/* AI briefing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-stone-200 p-6 h-40 space-y-3">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-5/6" />
          </div>
        ))}
      </div>

      {/* Sub-nav pills */}
      <div className="flex items-center gap-1 w-fit">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg" />
        ))}
      </div>

      <StatCardGrid count={4} />

      {/* Radial gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-stone-200 p-6 flex flex-col items-center gap-4">
            <Skeleton className="w-24 h-24 rounded-full" />
            <Skeleton className="h-2 w-20" />
          </div>
        ))}
      </div>

      {/* Funnel block */}
      <div className="bg-white border border-stone-200 p-6 sm:p-8 space-y-4">
        <Skeleton className="h-4 w-56" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-2 w-16" />
            <Skeleton className="h-9 flex-1" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** InboxTab — left conversation list, center chat thread, right CRM drawer. */
export const InboxSkeleton: React.FC = () => (
  <div className="flex-1 flex h-full overflow-hidden bg-stone-100">
    {/* Column 1 — contact list */}
    <div className="w-full lg:w-72 border-r border-stone-200 flex flex-col h-full bg-[#fafaf9] shrink-0">
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-16 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-full rounded-xl" />
        <Skeleton className="h-8 w-full rounded-xl" />
      </div>
      <div className="flex-1 px-2 space-y-1 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="px-3 py-3 flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Column 2 — chat thread (hidden on mobile by default in real layout) */}
    <div className="hidden lg:flex flex-1 flex-col h-full">
      <div className="h-16 px-6 bg-white border-b border-stone-200 flex items-center gap-2.5 shrink-0">
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-2 w-36" />
        </div>
      </div>
      <div className="flex-1 px-6 py-4 space-y-3 bg-[#f0ece4]">
        <div className="flex justify-start"><Skeleton className="h-10 w-1/2 rounded-2xl" /></div>
        <div className="flex justify-end"><Skeleton className="h-14 w-2/3 rounded-2xl" /></div>
        <div className="flex justify-start"><Skeleton className="h-8 w-1/3 rounded-2xl" /></div>
        <div className="flex justify-end"><Skeleton className="h-10 w-1/2 rounded-2xl" /></div>
      </div>
      <div className="px-4 py-3 border-t border-stone-200 bg-white">
        <Skeleton className="h-10 w-full rounded-2xl" />
      </div>
    </div>

    {/* Column 3 — CRM profile panel */}
    <div className="hidden lg:flex w-72 shrink-0 flex-col h-full bg-white border-l border-stone-200 p-4 space-y-4">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </div>
  </div>
);

/** CustomersTab — sticky header + stats strip + sidebar (segments/tags) + table. */
export const CustomersSkeleton: React.FC = () => (
  <div className="flex-1 flex flex-col overflow-hidden bg-stone-100">
    <div className="shrink-0 bg-white border-b border-stone-200 px-4 sm:px-8">
      <div className="flex items-center justify-between py-4 gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="flex items-center gap-4 pb-3 border-t border-stone-100 pt-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
    </div>

    <div className="flex-1 flex gap-5 px-4 sm:px-8 py-6 min-h-0 overflow-hidden">
      {/* Sidebar */}
      <div className="hidden lg:flex flex-col w-56 shrink-0 gap-4">
        <div className="bg-white border border-stone-200 p-4 space-y-2">
          <Skeleton className="h-3 w-24 mb-2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
        <div className="bg-white border border-stone-200 p-4 flex-1 space-y-2">
          <Skeleton className="h-3 w-20 mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      </div>

      {/* Main table */}
      <div className="flex-1 flex flex-col min-w-0 gap-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex-1 bg-white border border-stone-300 divide-y divide-stone-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-2 w-1/4" />
              </div>
              <Skeleton className="h-3 w-16 shrink-0" />
              <Skeleton className="h-3 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/** AdsTab — page header + grid of ad-campaign cards. */
export const AdsSkeleton: React.FC = () => (
  <div className="flex-1 p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#fafaf9] overflow-y-auto">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <Skeleton className="h-10 w-44" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-6 bg-white border border-stone-200 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-2 w-2/3" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** CampaignsTab — sticky header + status pills + grid of broadcast cards. */
export const CampaignsSkeleton: React.FC = () => (
  <div className="flex-1 overflow-y-auto bg-stone-100">
    <HeaderBand withPills />
    <div className="px-4 sm:px-8 py-6 space-y-4">
      <Skeleton className="h-3 w-44" />
      <ContentCardGrid count={6} />
    </div>
  </div>
);

/** TemplatesTab — sticky header + category filters + grid of template cards. */
export const TemplatesSkeleton: React.FC = () => (
  <div className="flex-1 overflow-y-auto bg-stone-100">
    <div className="sticky top-0 bg-white border-b border-stone-200 px-4 sm:px-8">
      <div className="flex items-center justify-between py-4 gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-8 w-56" />
      </div>
    </div>
    <div className="px-4 sm:px-8 py-6">
      <ContentCardGrid count={6} />
    </div>
  </div>
);

/** FlowsTab — top header + left flow list + right JSON/canvas editor. */
export const FlowsSkeleton: React.FC = () => (
  <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafaf9]">
    <div className="h-16 border-b border-stone-200 bg-[#fafaf9] px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2 w-48" />
        </div>
      </div>
      <Skeleton className="h-8 w-32" />
    </div>
    <div className="flex-1 flex overflow-hidden">
      <div className="w-64 shrink-0 border-r border-stone-200 p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  </div>
);

/** ChatbotTab — canvas header with live counters + node card placeholders on canvas. */
export const ChatbotSkeleton: React.FC = () => (
  <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafaf9]">
    <div className="h-16 border-b border-stone-200 bg-[#fafaf9] px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-2 w-44" />
          </div>
        </div>
        <div className="hidden xl:flex items-center gap-4 pl-5 border-l border-stone-200">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-2 w-10" />
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
    {/* Canvas with scattered node placeholders */}
    <div className="flex-1 relative overflow-hidden bg-[#fafaf9]">
      <div className="absolute" style={{ top: "10%", left: "8%" }}><Skeleton className="w-48 h-24" /></div>
      <div className="absolute" style={{ top: "35%", left: "32%" }}><Skeleton className="w-48 h-24" /></div>
      <div className="absolute" style={{ top: "10%", left: "56%" }}><Skeleton className="w-48 h-24" /></div>
      <div className="absolute" style={{ top: "60%", left: "20%" }}><Skeleton className="w-48 h-24" /></div>
      <div className="absolute" style={{ top: "60%", left: "60%" }}><Skeleton className="w-48 h-24" /></div>
    </div>
  </div>
);

/** RecipesSection — sticky header with category pills + grid of automation recipe cards. */
export const RecipesSkeleton: React.FC = () => (
  <div className="flex-1 flex flex-col overflow-hidden bg-stone-100">
    <HeaderBand withPills />
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
      <ContentCardGrid count={6} />
    </div>
  </div>
);

/** UseCasesTab — header + active-agent selector grid + sub-console panel. */
export const UseCasesSkeleton: React.FC = () => (
  <div className="flex-1 overflow-y-auto p-4 pb-12 sm:p-8 space-y-6 sm:space-y-8 bg-stone-100">
    <div className="flex items-center gap-3 border-b border-stone-200 pb-6">
      <Skeleton className="w-10 h-10" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-2 w-64" />
      </div>
    </div>
    <div className="bg-white border border-stone-200 p-5 sm:p-6 space-y-4">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-2 w-80 max-w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </div>
    <Skeleton className="h-48 w-full" />
  </div>
);

/** BookingCustomersTab — sticky header + stat cards + search/filter bar + customer list rows. */
export const BookingCustomersSkeleton: React.FC = () => (
  <div className="flex-1 flex flex-col overflow-hidden">
    <div className="shrink-0 bg-white border-b border-stone-200 px-4 sm:px-8">
      <div className="flex items-center justify-between py-4 gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="w-9 h-9" />
        </div>
      </div>
    </div>
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-4 bg-stone-100">
      <StatCardGrid count={4} />
      <Skeleton className="h-10 w-full" />
      <div className="bg-white border border-stone-200 divide-y divide-stone-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="w-9 h-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-2 w-1/2" />
            </div>
            <Skeleton className="h-3 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** IntegrationsTab — left integration list sidebar + right detail panel with config sections. */
export const IntegrationsSkeleton: React.FC = () => (
  <div className="flex h-full overflow-hidden bg-stone-100">
    <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-stone-200 bg-white h-full">
      <div className="px-5 pt-6 pb-4 border-b border-stone-100 space-y-2">
        <Skeleton className="h-2 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="flex-1 py-3 px-2 space-y-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-3 py-3.5 flex items-center gap-3">
            <Skeleton className="w-8 h-8 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </aside>
    <main className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-8 pt-6 pb-5 border-b border-stone-200 bg-white flex items-center gap-4">
        <Skeleton className="w-10 h-10" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-2 w-56" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-stone-100 p-8 space-y-6 max-w-3xl">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </main>
  </div>
);

/** NdrTab — mono/editorial header + setup banner + stat strip + filter tabs + table. */
export const NdrSkeleton: React.FC = () => (
  <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12 bg-[#fafaf9] space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#1D211F]/10">
      <div className="space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-2 w-72 max-w-full" />
      </div>
      <Skeleton className="h-9 w-28" />
    </div>
    <Skeleton className="h-16 w-full" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-[#1D211F]/10 p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-2 w-16" />
            <Skeleton className="h-6 w-10" />
          </div>
          <Skeleton className="w-10 h-10" />
        </div>
      ))}
    </div>
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-24" />
      ))}
    </div>
    <div className="bg-white border border-[#1D211F]/10 divide-y divide-[#1D211F]/8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-24 ml-auto" />
        </div>
      ))}
    </div>
  </div>
);

/** LaunchesTab — header + stat chips + left launch list + right launch detail. */
export const LaunchesSkeleton: React.FC = () => (
  <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12 bg-[#fafaf9] space-y-6">
    <div className="flex items-center justify-between gap-4 pb-6 border-b border-[#1D211F]/10">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-2 w-60" />
      </div>
      <Skeleton className="h-9 w-32" />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-[#1D211F]/10 px-4 py-3 space-y-1.5">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-2 w-16" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
      <div className="lg:col-span-2 bg-white border border-[#1D211F]/10 p-6 space-y-4">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-2 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  </div>
);

/** MarketplaceTab — section tabs (Overview/Products/Orders) + stat cards + toggle panels. */
export const MarketplaceSkeleton: React.FC = () => (
  <div className="flex-1 overflow-y-auto p-4 pb-12 sm:p-8 space-y-6 sm:space-y-8 bg-[#fafaf9]">
    <div className="flex max-lg:flex-col gap-4 lg:flex-row lg:items-center justify-between border-b border-stone-200 pb-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-2 w-44" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 max-lg:w-full lg:w-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
    </div>
    <StatCardGrid count={4} />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);

/** SettingsTab — page header + stacked form-section cards. */
export const SettingsSkeleton: React.FC = () => (
  <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 bg-stone-100">
    <div className="flex max-md:flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
    </div>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="bg-white border border-stone-200 overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center gap-3">
          <Skeleton className="w-10 h-10" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, j) => (
            <Skeleton key={j} className="h-16 w-full" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

/** AiWorkspace — top "stage" panel + bottom chat panel with message bubble placeholders. */
export const AiWorkspaceSkeleton: React.FC = () => (
  <div className="flex flex-col h-full overflow-hidden">
    {/* Top: stage */}
    <div className="flex-1 flex flex-col overflow-hidden bg-stone-100 min-h-0">
      <div className="h-14 px-6 bg-white border-b border-stone-200 flex items-center shrink-0">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="space-y-3 w-full max-w-md">
          <Skeleton className="h-4 w-2/3 mx-auto" />
          <Skeleton className="h-3 w-1/2 mx-auto" />
        </div>
      </div>
    </div>

    {/* Bottom: chat panel */}
    <div className="flex flex-col bg-white border-t border-stone-200 shrink-0" style={{ height: "360px" }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-6 h-6" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="flex-1 px-4 py-3 flex flex-col bg-stone-50 min-h-0">
        <div className="flex-1" />
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Skeleton className="w-6 h-6 rounded-lg shrink-0" />
            <Skeleton className="h-8 w-2/3 rounded-xl" />
          </div>
          <div className="flex items-start gap-2 flex-row-reverse">
            <Skeleton className="h-8 w-1/2 rounded-xl" />
          </div>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-stone-100 shrink-0">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  </div>
);
