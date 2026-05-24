"use client";

import React, { useState } from "react";
import { 
  Send, 
  Megaphone, 
  Users, 
  CheckCircle, 
  TrendingUp, 
  X,
  PlayCircle,
  Eye,
  Settings2,
  Calendar,
  AlertCircle
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useParams } from "next/navigation";

export const CampaignsTab: React.FC = () => {
  const { campaigns, templates, contacts, sendBroadcast } = useApp();
  const params = useParams();
  const orgId = params.orgId as string;
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form States
  const [campaignName, setCampaignName] = useState("");
  const [targetTag, setTargetTag] = useState("Shopify");
  const [templateName, setTemplateName] = useState("");

  // Auto-initialize template choice
  if (!templateName && templates.length > 0) {
    setTemplateName(templates[0].name);
  }

  // Calculate target audience size in real-time
  const targetAudienceSize = contacts.filter((c) => c.tags.includes(targetTag)).length;

  const handleLaunchCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim() || !targetTag || !templateName || !orgId) return;

    sendBroadcast({
      name: campaignName.trim(),
      targetTag,
      templateName,
      organizationId: orgId,
    });

    // Reset and close
    setCampaignName("");
    setIsModalOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 self-start">
            <CheckCircle className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case "Sending":
      case "Active":
        return (
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 self-start animate-pulse-soft">
            <PlayCircle className="w-3.5 h-3.5 text-amber-500" />
            Sending
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold text-stone-500 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100 flex items-center gap-1.5 self-start">
            <Calendar className="w-3.5 h-3.5" />
            Scheduled
          </span>
        );
    }
  };

  // Find selected template preview details
  const activeTemplate = templates.find((t) => t.name === templateName);

  // Extract all unique tags in contacts database for select dropdown
  const allUniqueTags = Array.from(new Set(contacts.flatMap((c) => c.tags)));

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campaigns & Broadcasts</h2>
          <p className="text-stone-500 text-sm mt-1">Broadcast WhatsApp bulk templates, track dynamic click metrics, and filter target leads.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-orange-600/10 hover:scale-102 active:scale-98 transition-all"
        >
          <Megaphone className="w-4 h-4" />
          Launch Broadcast
        </button>
      </div>

      {/* Campaigns Listing Grid */}
      <div className="space-y-6">
        <h3 className="font-bold text-base text-stone-800">Recent Broadcast Activity</h3>
        
        {campaigns.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl space-y-3">
            <Send className="w-10 h-10 text-stone-500 mx-auto" />
            <h4 className="font-bold text-stone-700">No campaigns launched yet</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">Create a template and fire your first marketing broadcast to observe live metric counters and system webhook outputs!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.map((camp) => {
              // Rates calculations
              const delRate = camp.sent > 0 ? Math.round((camp.delivered / camp.sent) * 100) : 0;
              const readRate = camp.delivered > 0 ? Math.round((camp.read / camp.delivered) * 100) : 0;
              const clickRate = camp.read > 0 ? Math.round((camp.clicked / camp.read) * 100) : 0;

              return (
                <div key={camp.id} className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-6 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 relative overflow-hidden">
                  
                  {/* Status Indicator Bar at Top */}
                  {camp.status === "Sending" && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 animate-pulse" />
                  )}

                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-stone-900 leading-none">{camp.name}</h4>
                      <span className="text-[10px] text-stone-500 font-mono block">Template: {camp.templateName}</span>
                    </div>
                    {getStatusBadge(camp.status)}
                  </div>

                  {/* Audience Meta */}
                  <div className="grid grid-cols-2 gap-4 bg-orange-50/50 p-3 rounded-xl border border-orange-100 text-[11px] text-stone-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-stone-400" />
                      <span>Target Tag: <strong className="text-stone-800">{camp.targetTag}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <TrendingUp className="w-3.5 h-3.5 text-stone-400" />
                      <span>Fired: <strong className="text-stone-800">{camp.sent} recipients</strong></span>
                    </div>
                  </div>

                  {/* Delivery Metrics Funnel Details */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-500">Delivery Status ({delRate}%)</span>
                      <span className="font-bold text-zinc-800">{camp.delivered} / {camp.sent}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${delRate}%` }} />
                    </div>

                    {/* Lower Funnel row cards */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-orange-50/50 p-2.5 rounded-lg border border-orange-100">
                        <div className="text-[10px] text-stone-500 font-semibold uppercase">Read rate</div>
                        <div className="text-xs font-bold text-stone-800 mt-0.5">{readRate}% <span className="text-[10px] text-stone-400 font-normal">({camp.read} read)</span></div>
                      </div>
                      <div className="bg-orange-50/50 p-2.5 rounded-lg border border-orange-100">
                        <div className="text-[10px] text-stone-500 font-semibold uppercase">CTR rate</div>
                        <div className="text-xs font-bold text-stone-800 mt-0.5">{clickRate}% <span className="text-[10px] text-stone-400 font-normal">({camp.clicked} clicked)</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Launch Campaign Wizard Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl shadow-xl flex flex-col overflow-hidden animate-slide-up bg-white">
            
            {/* Header */}
            <div className="p-6 border-b border-orange-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-orange-500" />
                Launch New WhatsApp Broadcast
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-orange-50 text-stone-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLaunchCampaign} className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
              
              {/* Campaign Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Black Friday discount drop"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-orange-50 border border-orange-100 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Tag Targeting */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex justify-between">
                  <span>Target Audience segment</span>
                  <span className="text-[10px] text-stone-500 font-normal font-mono normal-case">Match: {targetAudienceSize} leads</span>
                </label>
                <select
                  value={targetTag}
                  onChange={(e) => setTargetTag(e.target.value)}
                  className="w-full bg-orange-50 border border-orange-100 rounded-xl py-2.5 px-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {allUniqueTags.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                {targetAudienceSize === 0 && (
                  <div className="text-[10px] text-red-500 font-semibold flex items-center gap-1.5 mt-1 bg-red-500/5 px-2.5 py-1.5 rounded-lg border border-red-500/10">
                    <AlertCircle className="w-3.5 h-3.5" />
                    No active CRM contacts match this segment tag. Fired broadcasts will sent to 0 users.
                  </div>
                )}
              </div>

              {/* Approved Templates list */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Pre-approved message template</label>
                <select
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-orange-50 border border-orange-100 rounded-xl py-2.5 px-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.name}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>

              {/* Template Body Preview Drawer */}
              {activeTemplate && (
                <div className="bg-orange-50/60 p-4 rounded-xl border border-orange-100 space-y-3">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    Meta Template Live Preview
                  </h5>
                  <div className="bg-white border border-orange-100 rounded-xl p-3.5 text-xs text-stone-700 leading-relaxed shadow-sm max-w-[95%]">
                    {/* Optional Media badge */}
                    {activeTemplate.mediaType && activeTemplate.mediaType !== "none" && (
                      <div className="mb-2 px-2.5 py-1 rounded bg-orange-50 text-[10px] text-stone-500 font-bold uppercase inline-flex items-center gap-1.5 select-none leading-none">
                        <span>{activeTemplate.mediaType} Media Header</span>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap select-none">
                      {activeTemplate.body.replace("{{1}}", "[Lead Name]").replace("{{2}}", "[Parameter 2]")}
                    </p>

                    {/* Preview Buttons */}
                    {activeTemplate.buttons && activeTemplate.buttons.length > 0 && (
                      <div className="mt-3.5 border-t border-orange-100 dark:border-zinc-900/60 pt-2.5 space-y-1 text-center font-bold text-orange-600">
                        {activeTemplate.buttons.map((btn, idx) => (
                          <div key={idx} className="py-1 bg-orange-50/50 rounded-md border border-orange-100/40 text-[11px] mb-1">
                            {btn}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer CTA */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-orange-100 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-orange-50 hover:bg-zinc-200 text-stone-600 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={targetAudienceSize === 0 || !campaignName.trim()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-orange-600 text-white font-semibold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-md shadow-orange-600/10"
                >
                  <Send className="w-3.5 h-3.5" />
                  Launch Live Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
