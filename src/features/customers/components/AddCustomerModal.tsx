import React, { useState } from "react";
import { UserPlus, X, ChevronDown } from "lucide-react";
import { Contact } from "@/shared/context/types";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customer: Omit<Contact, "id">) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setName("");
      setPhone("");
      setEmail("");
      setTags("");
      setStatus("Active");
    }
  }

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    onConfirm({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      source: "Manual",
      status: status,
      tags: tags.split(",").map(t => t.trim()).filter(t => t.length > 0),
    });
    onClose();
  };

  const inputCls = "w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-wa-green transition-colors";
  const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between shrink-0">
          <div>
            <h3 className="text-base font-black text-stone-900">Add New Customer</h3>
            <p className="text-xs text-stone-500 mt-0.5">Create a contact manually in your CRM</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">

            <div>
              <label className={labelCls}>Full Name *</label>
              <input
                autoFocus
                required
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Phone Number *</label>
              <input
                required
                type="tel"
                placeholder="e.g. +1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Email Address</label>
              <input
                type="email"
                placeholder="e.g. john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Tags (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. VIP, Leads, Newsletter"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Status</label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "Active" | "Inactive")}
                  className={`${inputCls} appearance-none pr-10 cursor-pointer`}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="border-t border-stone-100 px-6 py-4 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !phone.trim()}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 bg-wa-green hover:bg-wa-green-dark text-white rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Save Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
