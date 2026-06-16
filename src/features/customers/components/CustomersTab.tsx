import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "@/shared/context/AppContext";
import { useParams } from "next/navigation";
import { notify } from "@/shared/lib/toast";
import { useConfirm } from "@/shared/components/ui/ConfirmDialog";
import { CustomersTable } from "./CustomersTable";
import { BulkAddTagModal } from "./BulkAddTagModal";
import { AddCustomerModal } from "./AddCustomerModal";
import { WinBackModal } from "./WinBackModal";
import { CSVImporterModal } from "@/features/inbox/components/CSVImporterModal";
import { Users, Search, Tag, Filter, Plus, Trash2, X, AlertCircle, Flame, ChevronDown, Upload, RefreshCw, ShoppingBag, MessageCircle } from "lucide-react";
import { Contact } from "@/shared/context/types";
import { SegmentRule, SegmentRules, evaluateSegmentRules } from "@/shared/lib/segmentMatch";

export const CustomersTab: React.FC = () => {
  const { contacts, updateContact, addContact, setContacts } = useApp();
  const confirm = useConfirm();
  const params = useParams();
  const orgId = params.orgId as string;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [isBulkTagging, setIsBulkTagging] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isWinBackModalOpen, setIsWinBackModalOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const [isSyncingShopify, setIsSyncingShopify] = useState(false);
  const [isSyncingWhatsapp, setIsSyncingWhatsapp] = useState(false);

  // Quick Action FAB
  useEffect(() => {
    const handler = () => setIsAddCustomerModalOpen(true);
    window.addEventListener("leapcreww:quickaction", handler);
    return () => window.removeEventListener("leapcreww:quickaction", handler);
  }, []);

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

  const handleAddCustomer = async (customer: Omit<Contact, "id">) => {
    await addContact(customer);
  };

  const handleBulkAddTag = () => {
    setIsBulkAddModalOpen(true);
  };

  const confirmBulkAddTag = async (tag: string) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;

    const contactIds = Array.from(selectedIds);
    if (contactIds.length === 0) return;

    setIsBulkTagging(true);
    try {
      const res = await fetch(`/api/org/${orgId}/contacts/bulk-tag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: cleanTag, contactIds }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to add tag to contacts");
      }

      // Bulk request already persisted the tag for all contacts; reflect it
      // in local state without re-issuing a PATCH per contact.
      const idSet = new Set(contactIds);
      setContacts((prev) =>
        prev.map((c) => {
          if (!idSet.has(c.id)) return c;
          const currentTags = c.tags || [];
          if (currentTags.includes(cleanTag)) return c;
          return { ...c, tags: [...currentTags, cleanTag] };
        })
      );

      notify.success(`Added tag "${cleanTag}" to ${contactIds.length} customer${contactIds.length !== 1 ? "s" : ""}`);
      setSelectedIds(new Set()); // clear selection after action
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Failed to add tag to contacts");
    } finally {
      setIsBulkTagging(false);
    }
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

  const handleSyncShopify = async () => {
    setIsSyncingShopify(true);
    setIsImportDropdownOpen(false);
    try {
      const res = await fetch(`/api/org/${orgId}/integrations/shopify/sync-contacts`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      notify.success(`Shopify sync complete — ${data.synced} new contacts imported`);
    } catch (err: any) {
      notify.error("Shopify sync failed", err.message);
    } finally {
      setIsSyncingShopify(false);
    }
  };

  const handleSyncWhatsapp = async () => {
    setIsSyncingWhatsapp(true);
    setIsImportDropdownOpen(false);
    try {
      const res = await fetch(`/api/org/${orgId}/contacts/sync-whatsapp`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      notify.success(`WhatsApp sync complete — ${data.refreshed} contacts refreshed`);
    } catch (err: any) {
      notify.error("WhatsApp sync failed", err.message);
    } finally {
      setIsSyncingWhatsapp(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-stone-100 animate-slide-up">

      {/* ── Sticky header ── */}
      <div className="shrink-0 bg-white border-b border-stone-200 px-4 sm:px-8">
        <div className="flex items-center justify-between py-4 gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-tight text-stone-900">Customers & CRM</h2>
            <p className="text-stone-500 text-xs mt-0.5">Manage contacts, smart segments, and broadcast variables</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsWinBackModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 border border-[#D05E3C]/40 bg-[#D05E3C]/5 text-[#D05E3C] hover:bg-[#D05E3C] hover:text-white rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              <Flame className="w-3.5 h-3.5" />
              Win-Back
            </button>

            {/* Import / Sync dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsImportDropdownOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 border rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  isImportDropdownOpen
                    ? "border-wa-green text-wa-green bg-wa-green/5"
                    : "border-stone-200 bg-white text-stone-700 hover:border-wa-green hover:text-wa-green"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Import
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isImportDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isImportDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsImportDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 w-64 bg-white border border-stone-200 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">

                    {/* Header */}
                    <div className="px-4 pt-3.5 pb-2.5 border-b border-stone-100 bg-stone-50">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Import & Sync</p>
                    </div>

                    {/* CSV */}
                    <button
                      onClick={() => { setIsImportDropdownOpen(false); setIsCSVModalOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-stone-50 transition-colors cursor-pointer group border-b border-stone-100"
                    >
                      <div className="w-8 h-8 rounded-xl bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center shrink-0 transition-colors">
                        <Upload className="w-4 h-4 text-stone-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-800">Upload CSV File</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">name · phone · email columns</p>
                      </div>
                    </button>

                    {/* Shopify */}
                    <button
                      onClick={handleSyncShopify}
                      disabled={isSyncingShopify}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-stone-50 transition-colors cursor-pointer group border-b border-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#96BF48]/10 group-hover:bg-[#96BF48]/20 flex items-center justify-center shrink-0 transition-colors">
                        {isSyncingShopify
                          ? <RefreshCw className="w-4 h-4 text-[#96BF48] animate-spin" />
                          : <ShoppingBag className="w-4 h-4 text-[#96BF48]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-800">{isSyncingShopify ? "Syncing…" : "Shopify Customers"}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">Pulls from your connected store</p>
                      </div>
                    </button>

                    {/* WhatsApp */}
                    <button
                      onClick={handleSyncWhatsapp}
                      disabled={isSyncingWhatsapp}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-stone-50 transition-colors cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 rounded-xl bg-wa-green/10 group-hover:bg-wa-green/20 flex items-center justify-center shrink-0 transition-colors">
                        {isSyncingWhatsapp
                          ? <RefreshCw className="w-4 h-4 text-wa-green animate-spin" />
                          : <MessageCircle className="w-4 h-4 text-wa-green" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-800">{isSyncingWhatsapp ? "Syncing…" : "WhatsApp History"}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">From your conversation history</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setIsAddCustomerModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-wa-green hover:bg-wa-green-dark text-white rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-4 pb-3 border-t border-stone-100 pt-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-stone-900">{contacts.length}</span>
            <span className="text-[11px] text-stone-400 font-medium">total contacts</span>
          </div>
          <div className="w-px h-3 bg-stone-200 shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-stone-900">{contacts.filter(c => c.status === "Active").length}</span>
            <span className="text-[11px] text-stone-400 font-medium">active</span>
          </div>
          <div className="w-px h-3 bg-stone-200 shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-stone-900">{allTags.length}</span>
            <span className="text-[11px] text-stone-400 font-medium">tag{allTags.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="w-px h-3 bg-stone-200 shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-stone-900">{filteredContacts.length}</span>
            <span className="text-[11px] text-stone-400 font-medium">showing</span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex gap-5 px-4 sm:px-8 py-6 min-h-0 overflow-hidden">

        {/* Left Sidebar */}
        <div className="max-lg:hidden lg:flex flex-col w-56 shrink-0 gap-4 overflow-y-auto custom-scrollbar">

          {/* Smart Segments */}
          <div className="bg-white border border-stone-200 shadow-sm rounded-2xl overflow-hidden">
            {/* Green accent bar */}
            <div className="h-0.5 bg-gradient-to-r from-wa-green to-wa-green/30" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">Smart Segments</span>
                <button
                  onClick={() => setIsSegmentBuilderOpen(true)}
                  className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-wa-green/10 hover:text-wa-green flex items-center justify-center text-stone-400 transition-colors cursor-pointer"
                  title="Create Smart Segment"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => { setSelectedTag(null); setSelectedSegmentId(null); }}
                  className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                    selectedTag === null && selectedSegmentId === null
                      ? "bg-wa-green/10 text-wa-green"
                      : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                  }`}
                >
                  <span>All Customers</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${selectedTag === null && selectedSegmentId === null ? "bg-wa-green text-white" : "bg-stone-100 text-stone-500"}`}>
                    {contacts.length}
                  </span>
                </button>
                {loadingSegments ? (
                  <div className="text-center py-2 text-[10px] text-stone-400">Loading…</div>
                ) : segments.length === 0 ? (
                  <div className="py-2 text-[10px] text-stone-400 italic px-3">No segments yet.</div>
                ) : (
                  segments.map((seg) => {
                    const isSegSelected = selectedSegmentId === seg.id;
                    const matchingCount = contacts.filter((c) => evaluateSegmentRules(c as any, seg.rules as SegmentRules)).length;
                    return (
                      <div key={seg.id} className="group flex items-center rounded-lg hover:bg-stone-50 relative">
                        <button
                          onClick={() => { setSelectedTag(null); setSelectedSegmentId(seg.id); }}
                          className={`flex-1 text-left px-3 py-2 text-xs font-bold rounded-lg transition-all truncate pr-8 cursor-pointer ${
                            isSegSelected ? "bg-wa-green/10 text-wa-green" : "text-stone-500 hover:text-stone-800"
                          }`}
                        >
                          {seg.name}
                        </button>
                        <span className={`absolute right-7 text-[10px] px-1.5 py-0.5 rounded-full font-bold pointer-events-none group-hover:hidden ${isSegSelected ? "bg-wa-green text-white" : "bg-stone-100 text-stone-500"}`}>
                          {matchingCount}
                        </span>
                        <button
                          onClick={() => handleDeleteSegment(seg.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-500 rounded-lg transition-all cursor-pointer shrink-0"
                          title="Delete Segment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Tag Folders */}
          <div className="bg-white border border-stone-200 shadow-sm rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="h-0.5 bg-gradient-to-r from-amber-400 to-amber-400/30" />
            <div className="p-4 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">Tag Folders</span>
                <Tag className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5">
                {allTags.length === 0 ? (
                  <p className="text-[10px] text-stone-400 italic px-1">No tags yet.</p>
                ) : (
                  allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => { setSelectedSegmentId(null); setSelectedTag(tag); }}
                      className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                        selectedTag === tag
                          ? "bg-wa-green/10 text-wa-green"
                          : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                      }`}
                    >
                      <span className="truncate">{tag}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${selectedTag === tag ? "bg-wa-green text-white" : "bg-stone-100 text-stone-500"}`}>
                        {contacts.filter((c) => c.tags?.includes(tag)).length}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden gap-4">

          {/* Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, phone or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-wa-green transition-colors shadow-sm"
              />
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 animate-slide-up">
                <span className="inline-flex items-center px-2.5 py-1.5 rounded-full bg-stone-900 text-white text-[10px] font-bold whitespace-nowrap">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={handleBulkAddTag}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 border border-stone-200 bg-white text-stone-700 hover:border-wa-green hover:text-wa-green rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  <Tag className="w-3.5 h-3.5" />
                  Tag
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="flex-1 overflow-hidden min-h-0 bg-white border border-stone-300 shadow-sm rounded-2xl">
            <CustomersTable
              contacts={filteredContacts}
              totalContacts={contacts.length}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onUpdateTags={handleUpdateTags}
              onUpdateName={handleUpdateName}
            />
          </div>
        </div>
      </div>

      <CSVImporterModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        orgId={orgId}
        onSuccess={(count) => {
          notify.success(`Imported ${count} contacts`);
          setIsCSVModalOpen(false);
        }}
      />

      <BulkAddTagModal
        isOpen={isBulkAddModalOpen}
        onClose={() => setIsBulkAddModalOpen(false)}
        onConfirm={confirmBulkAddTag}
        selectedCount={selectedIds.size}
        isSubmitting={isBulkTagging}
      />

      <WinBackModal
        isOpen={isWinBackModalOpen}
        onClose={() => setIsWinBackModalOpen(false)}
        orgId={orgId}
        contacts={contacts}
      />

      <AddCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onConfirm={handleAddCustomer}
      />

      {/* Smart Segment Builder Modal */}
      {isSegmentBuilderOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-2xl bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[88vh] animate-slide-up">

            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-stone-100 flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-base font-black text-stone-900">Create Smart Segment</h3>
                <p className="text-xs text-stone-500 mt-0.5">Build a reusable filter to target specific contacts</p>
              </div>
              <button
                onClick={() => setIsSegmentBuilderOpen(false)}
                className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSegment} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">

              {/* Segment Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Segment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Active Shopify Leads"
                  value={newSegmentName}
                  onChange={(e) => setNewSegmentName(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-wa-green transition-colors"
                />
              </div>

              {/* Match logic toggle */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Filter Logic</label>
                <div className="flex gap-1.5 bg-stone-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setRulesLogic("all")}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      rulesLogic === "all" ? "bg-white text-wa-green shadow-sm" : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    Match All (AND)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRulesLogic("any")}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      rulesLogic === "any" ? "bg-white text-wa-green shadow-sm" : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    Match Any (OR)
                  </button>
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Conditions</label>
                  <button
                    type="button"
                    onClick={handleAddRuleRow}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-700 border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-stone-300 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add Filter
                  </button>
                </div>

                {newRules.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-stone-200 rounded-xl text-xs text-stone-400">
                    No conditions added — segment will match all contacts.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {newRules.map((rule, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-stone-50 border border-stone-200 p-3 rounded-xl">
                        {/* Field */}
                        <div className="relative flex-1 min-w-[100px]">
                          <select
                            value={rule.field}
                            onChange={(e) => handleUpdateRule(idx, { field: e.target.value as any })}
                            className="appearance-none w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-stone-800 focus:outline-none focus:border-wa-green pr-6 cursor-pointer"
                          >
                            <option value="tags">Tags</option>
                            <option value="status">Status</option>
                            <option value="source">Source</option>
                            <option value="attribute">Custom Attribute</option>
                            <option value="lastActive">Last Active</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {/* Attribute Key */}
                        {rule.field === "attribute" && (
                          <div className="flex-1 min-w-[80px]">
                            <input
                              type="text"
                              required
                              placeholder="Key (e.g. city)"
                              value={rule.key || ""}
                              onChange={(e) => handleUpdateRule(idx, { key: e.target.value })}
                              className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-[11px] text-stone-800 focus:outline-none focus:border-wa-green placeholder:text-stone-400"
                            />
                          </div>
                        )}

                        {/* Operator */}
                        <div className="relative flex-1 min-w-[100px]">
                          <select
                            value={rule.op}
                            onChange={(e) => handleUpdateRule(idx, { op: e.target.value as any })}
                            className="appearance-none w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-[11px] text-stone-800 focus:outline-none focus:border-wa-green pr-6 cursor-pointer"
                          >
                            {rule.field === "tags" && (<><option value="in">Contains Any Of</option><option value="neq">Excludes Any Of</option></>)}
                            {rule.field === "status" && (<><option value="eq">Equals</option><option value="neq">Not Equals</option></>)}
                            {rule.field === "source" && (<><option value="eq">Is Exactly</option><option value="contains">Contains Word</option></>)}
                            {rule.field === "attribute" && (<option value="eq">Equals</option>)}
                            {rule.field === "lastActive" && (<option value="active_within_days">Active Within Days</option>)}
                          </select>
                          <ChevronDown className="w-3 h-3 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {/* Value */}
                        <div className="relative flex-1 min-w-[110px]">
                          {rule.field === "status" ? (
                            <>
                              <select
                                value={rule.value}
                                onChange={(e) => handleUpdateRule(idx, { value: e.target.value })}
                                className="appearance-none w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-stone-800 focus:outline-none focus:border-wa-green pr-6 cursor-pointer"
                              >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                              </select>
                              <ChevronDown className="w-3 h-3 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </>
                          ) : rule.field === "lastActive" ? (
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="e.g. 7"
                              value={rule.value}
                              onChange={(e) => handleUpdateRule(idx, { value: parseInt(e.target.value) || "" })}
                              className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-stone-800 focus:outline-none focus:border-wa-green"
                            />
                          ) : (
                            <input
                              type="text"
                              required
                              placeholder="Value…"
                              value={rule.value || ""}
                              onChange={(e) => handleUpdateRule(idx, { value: e.target.value })}
                              className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-[11px] text-stone-800 focus:outline-none focus:border-wa-green placeholder:text-stone-400"
                            />
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveRuleRow(idx)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audience Preview */}
              <div className="bg-gradient-to-r from-wa-green/5 to-transparent border border-wa-green/20 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-wa-green/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-wa-green" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Live Preview</span>
                    <span className="text-xs text-stone-500">Contacts matching these rules</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-black font-mono ${previewCountNum > 0 ? "text-wa-green" : "text-stone-300"}`}>
                    {previewCountNum}
                  </span>
                  <span className="text-[10px] text-stone-400 block font-bold uppercase">matches</span>
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="border-t border-stone-100 px-6 py-4 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsSegmentBuilderOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSaveSegment}
                disabled={isSavingSegment || !newSegmentName.trim()}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 bg-wa-green hover:bg-wa-green-dark text-white rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
