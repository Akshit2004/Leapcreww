"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Users, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface Membership {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: string;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  memberships: Membership[];
  createdAt: string;
}

const ROLE_STYLES: Record<string, string> = {
  OWNER: "bg-stone-950 text-white text-[9px] px-1.5 py-0.5 font-black uppercase tracking-wider",
  ADMIN: "bg-stone-700 text-white text-[9px] px-1.5 py-0.5 font-black uppercase tracking-wider",
  AGENT: "border border-stone-200 text-stone-600 bg-stone-50 text-[9px] px-1.5 py-0.5 font-black uppercase tracking-wider",
};

const getRoleStyle = (role: string) =>
  ROLE_STYLES[role.toUpperCase()] ?? ROLE_STYLES.AGENT;

const getUniqueRoles = (memberships: Membership[]) => {
  const seen = new Set<string>();
  return memberships.filter((m) => {
    const key = m.role.toUpperCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function UsersSection() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: q, page: String(p) });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPage(1);
      fetchUsers(search, 1);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search, fetchUsers]);

  useEffect(() => {
    fetchUsers(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });

  const toggleExpand = (userId: string) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  };

  return (
    <div className="p-4 lg:p-8 space-y-5 lg:pt-8 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 flex-1">
          <h1 className="font-black text-2xl uppercase tracking-tight text-stone-950">
            Users
          </h1>
          {!loading && (
            <span className="text-[9px] font-black px-1.5 py-0.5 border border-stone-200 bg-stone-50 text-stone-600 uppercase tracking-wider">
              {total}
            </span>
          )}
        </div>
        <input
          type="text"
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-stone-200 bg-white text-xs px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 w-48"
        />
      </div>

      {/* Table */}
      <div className="border border-stone-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                  Name
                </th>
                <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                  Email
                </th>
                <th className="text-center px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                  Orgs
                </th>
                <th className="text-left px-4 py-2.5 font-black uppercase tracking-wider text-stone-400 text-[10px]">
                  Roles
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
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-stone-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Users className="w-8 h-8 text-stone-200 mx-auto mb-2" />
                    <p className="text-xs text-stone-400 font-bold">No users found</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <>
                    <tr
                      key={user.id}
                      className="border-b border-stone-50 hover:bg-stone-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-stone-950">
                        {user.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-stone-600 font-mono text-[10px]">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[9px] font-black px-1.5 py-0.5 border border-stone-200 bg-stone-50 text-stone-600">
                          {user.memberships.length}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {getUniqueRoles(user.memberships).map((m) => (
                            <span key={m.role} className={getRoleStyle(m.role)}>
                              {m.role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-stone-500">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => toggleExpand(user.id)}
                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border border-stone-200 hover:bg-stone-950 hover:text-white hover:border-stone-950 transition-all cursor-pointer"
                          >
                            {expandedUserId === user.id ? (
                              <>
                                Collapse <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                Expand <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                          <button
                            title="Coming soon"
                            disabled
                            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border border-stone-200 text-stone-400 opacity-40 cursor-not-allowed"
                          >
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Accordion row */}
                    {expandedUserId === user.id && (
                      <tr key={`${user.id}-expanded`} className="border-b border-stone-100 bg-stone-50/60">
                        <td colSpan={6} className="px-6 py-3">
                          {user.memberships.length === 0 ? (
                            <p className="text-xs text-stone-400">No memberships.</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr>
                                  <th className="text-left py-1 pr-4 font-black uppercase tracking-wider text-stone-400 text-[9px]">
                                    Org Name
                                  </th>
                                  <th className="text-left py-1 pr-4 font-black uppercase tracking-wider text-stone-400 text-[9px]">
                                    Role
                                  </th>
                                  <th className="text-left py-1 font-black uppercase tracking-wider text-stone-400 text-[9px]">
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {user.memberships.map((m) => (
                                  <tr key={m.orgId} className="border-t border-stone-100">
                                    <td className="py-1.5 pr-4 font-bold text-stone-700">
                                      {m.orgName}
                                      <span className="ml-1.5 font-mono text-stone-400 text-[9px]">
                                        /{m.orgSlug}
                                      </span>
                                    </td>
                                    <td className="py-1.5 pr-4">
                                      <span className={getRoleStyle(m.role)}>{m.role}</span>
                                    </td>
                                    <td className="py-1.5">
                                      <a
                                        href={`/org/${m.orgId}?tab=overview`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-stone-950 transition-colors"
                                      >
                                        Open Org <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
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
    </div>
  );
}
