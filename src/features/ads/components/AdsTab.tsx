"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/shared/context/AppContext";
import { useParams } from "next/navigation";
import { 
  Sparkles, 
  Megaphone, 
  Loader2, 
  Plus, 
  Trash2, 
  Check, 
  TrendingUp, 
  DollarSign, 
  MousePointerClick, 
  Eye, 
  Settings2, 
  FileText,
  ChevronRight,
  Send,
  X
} from "lucide-react";

interface AdCampaignWithAds {
  id: string;
  name: string;
  objective: string;
  budget: number;
  status: string;
  createdAt: string;
  ads: Array<{
    id: string;
    name: string;
    status: string;
    creative: any; // { headline, primaryText, imagePrompt, imageUrl }
    linkedTemplate?: string | null;
  }>;
}

export const AdsTab: React.FC = () => {
  const { orgId } = useParams() as { orgId: string };
  const { templates } = useApp();
  
  const [campaigns, setCampaigns] = useState<AdCampaignWithAds[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Wizard Steps: 1 (Details) | 2 (Creative) | 3 (Welcome Message) | 4 (Review)
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Wizard State variables
  const [campaignName, setCampaignName] = useState("");
  const [budget, setBudget] = useState("500");
  const [objective, setObjective] = useState("MESSAGES");
  const [adAccountId, setAdAccountId] = useState("act_61590196150255");
  const [pageId, setPageId] = useState("1018769140823714");
  
  // AI Creative State variables
  const [topic, setTopic] = useState("");
  const [isGeneratingCreative, setIsGeneratingCreative] = useState(false);
  const [creative, setCreative] = useState({
    headline: "",
    primaryText: "",
    imagePrompt: "",
    imageUrl: "https://images.unsplash.com/photo-1596524430615-b46475ddff6e?w=800",
  });
  
  // Welcome Trigger State variable
  const [linkedTemplate, setLinkedTemplate] = useState("");

  // Fetch Campaigns on Mount
  const fetchCampaigns = async () => {
    try {
      setIsLoadingList(true);
      const res = await fetch(`/api/org/${orgId}/ads/campaigns`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error("Failed to load campaigns:", err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      fetchCampaigns();
    }
  }, [orgId]);

  // Set default template if templates are loaded
  useEffect(() => {
    if (templates.length > 0 && !linkedTemplate) {
      setLinkedTemplate(templates[0].name);
    }
  }, [templates, linkedTemplate]);

  // Handle AI Creative Generation
  const handleGenerateCreative = async () => {
    if (!topic) return;
    setIsGeneratingCreative(true);
    setError("");

    try {
      const res = await fetch("/api/ai/generate-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, orgId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate creative");

      setCreative({
        headline: data.headline || "",
        primaryText: data.primaryText || "",
        imagePrompt: data.imagePrompt || "",
        imageUrl: "https://images.unsplash.com/photo-1596524430615-b46475ddff6e?w=800", // Default placeholder
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsGeneratingCreative(false);
    }
  };

  // Handle Publish/Submit
  const handlePublishCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/org/${orgId}/ads/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName.trim(),
          budget: parseFloat(budget),
          objective,
          pageId: pageId.trim(),
          adAccountId: adAccountId.trim(),
          creative,
          linkedTemplate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish campaign");

      await fetchCampaigns();
      
      // Reset Form and step
      setCampaignName("");
      setBudget("500");
      setTopic("");
      setCreative({
        headline: "",
        primaryText: "",
        imagePrompt: "",
        imageUrl: "https://images.unsplash.com/photo-1596524430615-b46475ddff6e?w=800",
      });
      setStep(1);
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to publish campaign.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Campaign
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to permanently delete this campaign?")) return;

    try {
      const res = await fetch(`/api/org/${orgId}/ads/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      }
    } catch (err) {
      console.error("Failed to delete campaign:", err);
    }
  };

  // Generate deterministic mock metrics for demo/simulation purposes
  const getMockMetrics = (campaignId: string, status: string) => {
    const seed = campaignId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const isInactive = status !== "ACTIVE";
    
    if (isInactive) {
      return {
        impressions: 0,
        clicks: 0,
        ctr: 0,
        spent: 0,
      };
    }
    
    const impressions = Math.floor((seed % 400) + 1200);
    const clicks = Math.floor(impressions * ((seed % 5 === 0 ? 0.08 : 0.05) + 0.02));
    const ctr = parseFloat(((clicks / impressions) * 100).toFixed(2));
    const spent = parseFloat((clicks * 24.50).toFixed(2)); // ₹24.50 cost-per-click mock

    return { impressions, clicks, ctr, spent };
  };

  return (
    <div className="flex-1 p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up bg-[#fafaf9] overflow-y-auto text-left w-full items-stretch justify-start">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900 uppercase flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-wa-green" />
            Click-to-WhatsApp Ads
          </h2>
          <p className="text-stone-500 text-xs mt-1">
            Grow your contact base by creating FB/IG ads linked directly to your WhatsApp templates and chat workflows.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-stone-950 hover:bg-stone-900 text-white font-bold text-xs px-4 py-2.5 rounded-none flex items-center gap-2 cursor-pointer border border-stone-950 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          CREATE AD CAMPAIGN
        </button>
      </div>

      {/* Warning Alert Banner (if any) */}

      {/* Campaigns Listing */}
      {isLoadingList ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-wa-green" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="p-16 text-center rounded-none bg-white border border-stone-200 space-y-4 shadow-sm max-w-4xl mx-auto">
          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-400">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-stone-900 font-bold text-sm uppercase">No Ad Campaigns Created Yet</h3>
            <p className="text-stone-500 text-xs mt-1 max-w-md mx-auto">
              Launch your first click-to-whatsapp ad creative using the integrated AI generator to instantly bring leads into your CRM database!
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-stone-950 text-white text-xs font-bold hover:bg-stone-900 border border-stone-950 transition-all rounded-none mx-auto inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Launch Campaign Wizard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((camp) => {
            const metrics = getMockMetrics(camp.id, camp.status);
            const activeAd = camp.ads[0];

            return (
              <div key={camp.id} className="p-6 rounded-none flex flex-col justify-between space-y-6 bg-white border border-stone-200 relative overflow-hidden shadow-sm">
                
                {/* Header Info */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-stone-900 leading-none">{camp.name}</h4>
                    </div>
                    <span className="text-[10px] text-stone-500 block mt-1">Linked template: {activeAd?.linkedTemplate || "None (Inbound Text)"}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-none border uppercase ${
                      camp.status === "ACTIVE" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-stone-50 text-stone-600 border-stone-200"
                    }`}>
                      {camp.status}
                    </span>
                    <button
                      onClick={() => handleDeleteCampaign(camp.id)}
                      className="p-1.5 rounded-none text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors border border-transparent cursor-pointer"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Ad Details Panel */}
                <div className="bg-stone-50 p-3.5 rounded-none border border-stone-200 space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-stone-500 font-semibold uppercase">
                    <span>Budget: ₹{camp.budget}/day</span>
                    <span>Objective: {camp.objective}</span>
                  </div>
                  {activeAd?.creative && (
                    <div className="border-t border-stone-100 pt-2 text-xs">
                      <div className="font-bold text-stone-800 line-clamp-1">{activeAd.creative.headline}</div>
                      <div className="text-stone-600 line-clamp-2 mt-0.5 whitespace-pre-wrap">{activeAd.creative.primaryText}</div>
                    </div>
                  )}
                </div>

                {/* Metrics Stats row */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="bg-stone-50 p-2.5 rounded-none border border-stone-200 flex flex-col">
                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Eye className="w-3 h-3 text-stone-400" /> Impressions
                    </span>
                    <span className="text-sm font-bold text-stone-900 mt-1">{metrics.impressions.toLocaleString()}</span>
                  </div>
                  <div className="bg-stone-50 p-2.5 rounded-none border border-stone-200 flex flex-col">
                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <MousePointerClick className="w-3 h-3 text-stone-400" /> Clicks
                    </span>
                    <span className="text-sm font-bold text-stone-900 mt-1">{metrics.clicks.toLocaleString()}</span>
                  </div>
                  <div className="bg-stone-50 p-2.5 rounded-none border border-stone-200 flex flex-col">
                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-stone-400" /> CTR
                    </span>
                    <span className="text-sm font-bold text-stone-900 mt-1">{metrics.ctr}%</span>
                  </div>
                </div>

                {/* Bottom Footer spend */}
                <div className="border-t border-stone-200 pt-4 flex justify-between items-center text-xs font-semibold text-stone-500 select-none">
                  <span>Spend: <strong className="text-stone-950">₹{metrics.spent.toLocaleString()}</strong></span>
                  <span className="text-[10px] text-stone-400">Created {new Date(camp.createdAt).toLocaleDateString()}</span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CREATE CAMPAIGN WIZARD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-none flex flex-col overflow-hidden animate-slide-up bg-white border border-stone-300">
            
            {/* Header */}
            <div className="p-6 border-b border-stone-200 flex items-center justify-between shrink-0 bg-stone-50 select-none">
              <h3 className="font-bold text-xs uppercase tracking-wider text-stone-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-stone-900" />
                Meta Ads Integration Wizard
              </h3>
              <button 
                onClick={() => {
                  setStep(1);
                  setIsModalOpen(false);
                }}
                className="p-1 rounded-none hover:bg-stone-200 text-stone-500 transition-colors border border-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress bar */}
            <div className="flex border-b border-stone-100 bg-stone-50/50 p-4 select-none justify-between items-center text-[10px] font-bold text-stone-400 tracking-wider">
              <div className={`flex items-center gap-1 ${step >= 1 ? "text-stone-900" : ""}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${step >= 1 ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-500"}`}>1</span>
                <span>Details</span>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300" />
              <div className={`flex items-center gap-1 ${step >= 2 ? "text-stone-900" : ""}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${step >= 2 ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-500"}`}>2</span>
                <span>AI Creative</span>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300" />
              <div className={`flex items-center gap-1 ${step >= 3 ? "text-stone-900" : ""}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${step >= 3 ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-500"}`}>3</span>
                <span>Welcome Trigger</span>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300" />
              <div className={`flex items-center gap-1 ${step >= 4 ? "text-stone-900" : ""}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${step >= 4 ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-500"}`}>4</span>
                <span>Review & Publish</span>
              </div>
            </div>

            {/* Form & Wizard Content */}
            <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar max-h-[70vh]">
              
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs border border-red-100 font-medium">
                  {error}
                </div>
              )}

              {/* STEP 1: Campaign Configuration */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Campaign Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lead Gen - Summer Discount Ads"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="w-full bg-white text-stone-900 placeholder:text-stone-400 border border-stone-200 rounded-none py-2.5 px-4 text-xs focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Daily Budget (INR ₹)</label>
                      <input
                        type="number"
                        required
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="w-full bg-white text-stone-900 border border-stone-200 rounded-none py-2.5 px-4 text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Campaign Objective</label>
                      <select
                        value={objective}
                        onChange={(e) => setObjective(e.target.value)}
                        className="w-full bg-white text-stone-900 border border-stone-200 rounded-none py-2.5 px-4 text-xs font-semibold focus:outline-none focus:border-stone-900"
                      >
                        <option value="MESSAGES">Click-to-WhatsApp (Messages)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-stone-100 pt-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Meta Ad Account ID</label>
                      <input
                        type="text"
                        placeholder="act_61590196150255"
                        value={adAccountId}
                        onChange={(e) => setAdAccountId(e.target.value)}
                        className="w-full bg-white text-stone-900 border border-stone-200 rounded-none py-2.5 px-4 text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Facebook Page ID</label>
                      <input
                        type="text"
                        placeholder="1018769140823714"
                        value={pageId}
                        onChange={(e) => setPageId(e.target.value)}
                        className="w-full bg-white text-stone-900 border border-stone-200 rounded-none py-2.5 px-4 text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: AI Creative Generator */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="bg-stone-50 border border-stone-200 p-4 rounded-none space-y-3">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-wa-green animate-pulse" />
                      Describe the Ad Topic / Offer
                    </h5>
                    <textarea
                      placeholder="Describe what you want the ad copy to focus on. e.g. 50% discount on summer shoes, or sign up for free WhatsApp marketing demo..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-none p-3 text-xs focus:outline-none focus:border-stone-900 resize-none min-h-[80px]"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateCreative}
                      disabled={isGeneratingCreative || !topic}
                      className="bg-wa-green hover:bg-wa-green-dark text-white font-bold text-[10px] px-3.5 py-2 rounded-none flex items-center gap-1.5 transition-all disabled:opacity-40"
                    >
                      {isGeneratingCreative ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Llama Copywriter Thinking...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate Copy & Prompt
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-stone-500">Headline</label>
                        <input
                          type="text"
                          value={creative.headline}
                          onChange={(e) => setCreative(prev => ({ ...prev, headline: e.target.value }))}
                          placeholder="Generated headline..."
                          className="w-full bg-white border border-stone-200 rounded-none py-2 px-3 text-xs focus:outline-none focus:border-stone-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-stone-500">Primary Text</label>
                        <textarea
                          rows={4}
                          value={creative.primaryText}
                          onChange={(e) => setCreative(prev => ({ ...prev, primaryText: e.target.value }))}
                          placeholder="Generated primary ad text..."
                          className="w-full bg-white border border-stone-200 rounded-none p-3 text-xs focus:outline-none focus:border-stone-900 resize-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-stone-500">AI Image Generator Prompt</label>
                        <textarea
                          rows={3}
                          value={creative.imagePrompt}
                          onChange={(e) => setCreative(prev => ({ ...prev, imagePrompt: e.target.value }))}
                          placeholder="Generated visual prompt..."
                          className="w-full bg-white border border-stone-200 rounded-none p-3 text-xs text-stone-600 italic focus:outline-none focus:border-stone-900 resize-none bg-stone-50/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-stone-500">Creative Image URL</label>
                        <input
                          type="text"
                          value={creative.imageUrl}
                          onChange={(e) => setCreative(prev => ({ ...prev, imageUrl: e.target.value }))}
                          placeholder="https://example.com/ad-image.jpg"
                          className="w-full bg-white border border-stone-200 rounded-none py-2 px-3 text-xs focus:outline-none focus:border-stone-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Welcome Message Templates */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="bg-stone-50 border border-stone-200 p-4 rounded-none space-y-2 select-none">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-stone-900" />
                      Set WhatsApp Welcome Flow
                    </h5>
                    <p className="text-stone-500 text-xs leading-relaxed">
                      Select which pre-approved WhatsApp template will trigger automatically when the customer clicks the ad button and initiates contact with your number.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Select Welcome Template</label>
                    <select
                      value={linkedTemplate}
                      onChange={(e) => setLinkedTemplate(e.target.value)}
                      className="w-full bg-white text-stone-900 border border-stone-200 rounded-none py-2.5 px-4 text-xs font-semibold focus:outline-none focus:border-stone-900"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.name}>{t.name} ({t.category})</option>
                      ))}
                    </select>
                  </div>

                  {linkedTemplate && (
                    <div className="bg-stone-50 border border-stone-200 p-4 rounded-none space-y-2">
                      <span className="text-[10px] font-bold uppercase text-stone-400">Template Preview:</span>
                      <div className="bg-white border border-stone-200 p-4 text-xs text-stone-700 leading-relaxed font-medium">
                        {templates.find(t => t.name === linkedTemplate)?.body}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: Live Mock Ad Preview & Submission */}
              {step === 4 && (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 items-start">
                  
                  {/* Left Column (2/5): Review Configuration details */}
                  <div className="sm:col-span-2 space-y-4 bg-stone-50 p-4 rounded-none border border-stone-200 select-none">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-900 border-b border-stone-200 pb-2">
                      Campaign Ledger
                    </h5>
                    <div className="space-y-3 text-[11px] font-semibold text-stone-600">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-stone-400 block font-normal">Campaign Name</span>
                        <span className="text-stone-900">{campaignName}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-stone-400 block font-normal">Daily Budget</span>
                        <span className="text-stone-900">₹{budget} / day</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-stone-400 block font-normal">Meta Ad Account</span>
                        <span className="text-stone-900 truncate block">{adAccountId}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-stone-400 block font-normal">Facebook Page ID</span>
                        <span className="text-stone-900 truncate block">{pageId}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-stone-400 block font-normal">Trigger Template</span>
                        <span className="text-stone-900">{linkedTemplate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (3/5): Beautiful Facebook Feed Mock Ad Simulator */}
                  <div className="sm:col-span-3 space-y-3 select-none">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-900">
                      Facebook Mobile Feed Preview
                    </h5>
                    
                    {/* Outer phone screen frame mockup */}
                    <div className="bg-stone-100 border border-stone-300 p-4 rounded-xl flex justify-center">
                      <div className="bg-white border border-stone-200 w-full max-w-[320px] rounded-lg overflow-hidden shadow-md font-sans">
                        
                        {/* 1. Header of Page */}
                        <div className="p-3 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-stone-800 text-white flex items-center justify-center font-bold text-[10px] uppercase">
                            {campaignName ? campaignName.slice(0, 2) : "AD"}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-stone-900">{campaignName || "WappFlow Client Page"}</div>
                            <div className="text-[9px] text-stone-500 mt-0.5">Sponsored · 🌐</div>
                          </div>
                        </div>

                        {/* 2. Primary Text */}
                        <div className="px-3 pb-3 text-xs text-stone-800 whitespace-pre-wrap leading-relaxed line-clamp-4">
                          {creative.primaryText || "Write something engaging..."}
                        </div>

                        {/* 3. Image URL banner */}
                        <div className="h-44 bg-stone-100 border-y border-stone-150 overflow-hidden relative flex items-center justify-center">
                          {creative.imageUrl ? (
                            <img
                              src={creative.imageUrl}
                              alt="Ad creative visual"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback image if user url fails to load
                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1596524430615-b46475ddff6e?w=800";
                              }}
                            />
                          ) : (
                            <Megaphone className="w-10 h-10 text-stone-300" />
                          )}
                        </div>

                        {/* 4. Footer CTA click row */}
                        <div className="bg-stone-50 p-3 flex justify-between items-center border-b border-stone-100">
                          <div className="space-y-0.5 flex-1 pr-2">
                            <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold block">WHATSAPP</span>
                            <span className="text-xs font-bold text-stone-950 block truncate leading-none">{creative.headline || "Chat on WhatsApp"}</span>
                          </div>
                          <button
                            type="button"
                            className="bg-[#25D366] text-white font-extrabold text-[9px] uppercase py-2 px-3 tracking-wider flex items-center gap-1.5 shrink-0 transition-transform active:scale-95"
                          >
                            <Send className="w-3 h-3 text-white" />
                            Send Message
                          </button>
                        </div>

                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>

            {/* Modal Controls / Footer */}
            <div className="p-6 border-t border-stone-200 flex justify-between items-center shrink-0 bg-stone-50 select-none">
              <div>
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(prev => prev - 1)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold text-xs rounded-none cursor-pointer border border-stone-300"
                  >
                    Back
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setIsModalOpen(false);
                  }}
                  className="px-4 py-2 bg-white hover:bg-stone-50 text-stone-600 font-semibold text-xs rounded-none cursor-pointer border border-stone-200"
                >
                  Cancel
                </button>

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={() => setStep(prev => prev + 1)}
                    disabled={step === 1 ? !campaignName.trim() : step === 2 ? (!creative.headline || !creative.primaryText) : false}
                    className="px-4 py-2 bg-stone-950 hover:bg-stone-900 border border-stone-950 disabled:opacity-40 text-white font-bold text-xs rounded-none cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePublishCampaign}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-wa-green hover:bg-wa-green-dark border border-wa-green text-white font-bold text-xs rounded-none cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Publishing to Meta...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Publish Campaign
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
