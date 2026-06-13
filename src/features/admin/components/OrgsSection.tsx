"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Building2, Wifi, WifiOff, X, ChevronLeft, ChevronRight } from "lucide-react";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  contactCount: number;
  campaignCount: number;
  walletBalance: number;
  whatsappConnected: boolean;
  chatbotBuilderEnabled: boolean;
  createdAt: string;
}

interface OrgDetail {
  org: {
    id: string;
    name: string;
    slug: string;
    walletBalance: number;
    whatsappConnected: boolean;
    chatbotBuilderEnabled: boolean;
    createdAt: string;
  };
  memberCount: number;
  contactCount: number;
  campaignCount: number;
  totalSpent: number;
  recentLogs: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
}

const LOG_TYPE_COLORS: Record<string, string> = {
  campaign: "bg-blue-50 border-blue-200 text-blue-700",
  chat: "bg-emerald-50 border-emerald-200 text-emerald-700",
  integration: "bg-purple-50 border-purple-200 text-purple-700",
  crm: "bg-amber-50 border-amber-200 text-amber-700",
};

interface OrgsSectionProps {
  onNavigateToOrg: (orgId: string) => void;
}

export function OrgsSection({ onNavigateToOrg }: OrgsSectionProps) {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgDetail, setOrgDetail] = useState<OrgDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [patchLoading, setPatchLoading] = useState(false);
  const [walletInput, setWalletInput] = useState("");

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrgs = useCallback(
    async (q: string, p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ search: q, page: String(p) });
        const res = await fetch(`/api/admin/orgs?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        setOrgs(data.orgs ?? []);
        setTotal(data.total ?? 0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPage(1);
      fetchOrgs(search, 1);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search, fetchOrgs]);

  useEffect(() => {
    fetchOrgs(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (!selectedOrgId) {
      setOrgDetail(null);
      return;
    }
    let cancelled = false;
    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/admin/orgs/${selectedOrgId}`);
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (!cancelled) setOrgDetail(data);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedOrgId]);

  const handleToggle = async (field: "chatbotBuilderEnabled" | "whatsappConnected", value: boolean) => {
    if (!selectedOrgId || !orgDetail) return;
    setPatchLoading(true);
    // Optimistic update
    setOrgDetail((prev) =>
      prev ? { ...prev, org: { ...prev.org, [field]: value } } : prev
    );
    try {
      const res = await fetch(`/api/admin/orgs/${selectedOrgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        // Revert on failure
        setOrgDetail((prev) =>
          prev ? { ...prev, org: { ...prev.org, [field]: !value } } : prev
        );
      }
    } finally {
      setPatchLoading(false);
    }
  };

  const handleWalletAdjust = async (direction: "credit" | "debit") => {
    if (!selectedOrgId || !orgDetail) return;
    const amount = parseFloat(walletInput);
    if (isNaN(amount) || amount <= 0) return;
    const adj = direction === "credit" ? amount : -amount;
    const confirmed = window.confirm(
      `Adjust wallet by ${direction === "credit" ? "+" : "-"}₹${amount.toFixed(2)} for ${orgDetail.org.name}?`
    );
    if (!confirmed) return;
    setPatchLoading(true);
    try {
      const res = await fetch(`/api/admin/orgs/${selectedOrgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAdjustment: adj }),
      });
      if (res.ok) {
        setOrgDetail((prev) =>
          prev
            ? {
                ...prev,
                org: {
                  ...prev.org,
                  walletBalance: prev.org.walletBalance + adj,
                },
              }
            : prev
        );
        setWalletInput("");
      }
    } finally {
      setPatchLoading(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="p-4 lg:p-8 space-y-5 lg:pt-8 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 flex-1">
          <h1 className="font-black text-2xl uppercase tracking-tight text-stone-950">
            Organizations
          </h1>
          {!loading && (
            <span className="text-[9px] font-black px-1.5 py-0.5 border border-stone-200 bg-stone-50 text-stone-600 uppercase tracking-wider">
              {total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search orgs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-stone-200 bg-white text-xs px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 w-48"
          />
          <button
            title="Coming soon"
            disabled
            className="opacity-40 cursor-not-allowed bg-stone-950 text-white text-xs font-bold uppercase tracking-wider px-4 py-2"
          >
            + New Org →
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-stone-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                  Org / Slug
                </th>
                <th className="text-right px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                  Members
                </th>
                <th className="text-right px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                  Contacts
                </th>
                <th className="text-right px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                  Campaigns
                </th>
                <th className="text-right px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                  Wallet ₹
                </th>
                <th className="text-center px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                  WA
                </th>
                <th className="text-center px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                  Chatbot
                </th>
                <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                  Created
                </th>
                <th className="text-center px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-stone-50">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-stone-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Building2 className="w-8 h-8 text-stone-200 mx-auto mb-2" />
                    <p className="text-xs text-stone-400 font-bold">No organizations found</p>
                  </td>
                </tr>
              ) : (
                orgs.map((org) => (
                  <tr
                    key={org.id}
                    className="border-b border-stone-50 hover:bg-stone-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-stone-950 leading-none mb-0.5">
                        {org.name}
                      </div>
                      <div className="text-stone-400 font-mono text-[10px]">{org.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-stone-700">
                      {org.memberCount}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-stone-700">
                      {org.contactCount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-stone-700">
                      {org.campaignCount}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-stone-700">
                      {org.walletBalance.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {org.whatsappConnected ? (
                        <Wifi className="w-3.5 h-3.5 text-wa-green mx-auto" />
                      ) : (
                        <WifiOff className="w-3.5 h-3.5 text-red-400 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block w-2 h-2 ${
                          org.chatbotBuilderEnabled ? "bg-wa-green" : "bg-stone-300"
                        }`}
                      />
                    </td>
                    <td className="px-4 py-3 text-stone-500">{formatDate(org.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedOrgId(org.id)}
                        className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border border-stone-200 hover:bg-stone-950 hover:text-white hover:border-stone-950 transition-all cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 bg-stone-50">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedOrgId && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setSelectedOrgId(null)}
          />
          <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-white border-l border-stone-200 z-50 flex flex-col overflow-hidden">
            {/* Sticky header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 shrink-0 bg-white">
              <div>
                <h2 className="font-black text-sm uppercase tracking-tight text-stone-950">
                  {orgDetail?.org.name ?? "Loading…"}
                </h2>
                {orgDetail && (
                  <p className="text-[10px] font-mono text-stone-400 mt-0.5">
                    /{orgDetail.org.slug}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedOrgId(null)}
                className="p-1.5 hover:bg-stone-100 text-stone-500 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {detailLoading ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-8 bg-stone-100 animate-pulse" />
                  ))}
                </div>
              ) : orgDetail ? (
                <div className="p-5 space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Members", value: String(orgDetail.memberCount) },
                      { label: "Contacts", value: orgDetail.contactCount.toLocaleString("en-IN") },
                      { label: "Campaigns", value: String(orgDetail.campaignCount) },
                      { label: "Total Spent", value: `₹${orgDetail.totalSpent.toFixed(2)}` },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="border border-stone-200 p-3 space-y-1"
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          {item.label}
                        </div>
                        <div className="text-lg font-black text-stone-950">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Feature Toggles */}
                  <div className="border border-stone-200 p-4 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 mb-3">
                      Feature Toggles
                    </p>
                    {/* Chatbot Builder Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-700">
                        Chatbot Builder
                      </span>
                      <button
                        onClick={() =>
                          handleToggle(
                            "chatbotBuilderEnabled",
                            !orgDetail.org.chatbotBuilderEnabled
                          )
                        }
                        disabled={patchLoading}
                        className={`relative w-10 h-5 transition-colors cursor-pointer disabled:opacity-50 ${
                          orgDetail.org.chatbotBuilderEnabled
                            ? "bg-wa-green"
                            : "bg-stone-200"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white transition-all duration-200 ${
                            orgDetail.org.chatbotBuilderEnabled ? "left-5" : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    {/* WA Connected Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-700">
                        WhatsApp Connected
                      </span>
                      <button
                        onClick={() =>
                          handleToggle(
                            "whatsappConnected",
                            !orgDetail.org.whatsappConnected
                          )
                        }
                        disabled={patchLoading}
                        className={`relative w-10 h-5 transition-colors cursor-pointer disabled:opacity-50 ${
                          orgDetail.org.whatsappConnected ? "bg-wa-green" : "bg-stone-200"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white transition-all duration-200 ${
                            orgDetail.org.whatsappConnected ? "left-5" : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Wallet Adjustment */}
                  <div className="border border-stone-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                        Wallet Balance
                      </p>
                      <span className="text-sm font-black text-stone-950">
                        ₹{orgDetail.org.walletBalance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount"
                        value={walletInput}
                        onChange={(e) => setWalletInput(e.target.value)}
                        className="flex-1 border border-stone-200 px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
                      />
                      <button
                        onClick={() => handleWalletAdjust("credit")}
                        disabled={patchLoading || !walletInput}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Credit +
                      </button>
                      <button
                        onClick={() => handleWalletAdjust("debit")}
                        disabled={patchLoading || !walletInput}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Debit −
                      </button>
                    </div>
                  </div>

                  {/* Recent Logs */}
                  <div className="border border-stone-200 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 mb-3">
                      Recent Activity
                    </p>
                    {orgDetail.recentLogs.length === 0 ? (
                      <p className="text-xs text-stone-400">No activity logged yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {orgDetail.recentLogs.map((log) => (
                          <li key={log.id} className="flex items-start gap-2">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 border shrink-0 mt-0.5 ${
                                LOG_TYPE_COLORS[log.type] ??
                                "bg-stone-50 border-stone-200 text-stone-600"
                              }`}
                            >
                              {log.type.toUpperCase()}
                            </span>
                            <span className="text-xs text-stone-600 flex-1 leading-relaxed">
                              {log.message}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono shrink-0">
                              {formatTime(log.createdAt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Open Dashboard link */}
                  <a
                    href={`/org/${selectedOrgId}?tab=overview`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full border border-stone-200 hover:bg-stone-950 hover:text-white hover:border-stone-950 text-stone-700 text-xs font-bold uppercase tracking-wider px-4 py-2.5 transition-all"
                  >
                    Open Org Dashboard →
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* suppress unused prop warning */}
      <span className="hidden">{String(onNavigateToOrg)}</span>
    </div>
  );
}
