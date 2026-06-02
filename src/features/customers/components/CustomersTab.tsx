import React, { useState, useMemo } from "react";
import { useApp } from "@/shared/context/AppContext";
import { CustomersTable } from "./CustomersTable";
import { TagBadge } from "./TagBadge";
import { BulkAddTagModal } from "./BulkAddTagModal";
import { AddCustomerModal } from "./AddCustomerModal";
import { Users, Search, Tag, Filter, Plus, Trash2 } from "lucide-react";
import { Contact } from "@/shared/context/types";

export const CustomersTab: React.FC = () => {
  const { contacts, updateContact, addContact } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach((c) => {
      if (c.tags) {
        c.tags.forEach((t) => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, [contacts]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSegment = selectedSegment ? c.tags?.includes(selectedSegment) : true;

      return matchesSearch && matchesSegment;
    });
  }, [contacts, searchQuery, selectedSegment]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length && filteredContacts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const handleUpdateTags = (id: string, newTags: string[]) => {
    updateContact(id, { tags: newTags });
  };

  const handleAddCustomer = (customer: Omit<Contact, "id">) => {
    addContact(customer);
  };

  const handleBulkAddTag = () => {
    setIsBulkAddModalOpen(true);
  };

  const confirmBulkAddTag = (tag: string) => {
    const cleanTag = tag.trim();
    
    selectedIds.forEach((id) => {
      const contact = contacts.find((c) => c.id === id);
      if (contact) {
        const currentTags = contact.tags || [];
        if (!currentTags.includes(cleanTag)) {
          updateContact(id, { tags: [...currentTags, cleanTag] });
        }
      }
    });
    setSelectedIds(new Set()); // clear selection after action
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f4f6f5] relative animate-fade-in p-4 lg:p-8">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-stone-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-wa-green" />
            Customers
          </h2>
          <p className="text-stone-500 text-sm mt-1 font-medium">
            Manage your contacts, apply tags, and segment your audience.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
          <button 
            onClick={() => setIsAddCustomerModalOpen(true)}
            className="flex items-center gap-2 bg-wa-green hover:bg-wa-green-dark text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-wa-green/20"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </header>

      {/* Mobile Segments (Horizontal Scroll) */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto custom-scrollbar pb-3 mb-3">
        <button
          onClick={() => setSelectedSegment(null)}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            selectedSegment === null
              ? "bg-stone-950 text-white border-stone-950"
              : "bg-white text-stone-600 border-stone-200"
          }`}
        >
          All ({contacts.length})
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedSegment(tag)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              selectedSegment === tag
                ? "bg-wa-green border-wa-green text-white"
                : "bg-white text-stone-600 border-stone-200"
            }`}
          >
            {tag} ({contacts.filter((c) => c.tags?.includes(tag)).length})
          </button>
        ))}
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Sidebar - Segments */}
        <div className="hidden lg:flex flex-col w-64 shrink-0 gap-4">
          <div className="bg-white border border-stone-200/60 rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] font-black uppercase text-stone-400 tracking-wider mb-3 px-2">Segments</div>
            <button
              onClick={() => setSelectedSegment(null)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                selectedSegment === null
                  ? "bg-stone-100 text-stone-900"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              All Customers
              <span className="float-right text-xs bg-stone-200/50 text-stone-500 px-1.5 py-0.5 rounded-md font-bold">
                {contacts.length}
              </span>
            </button>
          </div>

          <div className="bg-white border border-stone-200/60 rounded-2xl p-4 shadow-sm flex-1 overflow-y-auto custom-scrollbar">
            <div className="text-[10px] font-black uppercase text-stone-400 tracking-wider mb-3 px-2 flex items-center justify-between">
              Smart Folders
              <Tag className="w-3.5 h-3.5" />
            </div>
            {allTags.length === 0 ? (
              <div className="text-xs text-stone-400 italic px-2">No tags created yet.</div>
            ) : (
              <div className="space-y-1">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedSegment(tag)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${
                      selectedSegment === tag
                        ? "bg-wa-green/10 text-wa-green-dark"
                        : "text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <span className="truncate">{tag}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${
                        selectedSegment === tag ? "bg-wa-green/20 text-wa-green-dark" : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {contacts.filter((c) => c.tags?.includes(tag)).length}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search customers by name, phone or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/20 focus:border-wa-green transition-all shadow-sm"
              />
            </div>
            
            {/* Bulk Actions Bar */}
            <div
              className={`flex items-center gap-2 transition-all duration-300 origin-right ${
                selectedIds.size > 0 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              <span className="text-xs font-bold text-stone-500 mr-2">
                {selectedIds.size} selected
              </span>
              <button
                onClick={handleBulkAddTag}
                className="flex items-center gap-1.5 bg-white border border-stone-200 text-stone-700 hover:text-wa-green hover:border-wa-green px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Tag className="w-3.5 h-3.5" />
                Add Tag
              </button>
              <button
                onClick={() => {}}
                className="flex items-center gap-1.5 bg-white border border-stone-200 text-red-600 hover:bg-red-50 hover:border-red-200 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>

          {/* Table */}
          <CustomersTable
            contacts={filteredContacts}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onUpdateTags={handleUpdateTags}
          />
        </div>
      </div>

      <BulkAddTagModal
        isOpen={isBulkAddModalOpen}
        onClose={() => setIsBulkAddModalOpen(false)}
        onConfirm={confirmBulkAddTag}
        selectedCount={selectedIds.size}
      />

      <AddCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onConfirm={handleAddCustomer}
      />
    </div>
  );
};
