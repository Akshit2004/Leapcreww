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
  Sparkles,
  AlertCircle,
  ArrowRight,
  Trash2,
  CheckCircle,
  HelpCircle,
  ThumbsUp,
  Globe,
  GlobeOff
} from "lucide-react";
import { useApp } from "@/shared/context/AppContext";
import { useParams } from "next/navigation";
import { UploadButton } from "@/shared/lib/uploadthing";

export const TemplatesTab: React.FC = () => {
  const { templates, submitMetaTemplate, deleteTemplate, addSystemLog, refreshWorkspace } = useApp();
  
  const params = useParams();
  const orgId = params.orgId as string;

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Wizard Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [category, setCategory] = useState("Marketing");
  const [bodyText, setBodyText] = useState("");
  const [mediaType, setMediaType] = useState("none");
  const [mediaUrl, setMediaUrl] = useState("");

  // Lock body scroll when create template modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);
  
  // Buttons Builder
  const [buttonsList, setButtonsList] = useState<string[]>([]);
  const [newButtonText, setNewButtonText] = useState("");

  // AI Compliance Copilot state
  const [aiOptimizing, setAiOptimizing] = useState(false);
  const [complianceScore, setComplianceScore] = useState<number | null>(null);
  const [complianceFeedback, setComplianceFeedback] = useState<string[]>([]);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [categoryReasoning, setCategoryReasoning] = useState<string | null>(null);
  const [categoryApplied, setCategoryApplied] = useState(false);

  // Client-side quick validation rules
  const [clientWarnings, setClientWarnings] = useState<string[]>([]);

  // Brand-Aware AI generator (topic + URL → body copy)
  const [showGenerator, setShowGenerator] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genUrl, setGenUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = activeCategory === "all" || t.category === activeCategory;
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Real-time client-side compliance scanning
  useEffect(() => {
    const timer = setTimeout(() => {
      const warnings: string[] = [];
      if (!bodyText) {
        setClientWarnings([]);
        return;
      }

      // 1. Text Length check (Meta limit: 1024 characters for body)
      if (bodyText.length > 1024) {
        warnings.push("Body text length exceeds Meta limit of 1024 characters.");
      }

      // 2. Variable formatting checks
      const varRegex = /\{\{(\d+)\}\}/g;
      const matches = Array.from(bodyText.matchAll(varRegex)).map((m) => parseInt(m[1]));
      
      if (matches.length > 0) {
        // Check if variables are sequential starting at 1 e.g. {{1}}, {{2}}
        const sorted = [...matches].sort((a, b) => a - b);
        const isSequential = sorted.every((val, idx) => val === idx + 1);
        
        if (!isSequential) {
          warnings.push("Variables must start at {{1}} and be sequential (e.g. {{1}}, {{2}}, {{3}}).");
        }

        // Check for back-to-back variables like {{1}}{{2}}
        if (/\{\{\d\}\}\s*\{\{\d\}\}/.test(bodyText)) {
          warnings.push("Meta rejects back-to-back variables (e.g., '{{1}}{{2}}'). Add surrounding descriptive words.");
        }
      }

      // 3. Prohibited terms check for Utility category
      if (category === "Utility") {
        const promotionalTerms = ["discount", "offer", "sale", "coupon", "promo", "free", "buy"];
        const containsPromo = promotionalTerms.some(term => bodyText.toLowerCase().includes(term));
        if (containsPromo) {
          warnings.push("Utility templates cannot contain promotional language (e.g., 'discount', 'coupon', 'sale'). Submissions may be rejected.");
        }
      }

      setClientWarnings(warnings);
    }, 0);
    return () => clearTimeout(timer);
  }, [bodyText, category]);

  // AI Optimize Call
  const handleAIOptimize = async () => {
    if (!bodyText.trim()) return;
    setAiOptimizing(true);
    try {
      const res = await fetch("/api/whatsapp/optimize-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftText: bodyText, category })
      });
      if (res.ok) {
        const data = await res.json();
        setBodyText(data.optimizedText);
        setComplianceScore(data.complianceScore);
        setComplianceFeedback(data.feedback);
        setSuggestedCategory(data.categoryFit);
        setCategoryReasoning(data.categoryReasoning || null);
        setCategoryApplied(false);
        addSystemLog("crm", "Template body optimized via WappFlow AI Copilot");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiOptimizing(false);
    }
  };

  // Brand-Aware AI Generation Call
  const handleGenerateWithAI = async () => {
    if (!genTopic.trim() || !orgId) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/ai/generate-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: genTopic.trim(), url: genUrl.trim(), orgId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || "Generation failed. Please try again.");
        return;
      }
      setBodyText(data.generatedText);
      addSystemLog("crm", "Template body generated via Brand-Aware AI");
      setShowGenerator(false);
      setGenTopic("");
      setGenUrl("");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Network error during generation.");
    } finally {
      setGenerating(false);
    }
  };

  // Submit Template
  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !bodyText.trim() || !orgId) return;

    // Standardize template name snake_case
    const formattedName = templateName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_");

    await submitMetaTemplate({
      name: formattedName,
      category,
      body: bodyText,
      buttons: buttonsList,
      mediaType,
      mediaUrl: mediaType !== "none" ? mediaUrl.trim() : undefined,
      organizationId: orgId
    });

    // Reset wizard
    setTemplateName("");
    setBodyText("");
    setButtonsList([]);
    setMediaType("none");
    setMediaUrl("");
    setComplianceScore(null);
    setComplianceFeedback([]);
    setSuggestedCategory(null);
    setIsModalOpen(false);
  };

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
  }, [templates, addSystemLog]);

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
                      if (confirm("Are you sure you want to permanently delete this template from WappFlow and Meta Business Portal?")) {
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
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-none flex flex-col overflow-hidden animate-slide-up bg-white border border-stone-300">
            
            {/* Header */}
            <div className="p-6 border-b border-stone-200 flex items-center justify-between shrink-0 bg-stone-50">
              <h3 className="font-bold text-xs uppercase tracking-wider text-stone-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-stone-900" />
                Create WhatsApp compliant template
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-none hover:bg-stone-200 text-stone-500 transition-colors border border-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitTemplate} className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar max-h-[80vh]">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Template Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600">Template Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. black_friday_discount"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                    className="w-full bg-white border border-stone-200 rounded-none py-2.5 px-4 text-xs focus:outline-none focus:border-stone-900"
                  />
                  <span className="text-[9px] text-stone-400 block font-semibold">Forces lowercase snake_case (e.g. coupon_100)</span>
                </div>

                {/* Category Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600">Compliance Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-none py-2.5 px-4 text-xs font-semibold focus:outline-none focus:border-stone-900"
                  >
                    <option value="Marketing">Marketing (Offers, updates)</option>
                    <option value="Utility">Utility (Transactions, budgets)</option>
                    <option value="Authentication">Authentication (OTPs, codes)</option>
                  </select>
                </div>
              </div>

              {/* Media Header Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600">Optional Media Header</label>
                <div className="flex gap-2">
                  {["none", "image", "video", "document"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setMediaType(type);
                        if (type === "none") setMediaUrl("");
                      }}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-none border capitalize cursor-pointer transition-all ${
                        mediaType === type
                          ? "bg-stone-950 text-white border-stone-950"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Sample media URL — required by Meta to register a media header */}
                {mediaType !== "none" && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex gap-2 items-center">
                      <input
                        type="url"
                        placeholder={`Sample ${mediaType} URL — e.g. https://cdn.mysite.com/banner.${mediaType === "image" ? "jpg" : mediaType === "video" ? "mp4" : "pdf"}`}
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        className="flex-1 bg-white border border-stone-200 rounded-none py-2 px-3 text-xs focus:outline-none focus:border-stone-900"
                      />
                      <UploadButton
                        endpoint="mediaUploader"
                        onClientUploadComplete={(res) => {
                          if (res && res[0]) {
                            setMediaUrl(res[0].url);
                            alert("Upload completed successfully!");
                          }
                        }}
                        onUploadError={(error: Error) => {
                          alert(`Upload failed: ${error.message}`);
                        }}
                        appearance={{
                          button: "bg-stone-900 hover:bg-stone-800 text-white rounded-none text-xs font-bold px-3 py-2 cursor-pointer h-9 shrink-0 flex items-center justify-center border border-stone-900 transition-all",
                          allowedContent: "hidden"
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-stone-400 block font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Meta uploads this sample to approve the header. Each broadcast can override the actual {mediaType}.
                    </span>
                  </div>
                )}
              </div>

              {/* Template Body Copy Textarea */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 flex justify-between items-center">
                  <span>Template Text body</span>
                  <span className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowGenerator((v) => !v); setGenError(null); }}
                      className="flex items-center gap-1 text-[10px] font-bold text-stone-900 hover:text-stone-600 transition-colors cursor-pointer normal-case tracking-normal"
                    >
                      <Sparkles className="w-3 h-3" />
                      Generate with AI
                    </button>
                    <span className="text-[9px] text-stone-400">{bodyText.length} / 1024 characters</span>
                  </span>
                </label>

                {/* Brand-Aware AI generator popover */}
                {showGenerator && (
                  <div className="border border-stone-300 rounded-none bg-stone-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h6 className="text-[10px] font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Brand-Aware AI Generator
                      </h6>
                      <button
                        type="button"
                        onClick={() => setShowGenerator(false)}
                        className="text-stone-400 hover:text-stone-900 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[9px] text-stone-500 leading-relaxed">
                      Uses your saved Brand Profile (Settings) to write copy in your brand&apos;s tone.
                    </p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Topic / offer — e.g. 50% off Diwali Sale"
                        value={genTopic}
                        onChange={(e) => setGenTopic(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-none px-3 py-2 text-xs focus:outline-none focus:border-stone-900"
                      />
                      <input
                        type="text"
                        placeholder="URL to embed (optional) — e.g. https://mysite.com/sale"
                        value={genUrl}
                        onChange={(e) => setGenUrl(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-none px-3 py-2 text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>
                    {genError && (
                      <div className="text-[10px] text-red-600 font-semibold flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{genError}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={!genTopic.trim() || generating}
                      onClick={handleGenerateWithAI}
                      className="w-full px-4 py-2 bg-stone-950 hover:bg-stone-900 disabled:opacity-40 text-white text-xs font-bold rounded-none border border-stone-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      {generating ? (
                        <>
                          <Loader className="w-3.5 h-3.5 animate-spin" />
                          Writing in your brand voice...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate Copy
                        </>
                      )}
                    </button>
                  </div>
                )}

                <textarea
                  required
                  rows={4}
                  placeholder="Type your WhatsApp message copy. You can add dynamic variables like: 'Hey {{1}}, here is your code {{2}}' to map CRM details dynamically."
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-none py-2.5 px-4 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              {/* Buttons Builder */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600">Meta Call-To-Action Quick Replies</label>
                
                <div className="flex flex-wrap gap-1.5">
                  {buttonsList.map((btn, index) => (
                    <span 
                      key={index} 
                      className="text-[10px] font-bold bg-stone-100 text-stone-800 pl-3 pr-1 py-1 rounded-none border border-stone-300 flex items-center gap-1.5"
                    >
                      <span>{btn}</span>
                      <button 
                        type="button"
                        onClick={() => setButtonsList(prev => prev.filter((_, idx) => idx !== index))}
                        className="hover:bg-stone-200 p-0.5 rounded-none text-stone-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {buttonsList.length < 3 ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add quick reply button text..."
                      value={newButtonText}
                      onChange={(e) => setNewButtonText(e.target.value)}
                      className="flex-1 bg-white border border-stone-200 rounded-none px-3 py-1.5 text-xs focus:outline-none focus:border-stone-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newButtonText.trim()) return;
                        setButtonsList(prev => [...prev, newButtonText.trim()]);
                        setNewButtonText("");
                      }}
                      className="bg-stone-950 hover:bg-stone-900 text-white rounded-none border border-stone-950 px-3 py-1.5 text-xs font-bold cursor-pointer"
                    >
                      Add Button
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-stone-400 block italic">Max limits of 3 Quick Replies reached.</span>
                )}
              </div>

              {/* Compliance Scanning Card Panel */}
              <div className="border border-stone-200 rounded-none p-4 bg-stone-50 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-stone-900" />
                    AI Template Approval Compliance Auditor
                  </h5>
                  
                  {/* Real-time score indicator */}
                  {complianceScore !== null && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-none border ${
                      complianceScore > 85 
                        ? "bg-stone-900 text-white border-stone-950" 
                        : "bg-white text-stone-500 border-stone-300"
                    }`}>
                      Meta Approval Probability: {complianceScore}%
                    </span>
                  )}
                </div>

                {/* Warnings Section */}
                {clientWarnings.length > 0 && (
                  <div className="space-y-1.5">
                    {clientWarnings.map((w, idx) => (
                      <div key={idx} className="text-[10px] text-stone-900 font-semibold flex items-start gap-1.5 bg-white p-2 rounded-none border border-stone-300">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-stone-900" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Category Suggestion Banner */}
                {suggestedCategory && suggestedCategory !== category && !categoryApplied && (
                  <div className="bg-white border border-stone-300 rounded-none p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-stone-900 font-bold text-[10px] uppercase">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Suggests: <span className="underline">{suggestedCategory}</span>
                    </div>
                    {categoryReasoning && (
                      <p className="text-[10px] text-stone-600 leading-relaxed">{categoryReasoning}</p>
                    )}
                    <div className="text-[9px] text-stone-500 font-semibold uppercase">
                      Utility templates get approved 2-3x faster than Marketing.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCategory(suggestedCategory);
                        setCategoryApplied(true);
                      }}
                      className="text-[10px] font-bold bg-stone-950 hover:bg-stone-900 text-white px-3 py-1.5 rounded-none border border-stone-950 transition-all cursor-pointer uppercase"
                    >
                      Apply &quot;{suggestedCategory}&quot; Category
                    </button>
                  </div>
                )}

                {/* Copilot feedback logs */}
                {complianceFeedback.length > 0 && (
                  <div className="space-y-1.5 bg-white p-3 rounded-none border border-stone-200 text-[10px] text-stone-600 leading-relaxed max-h-36 overflow-y-auto custom-scrollbar">
                    <div className="font-bold text-stone-800 flex items-center gap-1 mb-1">
                      <CheckCircle className="w-3.5 h-3.5 text-stone-900" />
                      AI Optimization feedback logs:
                    </div>
                    {complianceFeedback.map((fb, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 pl-1.5">
                        <span className="text-stone-900 font-bold shrink-0">•</span>
                        <span>{fb}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions AI Optimizer */}
                <div className="flex items-center justify-between gap-4 pt-1.5">
                  <div className="text-[9px] text-stone-500 flex items-center gap-1 leading-none select-none">
                    <HelpCircle className="w-3.5 h-3.5 text-stone-500" />
                    Our AI compiler verifies copy structures to promise zero meta reject rates.
                  </div>

                  <button
                    type="button"
                    disabled={!bodyText.trim() || aiOptimizing}
                    onClick={handleAIOptimize}
                    className="px-4 py-2 bg-stone-950 hover:bg-stone-900 disabled:opacity-40 text-white text-xs font-bold rounded-none border border-stone-950 flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0"
                  >
                    {aiOptimizing ? (
                      <>
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                        AI Hardening Compliance...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Optimize Template
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold text-xs rounded-none cursor-pointer border border-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clientWarnings.length > 0 || !templateName.trim() || !bodyText.trim() || (mediaType !== "none" && !mediaUrl.trim())}
                  className="px-5 py-2 bg-stone-950 hover:bg-stone-900 disabled:opacity-40 text-white font-semibold text-xs rounded-none border border-stone-950 cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  Submit Meta Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
