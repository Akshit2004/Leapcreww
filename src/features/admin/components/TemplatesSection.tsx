"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Loader, ChevronLeft, ChevronRight } from "lucide-react";
import { ConfirmProvider, useConfirm } from "@/shared/components/ui/ConfirmDialog";

interface TemplateRow {
  id: string;
  name: string;
  body: string;
  category: string;
  metaStatus: string;
  orgName: string;
  orgId: string;
  createdAt: string;
  isShared: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  MARKETING: "bg-amber-50 border-amber-200 text-amber-700",
  UTILITY: "bg-blue-50 border-blue-200 text-blue-700",
  AUTHENTICATION: "bg-purple-50 border-purple-200 text-purple-700",
};

const META_STATUS_COLORS: Record<string, string> = {
  approved: "bg-emerald-50 border-emerald-200 text-emerald-700",
  APPROVED: "bg-emerald-50 border-emerald-200 text-emerald-700",
  pending: "bg-amber-50 border-amber-200 text-amber-700",
  PENDING: "bg-amber-50 border-amber-200 text-amber-700",
  rejected: "bg-red-50 border-red-200 text-red-700",
  REJECTED: "bg-red-50 border-red-200 text-red-700",
};

const CATEGORY_OPTIONS = ["All", "MARKETING", "UTILITY", "AUTHENTICATION"];

function TemplatesSectionInner() {
  const confirm = useConfirm();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTemplates = useCallback(async (q: string, cat: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: q,
        category: cat === "All" ? "" : cat,
        page: String(p),
      });
      const res = await fetch(`/api/admin/templates?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setTemplates(data.templates ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPage(1);
      fetchTemplates(search, categoryFilter, 1);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search, categoryFilter, fetchTemplates]);

  useEffect(() => {
    fetchTemplates(search, categoryFilter, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleUnshare = async (id: string) => {
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isShared: false }),
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
      }
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Delete Template",
      description: "Permanently delete this template? This cannot be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
      }
    } finally {
      setPendingId(null);
      // Suppress unused variable warning
      void name;
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });

  return (
    <div className="p-4 lg:p-8 space-y-5 lg:pt-8 pt-16">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 flex-1">
            <h1 className="font-black text-2xl uppercase tracking-tight text-stone-950">
              Shared Templates
            </h1>
            {!loading && (
              <span className="text-[9px] font-black px-1.5 py-0.5 border border-stone-200 bg-stone-50 text-stone-600 uppercase tracking-wider">
                {total}
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-stone-200 bg-white text-xs px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 w-48"
          />
        </div>
        {/* Category filters */}
        <div className="flex items-center gap-1 flex-wrap">
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 transition-all cursor-pointer ${
                categoryFilter === cat
                  ? "bg-stone-950 text-white"
                  : "border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {cat === "All" ? "All" : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-stone-200 bg-white overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  {["Name", "Body", "Category", "Status", "Owner", "Created", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-stone-50">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-stone-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : templates.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <FileText className="w-10 h-10 text-stone-300" />
            <p className="font-black text-stone-700 text-sm uppercase tracking-tight">
              No shared templates
            </p>
            <p className="text-xs text-stone-400">
              Templates marked as shared will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                    Name
                  </th>
                  <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                    Body
                  </th>
                  <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                    Category
                  </th>
                  <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                    Status
                  </th>
                  <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                    Owner
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
                {templates.map((tpl) => (
                  <tr
                    key={tpl.id}
                    className="border-b border-stone-50 hover:bg-stone-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-stone-950 max-w-[140px] truncate">
                      {tpl.name}
                    </td>
                    <td className="px-4 py-3 text-stone-500 max-w-[200px]">
                      <span className="line-clamp-2">
                        {tpl.body.length > 80 ? tpl.body.slice(0, 80) + "…" : tpl.body}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 border ${
                          CATEGORY_COLORS[tpl.category.toUpperCase()] ??
                          "bg-stone-50 border-stone-200 text-stone-600"
                        }`}
                      >
                        {tpl.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 border ${
                          META_STATUS_COLORS[tpl.metaStatus] ??
                          "bg-stone-50 border-stone-200 text-stone-600"
                        }`}
                      >
                        {tpl.metaStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600 font-bold">{tpl.orgName}</td>
                    <td className="px-4 py-3 text-stone-500">{formatDate(tpl.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleUnshare(tpl.id)}
                          disabled={pendingId === tpl.id}
                          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-stone-200 hover:bg-stone-100 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {pendingId === tpl.id ? (
                            <Loader className="w-3 h-3 animate-spin" />
                          ) : null}
                          Unshare
                        </button>
                        <button
                          onClick={() => handleDelete(tpl.id, tpl.name)}
                          disabled={pendingId === tpl.id}
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
    </div>
  );
}

export function TemplatesSection() {
  return (
    <ConfirmProvider>
      <TemplatesSectionInner />
    </ConfirmProvider>
  );
}
