import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "@/shared/context/AppContext";
import { useParams } from "next/navigation";
import { notify } from "@/shared/lib/toast";
import { useConfirm } from "@/shared/components/ui/ConfirmDialog";
import { CustomersTable } from "./CustomersTable";
import { BulkAddTagModal } from "./BulkAddTagModal";
import { AddCustomerModal } from "./AddCustomerModal";
import { Users, Search, Tag, Filter, Plus, Trash2, X, AlertCircle } from "lucide-react";
import { Contact } from "@/shared/context/types";
import { SegmentRule, SegmentRules, evaluateSegmentRules } from "@/shared/lib/segmentMatch";

export const CustomersTab: React.FC = () => {
  const { contacts, updateContact, addContact } = useApp();
  const confirm = useConfirm();
  const params = useParams();
  const orgId = params.orgId as string;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);

  // Saved Segments states
  const [segments, setSegments] = useState<any[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);

  // Segment Builder states
  const [isSegmentBuilderOpen, setIsSegmentBuilderOpen] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState("");
  const [rulesLogic, setRulesLogic] = useState<"all" | "any">("all");
  const [newRules, setNewRules] = useState<SegmentRule[]>([
    { field: "tags", op: "in", value: "" },
  ]);
  const [isSavingSegment, setIsSavingSegment] = useState(false);

  // Load Saved Segments
  const fetchSegments = async () => {
    setLoadingSegments(true);
    try {
      const res = await fetch(`/api/org/${orgId}/segments`);
      if (res.ok) {
        const data = await res.json();
        setSegments(data.segments || []);
      }
    } catch (err) {
      console.error("Failed to load segments:", err);
    } finally {
      setLoadingSegments(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      fetchSegments();
    }
  }, [orgId]);

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

  // Filter contacts based on search, tags, and dynamic segment rules
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag = selectedTag ? c.tags?.includes(selectedTag) : true;

      let matchesSmartSegment = true;
      if (selectedSegmentId) {
        const seg = segments.find((s) => s.id === selectedSegmentId);
        if (seg) {
          matchesSmartSegment = evaluateSegmentRules(c as any, seg.rules as SegmentRules);
        }
      }

      return matchesSearch && matchesTag && matchesSmartSegment;
    });
  }, [contacts, searchQuery, selectedTag, selectedSegmentId, segments]);

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

  const handleUpdateName = (id: string, newName: string) => {
    updateContact(id, { name: newName });
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

  const handleDeleteSegment = async (id: string) => {
    const ok = await confirm({
      title: "Delete this segment?",
      description: "This permanently removes the segment. Your contacts won't be affected.",
      tone: "danger",
      confirmLabel: "Delete segment",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/org/${orgId}/segments/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSegments((prev) => prev.filter((s) => s.id !== id));
        if (selectedSegmentId === id) {
          setSelectedSegmentId(null);
        }
        notify.success("Segment deleted");
      } else {
        notify.error("Couldn't delete segment", "Please try again in a moment.");
      }
    } catch (err) {
      console.error(err);
      notify.error("Couldn't delete segment", "Check your connection and try again.");
    }
  };

  const handleAddRuleRow = () => {
    setNewRules((prev) => [...prev, { field: "tags", op: "in", value: "" }]);
  };

  const handleRemoveRuleRow = (index: number) => {
    setNewRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRule = (index: number, updates: Partial<SegmentRule>) => {
    setNewRules((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const next = { ...r, ...updates } as SegmentRule;
        
        // Reset operator and key/value if field type changes
        if (updates.field) {
          if (updates.field === "tags") {
            next.op = "in";
            next.value = "";
            delete next.key;
          } else if (updates.field === "status") {
            next.op = "eq";
            next.value = "Active";
            delete next.key;
          } else if (updates.field === "source") {
            next.op = "eq";
            next.value = "";
            delete next.key;
          } else if (updates.field === "attribute") {
            next.op = "eq";
            next.key = "";
            next.value = "";
          } else if (updates.field === "lastActive") {
            next.op = "active_within_days";
            next.value = 7;
            delete next.key;
          }
        }
        return next;
      })
    );
  };

  const handleSaveSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSegmentName.trim() || newRules.length === 0 || !orgId) return;

    setIsSavingSegment(true);
    try {
      const rulesPayload: SegmentRules = {
        all: rulesLogic === "all" ? newRules : [],
        any: rulesLogic === "any" ? newRules : [],
      };

      const res = await fetch(`/api/org/${orgId}/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSegmentName.trim(),
          rules: rulesPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSegments((prev) => [data.segment, ...prev]);
        setSelectedSegmentId(data.segment.id);
        setSelectedTag(null); // Clear tag selection when segment active
        
        // Reset states
        setNewSegmentName("");
        setNewRules([{ field: "tags", op: "in", value: "" }]);
        setRulesLogic("all");
        setIsSegmentBuilderOpen(false);
        notify.success("Segment created", "Your smart folder is ready to use.");
      } else {
        notify.error("Couldn't create segment", "Please check the rules and try again.");
      }
    } catch (err) {
      console.error(err);
      notify.error("Couldn't save segment", "Check your connection and try again.");
    } finally {
      setIsSavingSegment(false);
    }
  };

  // Compute live match preview count in builder
  const previewCountNum = useMemo(() => {
    const draftRules: SegmentRules = {
      all: rulesLogic === "all" ? newRules : [],
      any: rulesLogic === "any" ? newRules : [],
    };
    return contacts.filter((c) => evaluateSegmentRules(c as any, draftRules)).length;
  }, [contacts, rulesLogic, newRules]);

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-[#fafaf9] relative animate-fade-in p-4 lg:p-8 items-stretch justify-start text-left select-none">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 w-full text-left items-start md:items-center shrink-0 border-b border-stone-200 pb-6">
        <div className="flex flex-col items-start text-left">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-6 h-6 text-wa-green animate-pulse" />
            <h2 className="text-xl font-bold tracking-tight text-stone-900 uppercase">
              Customers & CRM
            </h2>
          </div>
          <p className="text-stone-500 text-xs font-medium text-left">
            Manage your contacts, apply custom segment queries, and broadcast variables.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end">
          <button 
            onClick={() => setIsAddCustomerModalOpen(true)}
            className="flex items-center gap-2 bg-stone-950 hover:bg-stone-900 border border-stone-950 text-white px-4 py-2 text-xs font-bold transition-all cursor-pointer rounded-none active:scale-95"
          >
            <Plus className="w-4 h-4" />
            ADD CUSTOMER
          </button>
        </div>
      </header>

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* Left Sidebar - Saved Segments + Tag smart folders */}
        <div className="max-lg:hidden lg:flex flex-col w-64 shrink-0 gap-4 overflow-y-auto pr-1">
          {/* Segments widget */}
          <div className="bg-white border border-stone-200 rounded-none p-4">
            <div className="text-[10px] font-black uppercase text-stone-400 tracking-wider mb-3 px-2 flex items-center justify-between">
              <span>Saved Segments</span>
              <button 
                onClick={() => setIsSegmentBuilderOpen(true)}
                className="text-stone-900 hover:bg-stone-100 p-0.5 rounded transition-all cursor-pointer border border-transparent"
                title="Create Smart Segment"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1">
              <button
                onClick={() => { setSelectedTag(null); setSelectedSegmentId(null); }}
                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-none transition-all flex items-center justify-between ${
                  selectedTag === null && selectedSegmentId === null
                    ? "bg-stone-100 text-stone-900 border-l-2 border-stone-900"
                    : "text-stone-500 hover:bg-stone-50"
                }`}
              >
                <span>All Customers</span>
                <span className="text-[10px] bg-stone-200/50 text-stone-600 px-1.5 py-0.5 rounded-none font-bold">
                  {contacts.length}
                </span>
              </button>

              {loadingSegments ? (
                <div className="text-center py-2 text-xs text-stone-400">Loading segments...</div>
              ) : segments.length === 0 ? (
                <div className="text-center py-2 text-[10px] text-stone-400 italic">No smart segments saved.</div>
              ) : (
                segments.map((seg) => {
                  const isSegSelected = selectedSegmentId === seg.id;
                  const matchingCount = contacts.filter((c) =>
                    evaluateSegmentRules(c as any, seg.rules as SegmentRules)
                  ).length;
                  return (
                    <div key={seg.id} className="group flex items-center justify-between rounded-none hover:bg-stone-50 relative">
                      <button
                        onClick={() => { setSelectedTag(null); setSelectedSegmentId(seg.id); }}
                        className={`flex-1 text-left px-3 py-2 text-xs font-bold rounded-none transition-all truncate pr-8 ${
                          isSegSelected
                            ? "bg-wa-green/10 text-wa-green border-l-2 border-wa-green font-bold"
                            : "text-stone-500 hover:bg-stone-50"
                        }`}
                      >
                        {seg.name}
                      </button>
                      <span className="absolute right-8 text-[10px] bg-stone-200/50 text-stone-600 px-1.5 py-0.5 rounded-none font-bold pointer-events-none group-hover:hidden">
                        {matchingCount}
                      </span>
                      <button
                        onClick={() => handleDeleteSegment(seg.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-none transition-all cursor-pointer mr-1 shrink-0 border border-transparent"
                        title="Delete Segment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Tags Smart Folders widget */}
          <div className="bg-white border border-stone-200 rounded-none p-4 flex-1 overflow-y-auto custom-scrollbar">
            <div className="text-[10px] font-black uppercase text-stone-400 tracking-wider mb-3 px-2 flex items-center justify-between">
              <span>Smart Folders</span>
              <Tag className="w-3.5 h-3.5 text-stone-400" />
            </div>
            {allTags.length === 0 ? (
              <div className="text-xs text-stone-400 italic px-2">No tags created yet.</div>
            ) : (
              <div className="space-y-1">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { setSelectedSegmentId(null); setSelectedTag(tag); }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold rounded-none transition-all flex items-center justify-between ${
                      selectedTag === tag
                        ? "bg-stone-100 text-stone-900 border-l-2 border-stone-900 font-bold"
                        : "text-stone-500 hover:bg-stone-50"
                    }`}
                  >
                    <span className="truncate">{tag}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-none font-bold ${
                        selectedTag === tag ? "bg-stone-200 text-stone-900" : "bg-stone-100 text-stone-500"
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
        <div className="flex-1 flex flex-col min-w-0 bg-transparent w-full text-left items-stretch overflow-hidden">
          {/* Toolbar */}
          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 items-start sm:items-center shrink-0">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search customers by name, phone or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-stone-200 pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-stone-900 transition-all text-left placeholder:text-stone-400 rounded-none h-9"
              />
            </div>
            
            {/* Bulk Actions Bar */}
            <div
              className={`flex items-center gap-2 transition-all duration-300 origin-right ${
                selectedIds.size > 0 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none w-0 overflow-hidden"
              }`}
            >
              <span className="text-[10px] font-bold text-stone-500 mr-2 shrink-0">
                {selectedIds.size} selected
              </span>
              <button
                onClick={handleBulkAddTag}
                className="flex items-center gap-1.5 bg-white border border-stone-200 hover:border-stone-400 text-stone-700 px-3 py-1.5 rounded-none text-[10px] font-bold transition-all shadow-none shrink-0 cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                Add Tag
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-hidden min-h-0 bg-white border border-stone-200">
            <CustomersTable
              contacts={filteredContacts}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onUpdateTags={handleUpdateTags}
              onUpdateName={handleUpdateName}
            />
          </div>
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

      {/* Smart Segment Builder Modal */}
      {isSegmentBuilderOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-stone-300 rounded-none shadow-xl flex flex-col max-h-[85vh] animate-slide-up">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 bg-stone-50 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-xs uppercase tracking-wider text-stone-900 flex items-center gap-2">
                <Filter className="w-4 h-4 text-stone-900" />
                Create Smart Segment
              </h3>
              <button 
                onClick={() => setIsSegmentBuilderOpen(false)}
                className="p-1 text-stone-500 hover:bg-stone-200 rounded-none border border-transparent transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSegment} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              {/* Segment Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600">Segment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Active Shopify Leads"
                  value={newSegmentName}
                  onChange={(e) => setNewSegmentName(e.target.value)}
                  className="w-full bg-white text-stone-900 border border-stone-200 rounded-none py-2 px-3 text-xs font-semibold focus:outline-none focus:border-stone-900 placeholder:text-stone-400"
                />
              </div>

              {/* Match logic logic toggle */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600">Filter Logic Combination</label>
                <div className="flex gap-2 bg-stone-50 p-1 border border-stone-200 rounded-none">
                  <button
                    type="button"
                    onClick={() => setRulesLogic("all")}
                    className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-none cursor-pointer transition-all ${
                      rulesLogic === "all" ? "bg-stone-950 text-white" : "text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    Match All Filters (AND)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRulesLogic("any")}
                    className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-none cursor-pointer transition-all ${
                      rulesLogic === "any" ? "bg-stone-950 text-white" : "text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    Match Any Filter (OR)
                  </button>
                </div>
              </div>

              {/* Rules List Builder */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 flex justify-between">
                  <span>Conditions</span>
                  <button
                    type="button"
                    onClick={handleAddRuleRow}
                    className="text-[9px] text-stone-900 bg-stone-100 border border-stone-300 hover:bg-stone-200 px-2 py-0.5 font-bold transition-all rounded-none cursor-pointer"
                  >
                    + ADD FILTER ROW
                  </button>
                </label>

                {newRules.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-stone-350 text-xs text-stone-400">
                    No matching filters added. Segment will match all contacts.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {newRules.map((rule, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-stone-50 border border-stone-200 p-3 rounded-none relative">
                        {/* Field Selection */}
                        <div className="flex-1 min-w-[100px]">
                          <select
                            value={rule.field}
                            onChange={(e) => handleUpdateRule(idx, { field: e.target.value as any })}
                            className="w-full bg-white text-stone-900 border border-stone-200 rounded-none p-1.5 text-[11px] font-bold focus:outline-none focus:border-stone-900"
                          >
                            <option value="tags">Tags</option>
                            <option value="status">Status</option>
                            <option value="source">Source</option>
                            <option value="attribute">Custom Attribute</option>
                            <option value="lastActive">Last Active</option>
                          </select>
                        </div>

                        {/* Attribute Key Input (Conditional) */}
                        {rule.field === "attribute" && (
                          <div className="flex-1 min-w-[80px]">
                            <input
                              type="text"
                              required
                              placeholder="Key (e.g. city)"
                              value={rule.key || ""}
                              onChange={(e) => handleUpdateRule(idx, { key: e.target.value })}
                              className="w-full bg-white text-stone-900 border border-stone-200 rounded-none p-1.5 text-[11px] focus:outline-none focus:border-stone-900 placeholder:text-stone-400 font-semibold"
                            />
                          </div>
                        )}

                        {/* Operator Dropdown */}
                        <div className="flex-1 min-w-[90px]">
                          <select
                            value={rule.op}
                            onChange={(e) => handleUpdateRule(idx, { op: e.target.value as any })}
                            className="w-full bg-white text-stone-900 border border-stone-200 rounded-none p-1.5 text-[11px] focus:outline-none focus:border-stone-900"
                          >
                            {rule.field === "tags" && (
                              <>
                                <option value="in">Contains Any Of</option>
                                <option value="neq">Excludes Any Of</option>
                              </>
                            )}
                            {rule.field === "status" && (
                              <>
                                <option value="eq">Equals</option>
                                <option value="neq">Not Equals</option>
                              </>
                            )}
                            {rule.field === "source" && (
                              <>
                                <option value="eq">Is Exactly</option>
                                <option value="contains">Contains Word</option>
                              </>
                            )}
                            {rule.field === "attribute" && (
                              <>
                                <option value="eq">Equals</option>
                              </>
                            )}
                            {rule.field === "lastActive" && (
                              <>
                                <option value="active_within_days">Active Within Days</option>
                              </>
                            )}
                          </select>
                        </div>

                        {/* Value Input */}
                        <div className="flex-1 min-w-[110px]">
                          {rule.field === "status" ? (
                            <select
                              value={rule.value}
                              onChange={(e) => handleUpdateRule(idx, { value: e.target.value })}
                              className="w-full bg-white text-stone-900 border border-stone-200 rounded-none p-1.5 text-[11px] focus:outline-none focus:border-stone-900 font-semibold"
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          ) : rule.field === "lastActive" ? (
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="e.g. 7"
                              value={rule.value}
                              onChange={(e) => handleUpdateRule(idx, { value: parseInt(e.target.value) || "" })}
                              className="w-full bg-white text-stone-900 border border-stone-200 rounded-none p-1.5 text-[11px] focus:outline-none focus:border-stone-900 font-semibold"
                            />
                          ) : (
                            <input
                              type="text"
                              required
                              placeholder="Value..."
                              value={rule.value || ""}
                              onChange={(e) => handleUpdateRule(idx, { value: e.target.value })}
                              className="w-full bg-white text-stone-900 border border-stone-200 rounded-none p-1.5 text-[11px] focus:outline-none focus:border-stone-900 placeholder:text-stone-400 font-semibold"
                            />
                          )}
                        </div>

                        {/* Delete Row button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveRuleRow(idx)}
                          className="text-stone-450 hover:text-stone-900 p-1 rounded-none hover:bg-stone-200 border border-transparent transition-colors cursor-pointer shrink-0"
                          title="Remove Rule"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic preview block */}
              <div className="bg-stone-50 border border-stone-250 p-4 rounded-none flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-stone-800" />
                  <div>
                    <span className="text-[10px] font-bold text-stone-600 block uppercase">Audience Size Preview</span>
                    <span className="text-xs font-semibold text-stone-500">Live audience calculation based on active CRM leads.</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-stone-900 font-mono">{previewCountNum}</span>
                  <span className="text-[10px] text-stone-400 block font-bold uppercase">Contacts Match</span>
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-5 border-t border-stone-200 bg-stone-50 flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsSegmentBuilderOpen(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold text-xs rounded-none cursor-pointer border border-stone-300 transition-all uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSaveSegment}
                disabled={isSavingSegment || !newSegmentName.trim()}
                className="px-4 py-2 bg-stone-950 hover:bg-stone-900 disabled:opacity-40 text-white font-bold text-xs rounded-none cursor-pointer flex items-center gap-1.5 transition-all border border-stone-950 uppercase"
              >
                Save Smart Segment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
