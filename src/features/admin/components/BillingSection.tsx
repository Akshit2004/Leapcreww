"use client";

import { useState, useEffect } from "react";
import { CreditCard, TrendingUp, BarChart3 } from "lucide-react";

interface DailyRevenue {
  date: string;
  minor: number;
}

interface OrgRevenue {
  orgId: string;
  orgName: string;
  orgSlug: string;
  totalSpentMinor: number;
}

interface BillingData {
  totalRevenueMinor: number;
  totalTopupsCount: number;
  totalTopupsMajor: number;
  dailyRevenue: DailyRevenue[];
  perOrgBreakdown: OrgRevenue[];
}

type DayRange = 30 | 60 | 90;

export function BillingSection() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayRange>(30);

  useEffect(() => {
    let cancelled = false;
    const fetchBilling = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/billing?days=${days}`);
        if (cancelled || !res.ok) return;
        const d = await res.json();
        if (!cancelled) setData(d);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchBilling();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const avgRevenuePerOrg =
    data && data.perOrgBreakdown.length > 0
      ? (data.totalRevenueMinor / 100 / data.perOrgBreakdown.length).toFixed(0)
      : "0";

  // SVG chart
  const renderChart = () => {
    if (!data || data.dailyRevenue.length === 0) return null;
    const maxMinor = Math.max(...data.dailyRevenue.map((d) => d.minor), 1);
    const count = data.dailyRevenue.length;
    const barWidth = Math.max(4, Math.floor(560 / count) - 2);
    const viewW = count * (barWidth + 2);
    const firstDate = data.dailyRevenue[0]?.date ?? "";
    const lastDate = data.dailyRevenue[data.dailyRevenue.length - 1]?.date ?? "";

    return (
      <div className="border border-stone-200 bg-white p-4 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">
          Daily Revenue (₹)
        </p>
        <svg
          width="100%"
          viewBox={`0 0 ${viewW} 100`}
          className="w-full h-20"
          preserveAspectRatio="none"
        >
          {data.dailyRevenue.map((d, i) => {
            const barH = Math.max(2, (d.minor / maxMinor) * 80);
            return (
              <rect
                key={d.date}
                x={i * (barWidth + 2)}
                y={100 - barH}
                width={barWidth}
                height={barH}
                className="fill-stone-950"
              />
            );
          })}
        </svg>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-stone-400 font-mono">{firstDate}</span>
          <span className="text-[10px] text-stone-400 font-mono">{lastDate}</span>
        </div>
      </div>
    );
  };

  const DAY_OPTIONS: DayRange[] = [30, 60, 90];

  return (
    <div className="p-4 lg:p-8 space-y-5 lg:pt-8 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <h1 className="font-black text-2xl uppercase tracking-tight text-stone-950 flex-1">
          Billing & Revenue
        </h1>
        <div className="flex items-center gap-1">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 transition-all cursor-pointer ${
                days === d
                  ? "bg-stone-950 text-white"
                  : "border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-stone-100 animate-pulse border border-stone-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-stone-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Total Revenue
              </span>
              <CreditCard className="w-3.5 h-3.5 text-stone-300" />
            </div>
            <div className="text-2xl font-black text-stone-950">
              ₹{((data?.totalRevenueMinor ?? 0) / 100).toFixed(0)}
            </div>
          </div>

          <div className="bg-white border border-stone-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Wallet Topups
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-stone-300" />
            </div>
            <div className="text-2xl font-black text-stone-950">
              {data?.totalTopupsCount ?? 0}
            </div>
            <div className="text-xs text-stone-500 font-bold">
              ₹{(data?.totalTopupsMajor ?? 0).toFixed(0)} total
            </div>
          </div>

          <div className="bg-white border border-stone-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Avg Revenue / Org
              </span>
              <BarChart3 className="w-3.5 h-3.5 text-stone-300" />
            </div>
            <div className="text-2xl font-black text-stone-950">₹{avgRevenuePerOrg}</div>
          </div>
        </div>
      )}

      {/* Daily Revenue Chart */}
      {!loading && renderChart()}

      {/* Per-org table */}
      {!loading && data && data.perOrgBreakdown.length > 0 && (
        <div className="border border-stone-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
            <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">
              Per-Organization Breakdown
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                    Rank
                  </th>
                  <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                    Org Name
                  </th>
                  <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                    Slug
                  </th>
                  <th className="text-right px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                    Total Spent
                  </th>
                  <th className="text-center px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.perOrgBreakdown.map((org, idx) => (
                  <tr key={org.orgId} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-black text-stone-400 text-sm">
                      #{idx + 1}
                    </td>
                    <td className="px-4 py-3 font-bold text-stone-950">{org.orgName}</td>
                    <td className="px-4 py-3 font-mono text-stone-400 text-[10px]">
                      /{org.orgSlug}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-stone-950">
                      ₹{(org.totalSpentMinor / 100).toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        title="Coming soon"
                        disabled
                        className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border border-stone-200 text-stone-400 opacity-40 cursor-not-allowed"
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
