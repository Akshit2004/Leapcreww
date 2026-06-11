"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/shared/context/AppContext";
import { Phone, Plus, Trash2, Star, Loader, ChevronDown, ChevronUp } from "lucide-react";
import { useConfirm } from "@/shared/components/ui/ConfirmDialog";

interface PhoneNumberRecord {
  id: string;
  displayName: string;
  phoneNumber: string;
  phoneNumberId: string;
  isDefault: boolean;
  createdAt: string;
}

export const PhoneNumbersCard: React.FC = () => {
  const { organization } = useApp();
  const orgId = organization?.id;
  const confirm = useConfirm();

  const [numbers, setNumbers] = useState<PhoneNumberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [form, setForm] = useState({
    displayName: "",
    phoneNumber: "",
    phoneNumberId: "",
    whatsappBusinessAccountId: "",
    accessToken: "",
  });

  const fetchNumbers = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/org/${orgId}/phone-numbers`);
      if (res.ok) {
        const data = await res.json();
        setNumbers(data.phoneNumbers ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchNumbers(); }, [fetchNumbers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !form.displayName || !form.phoneNumber || !form.phoneNumberId) return;
    setBusy("add");
    setError(null);
    try {
      const res = await fetch(`/api/org/${orgId}/phone-numbers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to add number."); return; }
      setForm({ displayName: "", phoneNumber: "", phoneNumberId: "", whatsappBusinessAccountId: "", accessToken: "" });
      setShowAddForm(false);
      await fetchNumbers();
    } finally {
      setBusy(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!orgId) return;
    setBusy(id);
    setError(null);
    try {
      await fetch(`/api/org/${orgId}/phone-numbers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      await fetchNumbers();
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (num: PhoneNumberRecord) => {
    if (!orgId) return;
    const confirmed = await confirm({
      title: `Remove ${num.displayName}?`,
      description: `This removes ${num.phoneNumber} from your account. You won't be able to send from it until re-added.`,
      tone: "danger",
      confirmLabel: "Remove",
    });
    if (!confirmed) return;
    setBusy(num.id);
    setError(null);
    try {
      const res = await fetch(`/api/org/${orgId}/phone-numbers/${num.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to remove number."); return; }
      await fetchNumbers();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white border border-stone-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-stone-400" />
          <span className="text-sm font-bold text-stone-800">Phone Numbers</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 bg-stone-100 px-1.5 py-0.5">
            Multi-Number
          </span>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-bold transition-colors cursor-pointer"
        >
          {showAddForm ? <ChevronUp className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showAddForm ? "Cancel" : "Add Number"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 mb-3">{error}</div>
      )}

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="border border-stone-200 bg-stone-50 p-4 mb-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">New Phone Number</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Display Name *</label>
              <input
                type="text"
                required
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Support Line"
                className="w-full text-sm border border-stone-200 px-3 py-2 bg-white focus:outline-none focus:border-stone-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                placeholder="+919876543210"
                className="w-full text-sm border border-stone-200 px-3 py-2 bg-white focus:outline-none focus:border-stone-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Meta Phone Number ID *</label>
              <input
                type="text"
                required
                value={form.phoneNumberId}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumberId: e.target.value }))}
                placeholder="123456789012345"
                className="w-full text-sm border border-stone-200 px-3 py-2 bg-white focus:outline-none focus:border-stone-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">WABA ID</label>
              <input
                type="text"
                value={form.whatsappBusinessAccountId}
                onChange={(e) => setForm((f) => ({ ...f, whatsappBusinessAccountId: e.target.value }))}
                placeholder="Optional"
                className="w-full text-sm border border-stone-200 px-3 py-2 bg-white focus:outline-none focus:border-stone-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Access Token (optional — leave blank to use platform default)</label>
            <input
              type="password"
              value={form.accessToken}
              onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
              placeholder="EAAxxxxxxxx..."
              className="w-full text-sm border border-stone-200 px-3 py-2 bg-white focus:outline-none focus:border-stone-400"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy === "add"}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer"
            >
              {busy === "add" ? <Loader className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              {busy === "add" ? "Adding..." : "Add Number"}
            </button>
          </div>
        </form>
      )}

      {/* Numbers list */}
      {loading ? (
        <div className="flex items-center gap-2 py-4">
          <Loader className="w-4 h-4 animate-spin text-stone-400" />
          <span className="text-xs text-stone-400">Loading numbers...</span>
        </div>
      ) : numbers.length === 0 ? (
        <div className="py-6 text-center border border-dashed border-stone-200">
          <Phone className="w-6 h-6 text-stone-300 mx-auto mb-2" />
          <p className="text-xs text-stone-400">No phone numbers registered yet.</p>
          <p className="text-[10px] text-stone-400 mt-1">Numbers added via Embedded Signup appear here automatically.</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {numbers.map((num) => (
            <div key={num.id} className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-stone-800">{num.displayName}</span>
                  {num.isDefault && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-1.5 py-0.5">
                      <Star className="w-2.5 h-2.5" />
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 font-mono mt-0.5">{num.phoneNumber}</p>
                <p className="text-[10px] text-stone-400">ID: {num.phoneNumberId}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!num.isDefault && (
                  <button
                    onClick={() => handleSetDefault(num.id)}
                    disabled={busy === num.id}
                    title="Set as default"
                    className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {busy === num.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(num)}
                  disabled={busy === num.id || num.isDefault}
                  title={num.isDefault ? "Cannot delete default number" : "Remove"}
                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
