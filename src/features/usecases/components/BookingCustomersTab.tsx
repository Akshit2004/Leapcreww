"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/shared/context/AppContext";
import { notify } from "@/shared/lib/toast";
import { formatSlotDateTime } from "@/shared/lib/datetime";
import {
  Users,
  CalendarClock,
  CheckCircle2,
  Ban,
  XCircle,
  RefreshCw,
  Search,
  Download,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Phone,
  CalendarCheck,
  TrendingDown,
} from "lucide-react";

type BookingStatus = "booked" | "completed" | "no_show" | "cancelled";

interface Booking {
  id: string;
  serviceName: string;
  startTime: string;
  price: number;
  bookingForName: string;
  status: BookingStatus;
  contact: { id: string; name: string; phone: string } | null;
}

interface CustomerRow {
  contactId: string;
  name: string;
  phone: string;
  bookings: Booking[];
  total: number;
  upcoming: number;
  completed: number;
  noShow: number;
  cancelled: number;
  lastVisit: string | null;
  nextAppt: string | null;
  feesCompleted: number; // paise — sum of completed bookings' fees
}

interface BookingCustomersTabProps {
  onNavigate: (tab: string) => void;
}

export const BookingCustomersTab: React.FC<BookingCustomersTabProps> = ({ onNavigate }) => {
  const params = useParams();
  const orgId = params.orgId as string;
  const { setActiveContactId } = useApp();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/usecase/bookings?orgId=${orgId}`);
      const data = await res.json();
      if (res.ok) setBookings(data.bookings || []);
    } catch (err) {
      console.error("Failed to fetch bookings", err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const services = useMemo(
    () => [...new Set(bookings.map((b) => b.serviceName))].sort(),
    [bookings],
  );

  // Aggregate bookings into one row per customer (contact).
  const now = Date.now();
  const customers = useMemo<CustomerRow[]>(() => {
    const map = new Map<string, CustomerRow>();
    for (const b of bookings) {
      if (!b.contact) continue; // contact is required; skip any orphaned rows defensively
      if (serviceFilter !== "all" && b.serviceName !== serviceFilter) continue;
      const c = b.contact;
      let row = map.get(c.id);
      if (!row) {
        row = {
          contactId: c.id,
          name: c.name,
          phone: c.phone,
          bookings: [],
          total: 0,
          upcoming: 0,
          completed: 0,
          noShow: 0,
          cancelled: 0,
          lastVisit: null,
          nextAppt: null,
          feesCompleted: 0,
        };
        map.set(c.id, row);
      }
      row.bookings.push(b);
      row.total += 1;
      const start = new Date(b.startTime).getTime();
      if (b.status === "booked" && start >= now) {
        row.upcoming += 1;
        if (!row.nextAppt || start < new Date(row.nextAppt).getTime()) row.nextAppt = b.startTime;
      }
      if (b.status === "completed") {
        row.completed += 1;
        row.feesCompleted += b.price;
      }
      if (b.status === "no_show") row.noShow += 1;
      if (b.status === "cancelled") row.cancelled += 1;
      // Last visit = most recent past, non-cancelled booking.
      if (b.status !== "cancelled" && start < now) {
        if (!row.lastVisit || start > new Date(row.lastVisit).getTime()) row.lastVisit = b.startTime;
      }
    }
    for (const row of map.values()) {
      row.bookings.sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime));
    }
    return [...map.values()];
  }, [bookings, serviceFilter, now]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q))
      : customers;
    // Most engaged first: upcoming, then total bookings.
    return [...rows].sort((a, b) => b.upcoming - a.upcoming || b.total - a.total);
  }, [customers, search]);

  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const withUpcoming = customers.filter((c) => c.upcoming > 0).length;
    const totalBookings = customers.reduce((n, c) => n + c.total, 0);
    const totalNoShow = customers.reduce((n, c) => n + c.noShow, 0);
    const noShowRate = totalBookings > 0 ? Math.round((totalNoShow / totalBookings) * 100) : 0;
    return { totalCustomers, withUpcoming, totalBookings, noShowRate };
  }, [customers]);

  const act = async (bookingId: string, status: BookingStatus) => {
    setBusyId(bookingId);
    try {
      const res = await fetch(`/api/usecase/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify.error("Couldn't update booking", data.error || "An unexpected error occurred.");
      } else {
        setBookings(data.bookings || []);
        notify.success(
          status === "cancelled" ? "Booking cancelled" : status === "completed" ? "Marked completed" : "Marked no-show",
          status === "cancelled" ? "The customer has been notified on WhatsApp." : undefined,
        );
      }
    } catch {
      notify.error("Couldn't update booking", "Please try again in a moment.");
    } finally {
      setBusyId(null);
    }
  };

  const messageOnWhatsApp = (contactId: string) => {
    setActiveContactId(contactId);
    onNavigate("inbox");
  };

  const exportCsv = () => {
    const header = [
      "Customer",
      "Phone",
      "Total Bookings",
      "Upcoming",
      "Completed",
      "No-show",
      "Cancelled",
      "Last Visit",
      "Next Appointment",
      "Fees Collected (INR)",
    ];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = filtered.map((c) =>
      [
        c.name,
        c.phone,
        c.total,
        c.upcoming,
        c.completed,
        c.noShow,
        c.cancelled,
        c.lastVisit ? formatSlotDateTime(c.lastVisit) : "—",
        c.nextAppt ? formatSlotDateTime(c.nextAppt) : "—",
        (c.feesCompleted / 100).toFixed(2),
      ]
        .map(esc)
        .join(","),
    );
    const csv = [header.map(esc).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `booking-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-2xl font-light text-stone-950 tracking-tight">Slot Booking Customers</h1>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed max-w-xl">
            Everyone who has booked a slot, with their full booking history. One row per customer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-stone-900 rounded-none border border-stone-300 text-xs font-bold hover:border-stone-900 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={fetchBookings}
            className="p-2.5 border border-stone-300 hover:border-stone-900 cursor-pointer text-stone-600"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Customers" value={stats.totalCustomers} />
        <StatCard icon={CalendarCheck} label="With upcoming" value={stats.withUpcoming} />
        <StatCard icon={CalendarClock} label="Total bookings" value={stats.totalBookings} />
        <StatCard icon={TrendingDown} label="No-show rate" value={`${stats.noShowRate}%`} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone…"
            className="w-full pl-9 pr-3 py-2.5 rounded-none border border-stone-200 text-sm focus:outline-none focus:border-stone-900 bg-white"
          />
        </div>
        {services.length > 1 && (
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-3 py-2.5 rounded-none border border-stone-200 text-xs focus:outline-none focus:border-stone-900 bg-white max-w-[200px]"
          >
            <option value="all">All services</option>
            {services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-5 h-5 text-stone-900 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-stone-200 p-10 text-center text-stone-500 text-xs uppercase tracking-wider">
          {search ? "No customers match your search." : "No slot bookings yet."}
        </div>
      ) : (
        <div className="bg-white rounded-none border border-stone-200 divide-y divide-stone-100">
          {filtered.map((c) => {
            const open = expanded === c.contactId;
            return (
              <div key={c.contactId}>
                {/* Customer summary row */}
                <div className="flex items-center gap-3 p-4">
                  <button
                    onClick={() => setExpanded(open ? null : c.contactId)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    {open ? (
                      <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-stone-900 truncate">{c.name}</span>
                        <span className="text-[11px] text-stone-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {c.phone}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>{c.total} booking{c.total === 1 ? "" : "s"}</span>
                        {c.upcoming > 0 && <span className="text-emerald-700 font-bold">{c.upcoming} upcoming</span>}
                        {c.noShow > 0 && <span className="text-amber-700">{c.noShow} no-show</span>}
                        {c.nextAppt && <span className="text-stone-400">Next: {formatSlotDateTime(c.nextAppt)}</span>}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => messageOnWhatsApp(c.contactId)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider border border-stone-200 rounded-none text-stone-600 hover:border-stone-900 hover:text-stone-900 cursor-pointer transition-colors shrink-0"
                    title="Message on WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> <span className="max-sm:hidden">WhatsApp</span>
                  </button>
                </div>

                {/* Expanded booking history */}
                {open && (
                  <div className="bg-stone-50 border-t border-stone-100 divide-y divide-stone-100">
                    {c.bookings.map((b) => {
                      const upcoming = b.status === "booked" && new Date(b.startTime).getTime() >= now;
                      return (
                        <div key={b.id} className="flex max-md:flex-col md:items-center justify-between gap-3 px-4 py-3 pl-11">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-stone-900 truncate">{b.serviceName}</span>
                              <BookingBadge status={b.status} pastDue={b.status === "booked" && new Date(b.startTime).getTime() < now} />
                            </div>
                            <div className="text-[11px] text-stone-500 mt-1">
                              {formatSlotDateTime(b.startTime)} · {b.price > 0 ? `₹${(b.price / 100).toFixed(2)}` : "Free"}
                              {b.bookingForName && b.bookingForName !== c.name ? ` · for ${b.bookingForName}` : ""}
                            </div>
                          </div>
                          {upcoming && (
                            <div className="flex flex-wrap gap-1.5 shrink-0">
                              <ActionButton label="Completed" icon={CheckCircle2} disabled={busyId === b.id} onClick={() => act(b.id, "completed")} />
                              <ActionButton label="No-show" icon={Ban} disabled={busyId === b.id} onClick={() => act(b.id, "no_show")} />
                              <ActionButton label="Cancel" icon={XCircle} variant="danger" disabled={busyId === b.id} onClick={() => act(b.id, "cancelled")} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Small UI atoms ──────────────────────────────────────────────────────────

const BookingBadge: React.FC<{ status: BookingStatus; pastDue: boolean }> = ({ status, pastDue }) => {
  const map: Record<string, { label: string; cls: string }> = {
    booked: pastDue
      ? { label: "Past due", cls: "text-amber-700 bg-amber-50 border-amber-200" }
      : { label: "Confirmed", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    completed: { label: "Completed", cls: "text-stone-700 bg-stone-100 border-stone-300" },
    no_show: { label: "No-show", cls: "text-amber-800 bg-amber-50 border-amber-200" },
    cancelled: { label: "Cancelled", cls: "text-red-700 bg-red-50 border-red-200" },
  };
  const c = map[status] || map.booked;
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 border rounded-none uppercase ${c.cls}`}>
      {c.label}
    </span>
  );
};

const ActionButton: React.FC<{
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
}> = ({ label, icon: Icon, onClick, disabled, variant = "default" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider border rounded-none cursor-pointer transition-colors disabled:opacity-50 ${
      variant === "danger"
        ? "border-stone-200 text-stone-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50"
        : "border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900"
    }`}
  >
    <Icon className="w-3.5 h-3.5" /> {label}
  </button>
);

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode }> = ({ icon: Icon, label, value }) => (
  <div className="bg-white rounded-none p-4 border border-stone-200">
    <div className="flex items-center gap-2 text-stone-400 mb-2">
      <Icon className="w-4 h-4" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-xl font-light text-stone-950">{value}</div>
  </div>
);
