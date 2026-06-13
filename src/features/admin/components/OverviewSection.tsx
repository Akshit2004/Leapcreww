"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Users,
  UserCheck,
  Send,
  Wifi,
  CreditCard,
  TrendingUp,
  Plus,
} from "lucide-react";

interface AdminStats {
  totalOrgs: number;
  totalUsers: number;
  totalContacts: number;
  totalMessagesSent: number;
  connectedOrgs: number;
  revenueThisMonthMinor: number;
  topupsThisMonthMajor: number;
  newOrgsThisMonth: number;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-white border border-stone-200 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
          {label}
        </span>
        <Icon className="w-3.5 h-3.5 text-stone-300" />
      </div>
      <div className="text-2xl font-black text-stone-950 leading-none">{value}</div>
    </div>
  );
}

export function OverviewSection() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (cancelled) return;
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStats(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const healthPct =
    stats && stats.totalOrgs > 0
      ? ((stats.connectedOrgs / stats.totalOrgs) * 100).toFixed(0)
      : "0";

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:pt-8 pt-16">
      {/* Header */}
      <div className="space-y-0.5">
        <h1 className="font-black text-2xl uppercase tracking-tight text-stone-950">
          Platform Overview
        </h1>
        <p className="text-xs text-stone-400 font-medium">
          {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
        </p>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-stone-100 animate-pulse border border-stone-200"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Orgs"
            value={String(stats?.totalOrgs ?? 0)}
            icon={Building2}
          />
          <StatCard
            label="Total Users"
            value={String(stats?.totalUsers ?? 0)}
            icon={Users}
          />
          <StatCard
            label="Total Contacts"
            value={(stats?.totalContacts ?? 0).toLocaleString("en-IN")}
            icon={UserCheck}
          />
          <StatCard
            label="Messages Sent"
            value={(stats?.totalMessagesSent ?? 0).toLocaleString("en-IN")}
            icon={Send}
          />
          <StatCard
            label="WA Connected"
            value={`${stats?.connectedOrgs ?? 0} / ${stats?.totalOrgs ?? 0}`}
            icon={Wifi}
          />
          <StatCard
            label="Revenue (30d)"
            value={`₹${((stats?.revenueThisMonthMinor ?? 0) / 100).toFixed(0)}`}
            icon={CreditCard}
          />
          <StatCard
            label="Topups (30d)"
            value={`₹${(stats?.topupsThisMonthMajor ?? 0).toFixed(0)}`}
            icon={TrendingUp}
          />
          <StatCard
            label="New Orgs (30d)"
            value={String(stats?.newOrgsThisMonth ?? 0)}
            icon={Plus}
          />
        </div>
      )}

      {/* WhatsApp Health Bar */}
      {!loading && stats && (
        <div className="bg-white border border-stone-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
              WhatsApp Connection Health
            </span>
            <span className="text-xs font-black text-stone-950">{healthPct}%</span>
          </div>
          <div className="h-1.5 bg-stone-100 w-full">
            <div
              className="h-1.5 bg-wa-green transition-all duration-500"
              style={{ width: `${healthPct}%` }}
            />
          </div>
          <p className="text-xs text-stone-500">
            <span className="font-bold text-stone-950">{stats.connectedOrgs}</span> of{" "}
            <span className="font-bold text-stone-950">{stats.totalOrgs}</span> organizations
            connected
          </p>
        </div>
      )}
    </div>
  );
}
