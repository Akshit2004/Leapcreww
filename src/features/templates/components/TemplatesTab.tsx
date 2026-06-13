"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Check,
  Loader,
  Image,
  Video,
  MousePointerClick,
  X,
  Plus,
  ArrowRight,
  Trash2,
  Globe,
  GlobeOff,
  RefreshCw,
} from "lucide-react";
import { useApp } from "@/shared/context/AppContext";
import { useParams } from "next/navigation";
import { useConfirm } from "@/shared/components/ui/ConfirmDialog";
import { CreateTemplateModal } from "./CreateTemplateModal";

export const TemplatesTab: React.FC = () => {
  const { templates, deleteTemplate, addSystemLog, refreshWorkspace } = useApp();
  const confirm = useConfirm();

  const params = useParams();
  const orgId = params.orgId as string;

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Quick Action FAB
  useEffect(() => {
    const handler = () => setIsModalOpen(true);
    window.addEventListener("leapcreww:quickaction", handler);
    return () => window.removeEventListener("leapcreww:quickaction", handler);
  }, []);

  // Sync templates from Meta into the local database
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncTemplates = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/org/${orgId}/templates/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        addSystemLog("crm", `Template sync failed: ${data.error || "Unknown error"}`);
      } else {
        addSystemLog("crm", `Synced ${data.count ?? 0} template(s) from Meta.`);
        await refreshWorkspace(orgId);
      }
    } catch (err) {
      addSystemLog("crm", `Template sync failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = activeCategory === "all" || t.category === activeCategory;
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "Marketing":
        return <span className="bg-stone-100 text-stone-900 border border-stone-300 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-none">Marketing</span>;
      case "Utility":
        return <span className="bg-stone-100 text-stone-800 border border-stone-300 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-none">Utility</span>;
      default:
        return <span className="bg-stone-950 text-white border border-stone-950 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-none">Authentication</span>;
    }
  };

  // Poll pending templates every 5s for status changes in sandbox
  useEffect(() => {
    const pending = templates.filter((t) => t.metaStatus === "pending" && t.metaId);
    if (pending.length === 0) return;

    const interval = setInterval(async () => {
      for (const t of pending) {
        try {
          const res = await fetch(`/api/whatsapp/check-template-status?templateId=${t.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.metaStatus !== "pending") {
              addSystemLog("crm", `Template "${t.name}" status updated to: ${data.metaStatus}`);
              refreshWorkspace(orgId);
            }
          }
        } catch { }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [templates, addSystemLog, refreshWorkspace, orgId]);

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return (
          <span className="bg-stone-900 text-white border border-stone-950 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-none flex items-center gap-1">
            <Check className="w-3 h-3" />
            Meta Approved
          </span>
        );
      case "rejected":
        return (
          <span className="bg-stone-100 text-stone-500 border border-stone-300 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-none">
            Rejected by Meta
          </span>
        );
      default:
        return (
          <span className="bg-stone-50 text-stone-600 border border-stone-200 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-none flex items-center gap-1">
            <Loader className="w-3 h-3 animate-spin" />
            Pending Meta Approval
          </span>
        );
    }
  };

  const getMediaIcon = (mediaType?: string) => {
    if (!mediaType || mediaType === "none") return null;
    let Icon = FileText;
    if (mediaType === "image") Icon = Image;
    if (mediaType === "video") Icon = Video;
    return (
      <span className="text-[10px] bg-stone-50 text-stone-500 border border-stone-200 px-2 py-0.5 rounded-none font-semibold flex items-center gap-1 uppercase">
        <Icon className="w-3 h-3 text-stone-500" />
        {mediaType}
      </span>
    );
  };

  // Highlights variables e.g. {{1}}
  const formatBodyWithHighlights = (body: string) => {
    const parts = body.split(/(\{\{\d\}\})/g);
    return parts.map((part, idx) => {
      if (/^\{\{\d\}\}$/.test(part)) {
        return (
          <span
            key={idx}
            className="bg-stone-100 text-stone-900 border border-stone-300 font-bold px-1 rounded-none"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={`flex-1 p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up bg-[#fafaf9] ${
      isModalOpen ? "overflow-hidden" : "overflow-y-auto"
    }`}>

      {/* Tab Header */}
      <div className="flex max-sm:flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900 uppercase">Meta Approved Templates</h2>
          <p className="text-stone-500 text-xs mt-1">Manage WhatsApp-compliant template layouts, media variables, and quick action headers.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncTemplates}
            disabled={isSyncing}
            className="bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs px-4 py-2.5 rounded-none flex items-center gap-2 cursor-pointer border border-stone-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "SYNCING..." : "SYNC FROM META"}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-stone-950 hover:bg-stone-900 text-white font-bold text-xs px-4 py-2.5 rounded-none flex items-center gap-2 cursor-pointer border border-stone-950 transition-all"
          >
            <Plus className="w-4 h-4" />
            CREATE TEMPLATE
          </button>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="flex max-md:flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {["all", "Marketing", "Utility", "Authentication"].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
              }}
              className={`text-xs font-semibold px-4 py-1.5 rounded-none border transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-stone-950 text-white border-stone-950"
                  : "text-stone-500 border-transparent hover:bg-stone-100"
              }`}
            >
              {cat === "all" ? "All Templates" : cat}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative max-md:w-full md:w-72">
          <input
            type="text"
            placeholder="Search templates by name or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-8 pr-8 py-2 rounded-none border border-stone-200 bg-white text-stone-700 placeholder-stone-400 focus:outline-none focus:border-stone-900 transition-all"
          />
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-900 focus:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Templates Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white border border-stone-200 space-y-4">
            <FileText className="w-10 h-10 text-stone-300 mx-auto" />
            {templates.length === 0 ? (
              <>
                <div>
                  <h4 className="font-black text-stone-900 uppercase text-xs mb-1">No templates yet</h4>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">Templates are required to send campaigns. Create a Meta-approved template to get started.</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-stone-950 text-white text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Create First Template
                </button>
              </>
            ) : (
              <p className="text-xs text-stone-500">No templates match your search or filter.</p>
            )}
          </div>
        )}
        {filteredTemplates.map((t) => (
          <div
            key={t.id}
            className="rounded-none flex flex-col justify-between border border-stone-200 transition-all duration-300 overflow-hidden bg-white"
          >
            {/* Template Card Content */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] text-stone-400 font-bold select-none">{t.id.slice(0, 13)}</span>
                <div className="flex items-center gap-2">
                  {getCategoryBadge(t.category)}
                  {t.isShared && (
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase text-stone-400 border border-stone-200 px-1.5 py-0.5" title="Shared with all orgs">
                      <Globe className="w-3 h-3" />
                      Shared
                    </span>
                  )}
                  {t.organizationId === orgId && (
                    <button
                      onClick={async () => {
                        await fetch("/api/whatsapp/toggle-share", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ templateId: t.id, isShared: !t.isShared }),
                        });
                        window.location.reload();
                      }}
                      className="p-1 rounded-none text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer border border-transparent"
                      title={t.isShared ? "Remove from shared" : "Share with all orgs"}
                    >
                      {t.isShared ? <GlobeOff className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (await confirm({
                        title: "Delete this template?",
                        description: "This permanently removes the template from LeapCreww and the Meta Business portal. This can't be undone.",
                        tone: "danger",
                        confirmLabel: "Delete template",
                      })) {
                        await deleteTemplate(t.id);
                      }
                    }}
                    className="p-1 rounded-none text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer border border-transparent"
                    title="Delete Template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sm text-stone-900 truncate leading-none">{t.name}</h4>
                <div className="flex items-center gap-2 pt-1 select-none">
                  {getMediaIcon(t.mediaType)}
                  {getStatusBadge(t.metaStatus)}
                </div>
              </div>

              {/* Message body box with highlights */}
              <div className="bg-stone-50 border border-stone-200 p-4 rounded-none text-xs leading-relaxed text-stone-700 max-h-40 overflow-y-auto custom-scrollbar select-text whitespace-pre-wrap">
                {formatBodyWithHighlights(t.body)}
              </div>
            </div>

            {/* Quick reply buttons footer */}
            {t.buttons && t.buttons.length > 0 ? (
              <div className="bg-stone-50 border-t border-stone-200 p-3.5 space-y-2 select-none shrink-0 rounded-none">
                <div className="text-[9px] uppercase tracking-wider font-bold text-stone-600 flex items-center gap-1">
                  <MousePointerClick className="w-3 h-3 text-stone-500" />
                  Interactive Buttons
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {t.buttons.map((btn, bIdx) => (
                    <span
                      key={bIdx}
                      className="text-[10px] font-bold border border-stone-300 bg-white px-2.5 py-1 text-stone-800 rounded-none flex items-center gap-1 leading-none animate-pulse-soft"
                    >
                      {btn}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-stone-50 border-t border-stone-200 py-3.5 px-6 shrink-0 flex justify-between items-center rounded-none">
                <span className="text-[10px] italic text-stone-500">No CTA buttons defined.</span>

                {/* One-Click Shortcut Campaign Trigger Link if Approved */}
                {t.metaStatus === "approved" && (
                  <div className="text-[10px] text-stone-900 font-bold flex items-center gap-1 select-none">
                    Ready to Broadcast
                    <ArrowRight className="w-3.5 h-3.5 text-stone-900" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Template Creator Modal Wizard */}
      <CreateTemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orgId={orgId}
      />

    </div>
  );
};
