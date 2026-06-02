import React, { useState } from "react";
import { UserPlus, X } from "lucide-react";
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm animate-fade-in transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up sm:scale-100 flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2 tracking-tight">
            <UserPlus className="w-5 h-5 text-wa-green" />
            Add New Customer
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 hover:bg-stone-100 p-1.5 rounded-full transition-colors focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1.5">Full Name *</label>
              <input
                autoFocus
                required
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-wa-green/20 focus:border-wa-green transition-all shadow-sm placeholder:text-stone-400 font-medium"
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1.5">Phone Number *</label>
              <input
                required
                type="tel"
                placeholder="e.g. +1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-wa-green/20 focus:border-wa-green transition-all shadow-sm placeholder:text-stone-400 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="e.g. john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-wa-green/20 focus:border-wa-green transition-all shadow-sm placeholder:text-stone-400 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1.5">Tags (Comma separated)</label>
              <input
                type="text"
                placeholder="e.g. VIP, Leads, Newsletter"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-wa-green/20 focus:border-wa-green transition-all shadow-sm placeholder:text-stone-400 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "Active" | "Inactive")}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-wa-green/20 focus:border-wa-green transition-all shadow-sm font-medium"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-100 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !phone.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-wa-green hover:bg-wa-green-dark shadow-md shadow-wa-green/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-wa-green/50"
            >
              Save Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
