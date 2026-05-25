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
  X
} from "lucide-react";
import { useApp } from "../context/AppContext";

export const TemplatesTab: React.FC = () => {
  const { templates, addSystemLog } = useApp();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

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
        return <span className="bg-pink-500/10 text-pink-600 border border-pink-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">Marketing</span>;
      case "Utility":
        return <span className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">Utility</span>;
      default:
        return <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">Authentication</span>;
    }
  };

  // Poll pending templates every 15s for status changes
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
              addSystemLog("crm", `Template "${t.name}" ${data.metaStatus === "approved" ? "approved" : "rejected"} by Meta`);
            }
          }
        } catch { }
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [templates, addSystemLog]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Check className="w-3 h-3" />
            Meta Approved
          </span>
        );
      case "rejected":
        return (
          <span className="bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
            Rejected by Meta
          </span>
        );
      default:
        return (
          <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
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
      <span className="text-[10px] bg-orange-50 text-stone-500 border border-orange-100 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
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
            className="bg-orange-500/10 dark:bg-orange-500/25 text-orange-600 font-mono font-bold px-1 rounded"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meta Approved Templates</h2>
          <p className="text-zinc-500 text-sm mt-1">Manage WhatsApp-compliant template layouts, media variables, and quick action headers.</p>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-orange-100 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {["all", "Marketing", "Utility", "Authentication"].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
              }}
              className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all ${activeCategory === cat
                  ? "bg-orange-600 text-white"
                  : "text-stone-500 hover:bg-orange-50"
                }`}
            >
              {cat === "all" ? "All Templates" : cat}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search templates by name or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-8 pr-8 py-2 rounded-xl border border-orange-100 bg-white/70 backdrop-blur-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-sm"
          />
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Templates Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((t) => (
          <div
            key={t.id}
            className="glass-panel rounded-2xl flex flex-col justify-between shadow-sm border border-orange-100/80 hover:-translate-y-1 hover:shadow-md transition-all duration-300 overflow-hidden bg-white"
          >
            {/* Template Card Content */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] text-stone-500 font-mono font-bold select-none">{t.id}</span>
                {getCategoryBadge(t.category)}
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sm text-stone-900 truncate leading-none">{t.name}</h4>
                <div className="flex items-center gap-2 pt-1 select-none">
                  {getMediaIcon(t.mediaType)}
                  {getStatusBadge(t.metaStatus)}
                </div>
              </div>

              {/* Message body box with highlights */}
              <div className="bg-orange-50/40 border border-orange-100 p-4 rounded-xl text-xs leading-relaxed text-stone-700 max-h-40 overflow-y-auto custom-scrollbar select-text whitespace-pre-wrap">
                {formatBodyWithHighlights(t.body)}
              </div>
            </div>

            {/* Quick reply buttons footer */}
            {t.buttons && t.buttons.length > 0 ? (
              <div className="bg-orange-50/50 border-t border-orange-100/60 p-3.5 space-y-2 select-none shrink-0">
                <div className="text-[9px] uppercase tracking-wider font-bold text-stone-500 flex items-center gap-1">
                  <MousePointerClick className="w-3 h-3 text-stone-500" />
                  Interactive Buttons
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {t.buttons.map((btn, bIdx) => (
                    <span
                      key={bIdx}
                      className="text-[10px] font-bold border border-orange-100 bg-white px-2.5 py-1 text-orange-600 rounded-lg flex items-center gap-1 shadow-sm leading-none"
                    >
                      {btn}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-orange-50/20 border-t border-orange-100/60 py-3.5 px-6 shrink-0">
                <span className="text-[10px] italic text-stone-500">No CTA buttons defined.</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
