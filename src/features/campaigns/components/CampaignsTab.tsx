"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  AlertCircle,
  Trash2,
  Clock,
  Sliders,
  Filter,
  BarChart4,
  Maximize2,
  Sparkles,
  Loader2,
  CheckCircle2,
  FilePlus2,
} from "lucide-react";
import { useApp } from "@/shared/context/AppContext";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { notify } from "@/shared/lib/toast";
import { useConfirm } from "@/shared/components/ui/ConfirmDialog";
import { CampaignReportDrawer } from "./CampaignReportDrawer";
import { CreateTemplateModal } from "@/features/templates/components/CreateTemplateModal";
import { UploadButton } from "@/shared/lib/uploadthing";
import { SegmentRules, evaluateSegmentRules } from "@/shared/lib/segmentMatch";

export const CampaignsTab: React.FC = () => {
  const { organization, campaigns, templates, contacts, systemLogs, sendBroadcast, deleteCampaign, addSystemLog, refreshWorkspace } = useApp();
  const confirm = useConfirm();
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isStrategistOpen, setIsStrategistOpen] = useState(false);
  const [strategistPrompt, setStrategistPrompt] = useState("");
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [strategistStrategy, setStrategistStrategy] = useState<any>(null);
  const [strategistError, setStrategistError] = useState("");
  const [connectingWaba, setConnectingWaba] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState("Analyzing market positioning...");
  const [isApplyingStrategy, setIsApplyingStrategy] = useState(false);

  // Load FB SDK for embedded WABA connection within strategist modal
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!appId) return;
    if (document.getElementById("facebook-jssdk")) return;

    (window as any).fbAsyncInit = function () {
      (window as any).FB?.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v21.0",
      });
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  }, []);

  const launchEmbeddedSignup = () => {
    const fb = (window as any).FB;
    if (!fb) {
      notify.error("WhatsApp connect unavailable", "Facebook SDK didn't load. Refresh the page and try again.");
      return;
    }
    setConnectingWaba(true);
    fb.login(
      (response: any) => {
        if (response.authResponse?.code) {
          handleSignupCallback(response.authResponse.code);
        } else {
          setConnectingWaba(false);
          notify.error("Connection cancelled", "WhatsApp signup was cancelled or didn't complete. Please try again.");
        }
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID || "",
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: "3",
        },
      }
    );
  };

  const handleSignupCallback = async (code: string) => {
    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify.error("Connection failed", data.error || "We couldn't connect your WhatsApp Business account.");
        return;
      }
      notify.success("WhatsApp connected", "Your WhatsApp Business account is connected and ready to send.");
      if (orgId) await refreshWorkspace(orgId);
    } catch {
      notify.error("Network error", "Something went wrong while connecting. Please try again.");
    } finally {
      setConnectingWaba(false);
    }
  };

  // Lock body scroll when launch campaign modal is open
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

  // Poll workspace data to keep campaign delivery metrics and statuses updated in real-time when sending
  useEffect(() => {
    if (!orgId) return;
    const hasActiveSending = campaigns.some(c => c.status === "Sending" || c.status === "Active");
    if (!hasActiveSending) return;

    const interval = setInterval(() => {
      refreshWorkspace(orgId);
    }, 3000);

    return () => clearInterval(interval);
  }, [campaigns, orgId, refreshWorkspace]);

  // Status filtering
  const [statusFilter, setStatusFilter] = useState<"all" | "Completed" | "Sending" | "Scheduled">("all");

  // Detailed Report Drawer state
  const [reportDrawerOpen, setReportDrawerOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [reportInitialTab, setReportInitialTab] = useState<"analytics" | "setup">("analytics");

  // Campaign Form States
  const [campaignName, setCampaignName] = useState("");
  const [excludeTag, setExcludeTag] = useState("None");
  const [templateName, setTemplateName] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [broadcastMode, setBroadcastMode] = useState<"template" | "session">("template");
  const [sessionText, setSessionText] = useState("");

  // Dynamic segments targeting states
  const [segments, setSegments] = useState<any[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [loadingSegments, setLoadingSegments] = useState(false);

  // Advanced Delivery States
  const [runMode, setRunMode] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [sendDelay, setSendDelay] = useState(1); // Spacing delay in seconds

  // Dynamic Variable Mappings — variable name (e.g. "{{1}}") → type and chosen value
  const [variablesMapping, setVariablesMapping] = useState<Record<string, { type: "contact_field" | "static"; value: string }>>({});

  // Load Saved Segments
  useEffect(() => {
    if (!orgId) return;
    const fetchSegments = async () => {
      setLoadingSegments(true);
      try {
        const res = await fetch(`/api/org/${orgId}/segments`);
        if (res.ok) {
          const data = await res.json();
          setSegments(data.segments || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSegments(false);
      }
    };
    fetchSegments();
  }, [orgId]);

  // Initialize selectedSegmentId once segments load (smart default to largest segment)
  useEffect(() => {
    if (!selectedSegmentId) {
      if (segments.length > 0) {
        let maxMatches = -1;
        let largestSegmentId = "all_contacts";

        segments.forEach(seg => {
          const matches = contacts.filter((c) => evaluateSegmentRules(c, seg.rules as SegmentRules)).length;
          if (matches > maxMatches) {
            maxMatches = matches;
            largestSegmentId = seg.id;
          }
        });

        setSelectedSegmentId(largestSegmentId);
      } else {
        setSelectedSegmentId("all_contacts");
      }
    }
  }, [segments, selectedSegmentId, contacts]);

  // Auto-initialize template choice
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!templateName && templates.length > 0) {
      timer = setTimeout(() => {
        setTemplateName(templates[0].name);
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [templates, templateName]);

  const activeTemplate = templates.find((t) => t.name === templateName);

  // Scan and parse variables from active template body
  useEffect(() => {
    const t = templates.find((x) => x.name === templateName);
    const initialMapping: Record<string, { type: "contact_field" | "static"; value: string }> = {};
    if (t?.body) {
      const matches = t.body.match(/\{\{\d+\}\}/g);
      if (matches) {
        matches.forEach((match) => {
          initialMapping[match] = { type: "contact_field", value: "name" };
        });
      }
    }
    const timer = setTimeout(() => {
      setVariablesMapping(initialMapping);
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, [templateName, templates]);

  // Calculate target audience size in real-time using segment rules evaluation
  const targetAudienceSize = useMemo(() => {
    const isExcluded = excludeTag !== "None";
    if (!selectedSegmentId || selectedSegmentId === "all_contacts") {
      return contacts.filter((c) => {
        const matchesExclusion = isExcluded && c.tags.includes(excludeTag);
        return !matchesExclusion;
      }).length;
    }

    const activeSeg = segments.find((s) => s.id === selectedSegmentId);
    if (!activeSeg) return 0;

    return contacts.filter((c) => {
      const matchesSeg = evaluateSegmentRules(c, activeSeg.rules as SegmentRules);
      const matchesExclusion = isExcluded && c.tags.includes(excludeTag);
      return matchesSeg && !matchesExclusion;
    }).length;
  }, [contacts, selectedSegmentId, segments, excludeTag]);

  // Drive the AI Campaign Strategist generation. Extracted so both the modal's
  // "Generate" button and the dashboard "Done-For-You" copilot handoff can reuse it.
  const handleGenerateStrategy = useCallback(async (prompt: string) => {
    if (!prompt.trim() || !orgId) return;
    setIsGeneratingStrategy(true);
    setStrategistError("");

    const steps = [
      "Analyzing customer purchase telemetry...",
      "Drafting high-converting template copy...",
      "Defining target segment matching rules...",
      "Designing 3-step follow-up drip sequence...",
      "Structuring campaign schedule reasoning...",
    ];
    let stepIdx = 0;
    setLoadingStepText(steps[0]);
    const stepInterval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      setLoadingStepText(steps[stepIdx]);
    }, 1800);

    try {
      const res = await fetch("/api/ai/campaign-strategist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", orgId, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate strategy");
      setStrategistStrategy(data.strategy);
    } catch (err: any) {
      setStrategistError(err.message || "An unexpected error occurred.");
    } finally {
      clearInterval(stepInterval);
      setIsGeneratingStrategy(false);
    }
  }, [orgId]);

  // Dashboard "Done-For-You" copilot hands off here via ?tab=campaigns&goal=...
  // Open the strategist, prefill the goal, and auto-generate. The ref guard + URL
  // cleanup ensure this fires exactly once per handoff.
  const goalHandledRef = useRef(false);
  useEffect(() => {
    const goal = (searchParams.get("goal") || "").trim();
    if (!goal || !orgId || goalHandledRef.current) return;
    goalHandledRef.current = true;
    setIsStrategistOpen(true);
    setStrategistStrategy(null);
    setStrategistPrompt(goal);
    void handleGenerateStrategy(goal);
    router.replace(`${pathname}?tab=campaigns`, { scroll: false });
  }, [searchParams, orgId, pathname, router, handleGenerateStrategy]);

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim() || !orgId) return;
    if (broadcastMode === "template" && !templateName) return;
    if (broadcastMode === "session" && !sessionText.trim()) return;

    const scheduledAtStr = runMode === "scheduled" && scheduledDate && scheduledTime
      ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      : undefined;

    const targetTagValue = selectedSegmentId === "all_contacts" ? "all" : "";
    const segmentIdValue = selectedSegmentId === "all_contacts" ? undefined : selectedSegmentId;

    if (broadcastMode === "session") {
      try {
        addSystemLog("campaign", `Launching session broadcast '${campaignName}'...`);
        const res = await fetch("/api/whatsapp/session-broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: campaignName.trim(),
            targetTag: targetTagValue,
            segmentId: segmentIdValue,
            text: sessionText.trim(),
            organizationId: orgId,
            delay: sendDelay,
            scheduledAt: scheduledAtStr
          })
        });
        const data = await res.json();
        if (!res.ok) {
          addSystemLog("campaign", `Session broadcast failed: ${data.error}`);
          notify.error("Broadcast failed", data.error);
          return;
        }
        addSystemLog("campaign", `Session broadcast launched! ${data.eligibleCount} contacts in 24h window.`);
      } catch (err: unknown) {
        addSystemLog("campaign", `Session broadcast error: ${(err instanceof Error ? err.message : String(err))}`);
      }
    } else {
      const variablesPayload = Object.entries(variablesMapping).map(([key, map]) => ({
        key,
        type: map.type,
        value: map.value
      }));

      sendBroadcast({
        name: campaignName.trim(),
        targetTag: targetTagValue,
        segmentId: segmentIdValue,
        templateName,
        organizationId: orgId,
        variables: variablesPayload,
        delay: sendDelay,
        scheduledAt: scheduledAtStr,
        excludeTag: excludeTag === "None" ? undefined : excludeTag,
        mediaType: activeTemplate?.mediaType,
        mediaUrl: mediaUrl.trim() || undefined,
      });
    }

    setCampaignName("");
    setRunMode("immediate");
    setScheduledDate("");
    setScheduledTime("");
    setSendDelay(1);
    setSessionText("");
    setMediaUrl("");
    setSelectedSegmentId("all_contacts");
    setIsModalOpen(false);
  };

  // Compile real-time template body live preview
  const compileLivePreview = () => {
    if (!activeTemplate) return "";
    let body = activeTemplate.body;

    Object.entries(variablesMapping).forEach(([variable, mapping]) => {
      let replacement = `[${variable}]`;
      if (mapping.type === "contact_field") {
        if (mapping.value === "name") replacement = "[Lead Name]";
        if (mapping.value === "email") replacement = "[Lead Email]";
        if (mapping.value === "phone") replacement = "[Lead Phone]";
      } else if (mapping.type === "static" && mapping.value) {
        replacement = mapping.value;
      }
      body = body.replace(variable, replacement);
    });

    return body;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <span className="text-[10px] font-bold text-stone-900 bg-stone-100 border border-stone-300 px-2.5 py-1 rounded-none flex items-center gap-1.5 self-start uppercase">
            <CheckCircle className="w-3.5 h-3.5 text-stone-900" />
            Completed
          </span>
        );
      case "Sending":
      case "Active":
        return (
          <span className="text-[10px] font-bold text-white bg-stone-950 border border-stone-950 px-2.5 py-1 rounded-none flex items-center gap-1.5 self-start uppercase">
            <PlayCircle className="w-3.5 h-3.5 text-white" />
            Sending
          </span>
        );
      case "Scheduled":
        return (
          <span className="text-[10px] font-bold text-stone-600 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-none flex items-center gap-1.5 self-start uppercase">
            <Calendar className="w-3.5 h-3.5 text-stone-500" />
            Scheduled
          </span>
        );
      case "PendingTemplate":
        return (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-none flex items-center gap-1.5 self-start uppercase">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Awaiting Approval
          </span>
        );
      case "Failed":
        return (
          <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-none flex items-center gap-1.5 self-start uppercase">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            Failed
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold text-stone-600 bg-stone-50 px-2.5 py-1 rounded-none border border-stone-200 flex items-center gap-1.5 self-start uppercase">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            {status}
          </span>
        );
    }
  };

  // Find active selected campaign for report drawer
  const activeReportCampaign = campaigns.find((c) => c.id === selectedCampaignId) || null;

  // Extract all unique tags in contacts database for tag dropdown
  const allUniqueTags = Array.from(new Set(contacts.flatMap((c) => c.tags)));

  // Filter campaigns list based on user filter selections
  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter === "all") return true;
    return c.status === statusFilter;
  });

  return (
    <div className={`flex-1 p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up bg-[#fafaf9] ${
      isModalOpen ? "overflow-hidden" : "overflow-y-auto"
    }`}>

      {/* Tab Header */}
      <div className="flex max-sm:flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900 uppercase">Campaigns & Broadcasts</h2>
          <p className="text-stone-500 text-xs mt-1">Broadcast WhatsApp bulk templates, track dynamic click metrics, and filter target leads.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsStrategistOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-none flex items-center gap-2 cursor-pointer border border-emerald-600 transition-all shadow-md shadow-emerald-600/10"
          >
            <Sparkles className="w-4 h-4" />
            AI CAMPAIGN STRATEGIST
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-stone-950 hover:bg-stone-900 text-white font-bold text-xs px-4 py-2.5 rounded-none flex items-center gap-2 cursor-pointer border border-stone-950 transition-all"
          >
            <Megaphone className="w-4 h-4" />
            LAUNCH BROADCAST
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-stone-500 text-[10px] font-bold uppercase tracking-wider mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            Filter Status:
          </span>
          {(["all", "Sending", "Completed", "Scheduled"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-none border transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-stone-950 text-white border-stone-950"
                  : "text-stone-500 border-transparent hover:bg-stone-100"
              }`}
            >
              {status === "all" ? "All Broadcasts" : status}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Listing Grid */}
      <div className="space-y-6">
        <h3 className="font-bold text-xs uppercase tracking-wider text-stone-900">Recent Broadcast Activity</h3>

        {filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center rounded-none space-y-3 bg-white border border-stone-200">
            <Send className="w-10 h-10 text-stone-400 mx-auto" />
            <h4 className="font-bold text-stone-700 uppercase text-xs">No campaigns match this filter</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">Create a template and fire your first marketing broadcast to observe live metric counters and system webhook outputs!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCampaigns.map((camp) => {
              const delRate = camp.sent > 0 ? Math.round((camp.delivered / camp.sent) * 100) : 0;
              const readRate = camp.delivered > 0 ? Math.round((camp.read / camp.delivered) * 100) : 0;
              const clickRate = camp.read > 0 ? Math.round((camp.clicked / camp.read) * 100) : 0;

              return (
                <div key={camp.id} className="p-6 rounded-none flex flex-col justify-between space-y-6 bg-white border border-stone-200 relative overflow-hidden">

                  {(camp.status === "Sending" || camp.status === "Active") && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-stone-950" />
                  )}

                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <h4 className="font-bold text-sm text-stone-900 leading-none">{camp.name}</h4>
                      <span className="text-[10px] text-stone-500 block mt-1">Template: {camp.templateName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {getStatusBadge(camp.status)}
                      <button
                        onClick={async () => {
                          if (await confirm({
                            title: "Delete this campaign?",
                            description: "This permanently removes the campaign and its delivery logs. This can't be undone.",
                            tone: "danger",
                            confirmLabel: "Delete campaign",
                          })) {
                            await deleteCampaign(camp.id);
                          }
                        }}
                        className="p-1.5 rounded-none text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer border border-transparent"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Audience Meta */}
                  <div className="grid grid-cols-2 gap-4 bg-stone-50 p-3 rounded-none border border-stone-200 text-[11px] text-stone-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-stone-400" />
                      <span>
                        {camp.segment ? "Target Segment: " : "Target Tag: "}
                        <strong className="text-stone-800">
                          {camp.segment ? (camp.segment as any).name : camp.targetTag}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <TrendingUp className="w-3.5 h-3.5 text-stone-400" />
                      <span>Fired: <strong className="text-stone-800">{camp.sent} recipients</strong></span>
                    </div>
                  </div>

                  {/* Delivery Metrics Funnel */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-500">Delivery Status ({delRate}%)</span>
                      <span className="font-bold text-stone-800">{camp.delivered} / {camp.sent}</span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-100 rounded-none overflow-hidden">
                      <div className="h-full bg-stone-900 transition-all duration-500" style={{ width: `${delRate}%` }} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-stone-50 p-2.5 rounded-none border border-stone-200">
                        <div className="text-[10px] text-stone-500 font-semibold uppercase">Read rate</div>
                        <div className="text-xs font-bold text-stone-800 mt-0.5">{readRate}% <span className="text-[10px] text-stone-400 font-normal">({camp.read} read)</span></div>
                      </div>
                      <div className="bg-stone-50 p-2.5 rounded-none border border-stone-200">
                        <div className="text-[10px] text-stone-500 font-semibold uppercase">CTR rate</div>
                        <div className="text-xs font-bold text-stone-800 mt-0.5">{clickRate}% <span className="text-[10px] text-stone-400 font-normal">({camp.clicked} clicked)</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-stone-200 pt-4 flex justify-between items-center gap-2">
                    <span className="text-[10px] text-stone-400 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {camp.date}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedCampaignId(camp.id);
                          setReportInitialTab("setup");
                          setReportDrawerOpen(true);
                        }}
                        className="text-[10px] font-bold text-stone-600 bg-white border border-stone-300 hover:bg-stone-100 px-3 py-1.5 rounded-none flex items-center gap-1 transition-all cursor-pointer"
                        title="View read-only campaign setup"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Setup
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCampaignId(camp.id);
                          setReportInitialTab("analytics");
                          setReportDrawerOpen(true);
                        }}
                        className="text-[10px] font-bold text-stone-900 bg-stone-100 border border-stone-300 hover:bg-stone-200 px-3 py-1.5 rounded-none flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <BarChart4 className="w-3.5 h-3.5" />
                        View Analytics
                        <Maximize2 className="w-3 h-3 text-stone-500" />
                      </button>
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
        <div className="fixed inset-0 bg-black/40 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-none flex flex-col overflow-hidden animate-slide-up bg-white border border-stone-300">

            {/* Header */}
            <div className="p-6 border-b border-stone-200 flex items-center justify-between shrink-0 bg-stone-50">
              <h3 className="font-bold text-xs uppercase tracking-wider text-stone-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-stone-900" />
                Launch New WhatsApp Broadcast
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-none hover:bg-stone-200 text-stone-500 transition-colors border border-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLaunchCampaign} className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar max-h-[80vh]">

              {/* Campaign Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Black Friday discount drop"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-white text-stone-900 placeholder:text-stone-400 border border-stone-200 rounded-none py-2.5 px-4 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              {/* Broadcast Mode Toggle */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Broadcast Mode</label>
                <div className="flex gap-2 bg-stone-50 p-1 rounded-none border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setBroadcastMode("template")}
                    className={`flex-1 py-2 text-center text-[10px] font-bold rounded-none cursor-pointer transition-all ${
                      broadcastMode === "template" ? "bg-stone-950 text-white" : "text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    Template Broadcast
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastMode("session")}
                    className={`flex-1 py-2 text-center text-[10px] font-bold rounded-none cursor-pointer transition-all ${
                      broadcastMode === "session" ? "bg-stone-950 text-white" : "text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    Free-Form Session (24h window)
                  </button>
                </div>
                {broadcastMode === "session" && (
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-stone-700 font-semibold bg-stone-50 px-2.5 py-1.5 rounded-none border border-stone-200">
                    <span>No template needed — sends within 24h customer-initiated window.</span>
                  </div>
                )}
              </div>

              {/* Tag Targeting */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 flex justify-between">
                  <span>Target Audience segment</span>
                  <span className="text-[10px] text-stone-500 font-normal normal-case">Match: {targetAudienceSize} leads</span>
                </label>
                <select
                  value={selectedSegmentId}
                  onChange={(e) => setSelectedSegmentId(e.target.value)}
                  className="w-full bg-white text-stone-900 border border-stone-200 rounded-none py-2.5 px-4 text-xs font-semibold focus:outline-none focus:border-stone-900"
                >
                  <option value="all_contacts">All Contacts</option>
                  {segments.map((seg) => (
                    <option key={seg.id} value={seg.id}>{seg.name}</option>
                  ))}
                </select>
                {targetAudienceSize === 0 && (
                  <div className="text-[10px] text-stone-900 font-semibold flex items-center gap-1.5 mt-1 bg-stone-50 px-2.5 py-1.5 rounded-none border border-stone-300">
                    <AlertCircle className="w-3.5 h-3.5 text-stone-900" />
                    No active CRM contacts match this segment. Fired broadcasts will be sent to 0 users.
                  </div>
                )}
              </div>

              {/* Exclude Tag Targeting */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex justify-between">
                  <span>Exclude Audience segment</span>
                </label>
                <select
                  value={excludeTag}
                  onChange={(e) => setExcludeTag(e.target.value)}
                  className="w-full bg-white text-stone-900 border border-stone-200 rounded-none py-2.5 px-4 text-xs font-semibold focus:outline-none focus:border-stone-900"
                >
                  <option value="None">-- No Exclusion --</option>
                  {allUniqueTags.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              {broadcastMode === "template" ? (
                <>
                  {/* Approved Templates list */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex justify-between items-center">
                      <span>Pre-approved message template</span>
                      <button
                        type="button"
                        onClick={() => setIsCreateTemplateOpen(true)}
                        className="flex items-center gap-1 text-[10px] font-bold text-stone-900 hover:text-stone-600 transition-colors cursor-pointer normal-case tracking-normal"
                      >
                        <FilePlus2 className="w-3.5 h-3.5" />
                        New Template
                      </button>
                    </label>
                    {templates.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => setIsCreateTemplateOpen(true)}
                        className="w-full border border-dashed border-stone-300 bg-white py-3 px-4 text-xs text-stone-500 hover:border-stone-900 hover:text-stone-900 transition-colors cursor-pointer flex items-center justify-center gap-1.5 rounded-none"
                      >
                        <FilePlus2 className="w-4 h-4" />
                        No templates yet — create your first one
                      </button>
                    ) : (
                      <select
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="w-full bg-white text-stone-900 border border-stone-200 rounded-none py-2.5 px-4 text-xs font-semibold focus:outline-none focus:border-stone-900"
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.name}>{t.name} ({t.category})</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Dynamic Media Input */}
                  {activeTemplate && activeTemplate.mediaType && activeTemplate.mediaType !== "none" && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        {activeTemplate.mediaType} Media URL
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="url"
                          placeholder={`https://example.com/media.${activeTemplate.mediaType === 'image' ? 'jpg' : 'mp4'}`}
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          className="flex-1 bg-white text-stone-900 placeholder:text-stone-400 border border-stone-200 rounded-none py-2 px-3 text-xs focus:outline-none focus:border-stone-900"
                        />
                        <UploadButton
                          endpoint="mediaUploader"
                          onClientUploadComplete={(res) => {
                            if (res && res[0]) {
                              setMediaUrl(res[0].url);
                              notify.success("Upload complete", "Your media is attached and ready to send.");
                            }
                          }}
                          onUploadError={(error: Error) => {
                            notify.error("Upload failed", error.message);
                          }}
                          appearance={{
                            button: "bg-stone-900 hover:bg-stone-850 text-white rounded-none text-xs font-bold px-3 py-2 cursor-pointer h-9 shrink-0 flex items-center justify-center border border-stone-900 transition-all",
                            allowedContent: "hidden"
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Dynamic Variables Mapping Form */}
                  {activeTemplate && Object.keys(variablesMapping).length > 0 && (
                    <div className="bg-stone-50 p-4 rounded-none border border-stone-200 space-y-4">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                        <Settings2 className="w-4 h-4 text-stone-900" />
                        Template Parameter Mappings
                      </h5>

                      <div className="space-y-3">
                        {Object.keys(variablesMapping).map((variable) => {
                          const current = variablesMapping[variable];

                          return (
                            <div key={variable} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-white p-3 rounded-none border border-stone-200">
                              <div className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
                                <span className="bg-stone-100 text-stone-800 text-[10px] px-1.5 py-0.5 rounded-none border border-stone-300">
                                  {variable}
                                </span>
                                Parameter
                              </div>

                              <div>
                                <select
                                  value={current.type}
                                  onChange={(e) => {
                                    const nextType = e.target.value as "contact_field" | "static";
                                    setVariablesMapping((prev) => ({
                                      ...prev,
                                      [variable]: {
                                        type: nextType,
                                        value: nextType === "contact_field" ? "name" : ""
                                      }
                                    }));
                                  }}
                                  className="w-full bg-white text-stone-900 border border-stone-200 rounded-none p-1.5 text-[11px] focus:outline-none"
                                >
                                  <option value="contact_field">CRM Contact Field</option>
                                  <option value="static">Static Custom Text</option>
                                </select>
                              </div>

                              <div>
                                {current.type === "contact_field" ? (
                                  <select
                                    value={current.value}
                                    onChange={(e) => {
                                      setVariablesMapping((prev) => ({
                                        ...prev,
                                        [variable]: { type: "contact_field", value: e.target.value }
                                      }));
                                    }}
                                    className="w-full bg-white text-stone-900 border border-stone-200 rounded-none p-1.5 text-[11px] focus:outline-none"
                                  >
                                    <option value="name">Contact Name (name)</option>
                                    <option value="email">Contact Email (email)</option>
                                    <option value="phone">Contact Phone (phone)</option>
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Enter custom text..."
                                    required
                                    value={current.value}
                                    onChange={(e) => {
                                      setVariablesMapping((prev) => ({
                                        ...prev,
                                        [variable]: { type: "static", value: e.target.value }
                                      }));
                                    }}
                                    className="w-full bg-white text-stone-900 placeholder:text-stone-400 border border-stone-200 rounded-none p-1.5 text-[11px] focus:outline-none"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Template Body Live Preview */}
                  {activeTemplate && (
                    <div className="bg-stone-50 p-4 rounded-none border border-stone-200 space-y-3">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-stone-600" />
                        Interactive Mapped Preview
                      </h5>
                      <div className="bg-white border border-stone-200 rounded-none p-3.5 text-xs text-stone-700 leading-relaxed max-w-[95%]">
                        {activeTemplate.mediaType && activeTemplate.mediaType !== "none" && (
                          <div className="mb-2 px-2.5 py-1 rounded-none bg-stone-100 text-[10px] text-stone-800 font-bold uppercase inline-flex items-center gap-1.5 select-none leading-none border border-stone-300">
                            <span>{activeTemplate.mediaType} Media Header</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap select-none font-medium">
                          {compileLivePreview()}
                        </p>
                        {activeTemplate.buttons && activeTemplate.buttons.length > 0 && (
                          <div className="mt-3.5 border-t border-stone-200 pt-2.5 space-y-1 text-center font-bold text-stone-900">
                            {activeTemplate.buttons.map((btn, idx) => (
                              <div key={idx} className="py-1 bg-stone-50 rounded-none border border-stone-300 text-[11px] mb-1">
                                {btn}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Session Broadcast Text */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Free-Form Message</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Write your message here — no template needed. Only contacts active in the last 24 hours will receive it."
                      value={sessionText}
                      onChange={(e) => setSessionText(e.target.value)}
                      className="w-full bg-white text-stone-900 placeholder:text-stone-400 border border-stone-200 rounded-none py-2.5 px-4 text-xs focus:outline-none focus:border-stone-900 resize-none"
                    />
                    <div className="flex items-start gap-2 bg-stone-50 border border-stone-200 rounded-none p-3 text-[10px] text-stone-700 leading-relaxed font-semibold">
                      <span>📱 Only contacts who messaged in the last 24h will receive this. No Meta template approval needed.</span>
                    </div>
                  </div>
                </>
              )}

              {/* Scheduling and Delay Controls */}
              <div className="border border-stone-200 rounded-none p-4 bg-stone-50 space-y-4">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5 border-b border-stone-200 pb-2">
                  <Sliders className="w-4 h-4 text-stone-900" />
                  Advanced Delivery Controls
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Immediate vs Scheduled Run Mode */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-stone-600">Launch Timeline</label>
                    <div className="flex gap-2 bg-white p-1 rounded-none border border-stone-200">
                      <button
                        type="button"
                        onClick={() => setRunMode("immediate")}
                        className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-none cursor-pointer transition-all ${
                          runMode === "immediate" ? "bg-stone-950 text-white" : "text-stone-500 hover:text-stone-900"
                        }`}
                      >
                        Send Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setRunMode("scheduled")}
                        className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-none cursor-pointer transition-all ${
                          runMode === "scheduled" ? "bg-stone-950 text-white" : "text-stone-500 hover:text-stone-900"
                        }`}
                      >
                        Schedule Later
                      </button>
                    </div>
                  </div>

                  {/* Delay Spacing Parameter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-stone-600 flex justify-between">
                      <span>Anti-Spam Spacing Delay</span>
                      <span className="text-stone-900 font-bold">{sendDelay}s / msg</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={sendDelay}
                      onChange={(e) => setSendDelay(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-stone-200 rounded-none appearance-none cursor-pointer accent-stone-950"
                    />
                  </div>
                </div>

                {/* Conditional Scheduled inputs */}
                {runMode === "scheduled" && (
                  <div className="grid grid-cols-2 gap-3 pt-2 animate-slide-up">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-stone-600">Target Date</label>
                      <input
                        type="date"
                        required
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full bg-white text-stone-900 border border-stone-200 rounded-none p-2 text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-stone-600">Target Time</label>
                      <input
                        type="time"
                        required
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full bg-white text-stone-900 border border-stone-200 rounded-none p-2 text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>
                )}
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
                  disabled={targetAudienceSize === 0 || !campaignName.trim()}
                  className="px-4 py-2 bg-stone-950 hover:bg-stone-900 border border-stone-950 disabled:opacity-40 disabled:hover:bg-stone-950 text-white font-bold text-xs rounded-none cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  {runMode === "scheduled" ? "SCHEDULE BROADCAST TRIGGER" : "LAUNCH LIVE BROADCAST"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics Slide-over Report Drawer */}
      <CampaignReportDrawer
        isOpen={reportDrawerOpen}
        onClose={() => {
          setReportDrawerOpen(false);
          setSelectedCampaignId(null);
        }}
        campaign={activeReportCampaign}
        contacts={contacts}
        systemLogs={systemLogs}
        templates={templates}
        initialTab={reportInitialTab}
      />

      {/* AI Campaign Strategist Modal */}
      {isStrategistOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-none flex flex-col overflow-hidden bg-white border border-stone-300 shadow-2xl h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-stone-200 flex items-center justify-between shrink-0 bg-[#fafaf9]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-stone-950">
                  AI Campaign Strategist & Copywriter
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsStrategistOpen(false);
                  setStrategistStrategy(null);
                  setStrategistError("");
                }}
                className="p-1 rounded-none hover:bg-stone-200 text-stone-500 transition-colors border border-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

              {!strategistStrategy ? (
                /* Prompt State */
                <div className="max-w-xl mx-auto py-12 space-y-6 text-center">
                  <div className="space-y-2">
                    <h4 className="text-lg font-light text-stone-950 uppercase tracking-wide">
                      What are you selling / promoting?
                    </h4>
                    <p className="text-xs text-stone-500">
                      WappFlow AI will draft a complete marketing template, target segment, broadcast schedule, and a 3-step follow-up drip sequence.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <textarea
                      placeholder="e.g. It's Diwali, I sell handwoven Banarasi sarees. Give a 15% discount code DIWALI15 to past buyers."
                      value={strategistPrompt}
                      onChange={(e) => setStrategistPrompt(e.target.value)}
                      className="w-full bg-[#fafaf9] border border-stone-200 rounded-none p-4 text-xs font-semibold focus:outline-none focus:border-stone-950 resize-none min-h-[120px] text-stone-850 placeholder:text-stone-400 focus:bg-white transition-all shadow-inner"
                      disabled={isGeneratingStrategy}
                    />

                    {strategistError && (
                      <div className="p-4 bg-red-50 text-red-600 rounded-none text-xs border border-red-150 font-semibold text-left">
                        {strategistError}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isGeneratingStrategy || !strategistPrompt.trim()}
                      onClick={() => handleGenerateStrategy(strategistPrompt)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold text-xs rounded-none cursor-pointer flex items-center justify-center gap-2 border border-emerald-600 transition-all shadow-md shadow-emerald-600/20"
                    >
                      {isGeneratingStrategy ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>{loadingStepText}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>GENERATE CAMPAIGN STRATEGY</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Strategy Review Deck */
                <div className="space-y-6">

                  {/* Meta Signup / WABA warning */}
                  {!organization?.whatsappConnected && (
                    <div className="bg-red-50 border border-red-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-red-700 flex items-center gap-1.5 uppercase">
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                          WhatsApp Business Account is not Connected
                        </span>
                        <p className="text-[11px] text-red-600">
                          Active broadcast launches require Meta connection. You can connect directly below or launch as local mock.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={launchEmbeddedSignup}
                        disabled={connectingWaba}
                        className="bg-[#1877F2] hover:bg-[#166FE5] text-white font-extrabold text-[10px] uppercase py-2 px-3 tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        {connectingWaba ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Connect with Facebook
                      </button>
                    </div>
                  )}

                  {/* Template Approval Status Notice */}
                  {strategistStrategy.templateExists ? (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 rounded-none shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-emerald-800 uppercase block">
                          Approved Template Matched
                        </span>
                        <p className="text-[11px] text-emerald-700 leading-relaxed font-semibold">
                          An approved template named <strong className="text-emerald-950 font-bold">"{strategistStrategy.template.name}"</strong> fits your objective.
                          WappFlow will reuse this template, so no new Meta registration is needed and you can launch immediately!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-250 p-4 flex items-start gap-3 rounded-none shadow-sm">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-amber-800 uppercase block">
                          No Matching Approved Template Found
                        </span>
                        <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
                          No suitable approved template was found in your library for this objective.
                          To launch this strategy, WappFlow will submit the proposed template <strong className="text-amber-950 font-bold">"{strategistStrategy.template.name}"</strong> to Meta for approval.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                    {/* LEFT COLUMN: Template and Segment */}
                    <div className="space-y-6">

                      {/* Draft Template Card */}
                      <div className="bg-stone-50 border border-stone-200 p-5 rounded-none space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-900 flex justify-between border-b border-stone-200 pb-2">
                          <span>1. Draft Template Payload</span>
                          <span className="text-[9px] text-stone-400 lowercase">{strategistStrategy.template.category}</span>
                        </h4>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-stone-400 uppercase">Template Name</label>
                            <input
                              type="text"
                              value={strategistStrategy.template.name}
                              onChange={(e) => setStrategistStrategy({
                                ...strategistStrategy,
                                template: { ...strategistStrategy.template, name: e.target.value }
                              })}
                              className="w-full bg-white border border-stone-200 rounded-none py-2 px-3 text-xs focus:outline-none focus:border-stone-950 font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-stone-400 uppercase">Message Body</label>
                            <textarea
                              rows={5}
                              value={strategistStrategy.template.body}
                              onChange={(e) => setStrategistStrategy({
                                ...strategistStrategy,
                                template: { ...strategistStrategy.template, body: e.target.value }
                              })}
                              className="w-full bg-white border border-stone-200 rounded-none p-3 text-xs focus:outline-none focus:border-stone-950 resize-none font-medium leading-relaxed text-stone-800"
                            />
                          </div>

                          {strategistStrategy.template.buttons && (
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-stone-400 uppercase">Call-to-Action Buttons</label>
                              <div className="flex flex-wrap gap-2">
                                {strategistStrategy.template.buttons.map((btn: string, bIdx: number) => (
                                  <input
                                    key={bIdx}
                                    type="text"
                                    value={btn}
                                    onChange={(e) => {
                                      const nextBtns = [...strategistStrategy.template.buttons];
                                      nextBtns[bIdx] = e.target.value;
                                      setStrategistStrategy({
                                        ...strategistStrategy,
                                        template: { ...strategistStrategy.template, buttons: nextBtns }
                                      });
                                    }}
                                    className="bg-white border border-stone-200 rounded-none py-1.5 px-3 text-[10px] focus:outline-none focus:border-stone-950 font-bold text-stone-700"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Target Audience Segment Card */}
                      <div className="bg-stone-50 border border-stone-200 p-5 rounded-none space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-900 border-b border-stone-200 pb-2">
                          2. Target Audience Segment
                        </h4>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-stone-400 uppercase">Segment Name</label>
                            <input
                              type="text"
                              value={strategistStrategy.segment.name}
                              onChange={(e) => setStrategistStrategy({
                                ...strategistStrategy,
                                segment: { ...strategistStrategy.segment, name: e.target.value }
                              })}
                              className="w-full bg-white border border-stone-200 rounded-none py-2 px-3 text-xs focus:outline-none focus:border-stone-950 font-bold text-stone-850"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-stone-400 uppercase">Segment Filtering Rules</label>
                            <div className="space-y-2">
                              {strategistStrategy.segment.rules.all?.map((rule: any, rIdx: number) => (
                                <div key={rIdx} className="bg-white border border-stone-200 p-3 flex justify-between items-center text-xs">
                                  <span className="font-semibold text-stone-600">
                                    Target contacts where <strong className="text-stone-900 uppercase">{rule.field}</strong> is <strong className="text-stone-900 uppercase">{rule.op}</strong>
                                  </span>
                                  <input
                                    type="text"
                                    value={rule.value}
                                    onChange={(e) => {
                                      const nextRules = { ...strategistStrategy.segment.rules };
                                      nextRules.all[rIdx].value = e.target.value;
                                      setStrategistStrategy({
                                        ...strategistStrategy,
                                        segment: { ...strategistStrategy.segment, rules: nextRules }
                                      });
                                    }}
                                    className="bg-stone-50 border border-stone-200 rounded-none p-1.5 text-[11px] text-right font-bold w-28 focus:outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* RIGHT COLUMN: Schedule & Sequence */}
                    <div className="space-y-6">

                      {/* Schedule Settings */}
                      <div className="bg-stone-50 border border-stone-200 p-5 rounded-none space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-900 border-b border-stone-200 pb-2">
                          3. Launch Schedule
                        </h4>

                        <div className="space-y-3">
                          <p className="text-[11px] text-stone-600 leading-relaxed font-semibold italic bg-white p-3 border border-stone-200/50">
                            💡 AI Reasoning: {strategistStrategy.schedule.reasoning}
                          </p>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-stone-400 uppercase">Target DateTime</label>
                              <input
                                type="datetime-local"
                                value={strategistStrategy.schedule.scheduledAt ? strategistStrategy.schedule.scheduledAt.substring(0, 16) : ""}
                                onChange={(e) => setStrategistStrategy({
                                  ...strategistStrategy,
                                  schedule: { ...strategistStrategy.schedule, scheduledAt: new Date(e.target.value).toISOString() }
                                })}
                                className="w-full bg-white border border-stone-200 rounded-none py-2 px-3 text-xs focus:outline-none focus:border-stone-950 font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-stone-400 uppercase">Spam Delay (s)</label>
                              <input
                                type="number"
                                min="1"
                                max="5"
                                value={strategistStrategy.schedule.delay}
                                onChange={(e) => setStrategistStrategy({
                                  ...strategistStrategy,
                                  schedule: { ...strategistStrategy.schedule, delay: parseInt(e.target.value) }
                                })}
                                className="w-full bg-white border border-stone-200 rounded-none py-2 px-3 text-xs focus:outline-none focus:border-stone-950 font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3-Step Follow-Up Sequence */}
                      <div className="bg-stone-50 border border-stone-200 p-5 rounded-none space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-900 border-b border-stone-200 pb-2">
                          4. 3-Step Drip Follow-Up Sequence
                        </h4>

                        <div className="space-y-3">
                          {strategistStrategy.sequence.steps.map((step: any, sIdx: number) => (
                            <div key={sIdx} className="bg-white border border-stone-200 p-4 space-y-2 relative">
                              <div className="flex justify-between items-center">
                                <span className="bg-stone-950 text-white font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                  Step {sIdx + 1}
                                </span>
                                <div className="text-[10px] font-bold text-stone-500">
                                  Delay: {step.delayMinutes === 0 ? "Immediate" : step.delayMinutes < 60 ? `${step.delayMinutes}m` : `${Math.round(step.delayMinutes / 60)}h`}
                                </div>
                              </div>

                              <textarea
                                rows={2}
                                value={step.message}
                                onChange={(e) => {
                                  const nextSteps = [...strategistStrategy.sequence.steps];
                                  nextSteps[sIdx].message = e.target.value;
                                  setStrategistStrategy({
                                    ...strategistStrategy,
                                    sequence: { ...strategistStrategy.sequence, steps: nextSteps }
                                  });
                                }}
                                className="w-full bg-stone-50 border border-stone-200 rounded-none p-2 text-xs focus:outline-none focus:border-stone-950 resize-none font-semibold text-stone-700"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-stone-200 flex justify-between items-center shrink-0 bg-[#fafaf9] select-none">
              <div>
                {strategistStrategy && (
                  <button
                    type="button"
                    onClick={() => setStrategistStrategy(null)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold text-xs rounded-none cursor-pointer border border-stone-300"
                  >
                    Start Over
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsStrategistOpen(false);
                    setStrategistStrategy(null);
                    setStrategistError("");
                  }}
                  className="px-4 py-2 bg-white hover:bg-stone-50 text-stone-600 font-semibold text-xs rounded-none cursor-pointer border border-stone-200"
                >
                  Cancel
                </button>

                {strategistStrategy && (
                  <button
                    type="button"
                    disabled={isApplyingStrategy || !organization?.whatsappConnected}
                    onClick={async () => {
                      setIsApplyingStrategy(true);
                      setStrategistError("");
                      try {
                        const res = await fetch("/api/ai/campaign-strategist", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "apply",
                            orgId,
                            template: strategistStrategy.template,
                            segment: strategistStrategy.segment,
                            schedule: strategistStrategy.schedule,
                            sequence: strategistStrategy.sequence
                          })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Failed to apply strategy");

                        if (data.templateApproved) {
                          notify.success(
                            "Strategy applied",
                            `Your campaign is live${typeof data.enrolledCount === "number" ? ` — ${data.enrolledCount} contact(s) enrolled` : ""}. Check Campaigns and workflows.`
                          );
                        } else {
                          notify.success(
                            "Template submitted to Meta",
                            "Your campaign is queued — it will broadcast automatically the moment Meta approves the new template."
                          );
                        }
                        setIsStrategistOpen(false);
                        setStrategistStrategy(null);
                        if (orgId) await refreshWorkspace(orgId);
                      } catch (err: any) {
                        notify.error("Couldn't apply strategy", err.message || "Something went wrong. Please try again.");
                      } finally {
                        setIsApplyingStrategy(false);
                      }
                    }}
                    className="px-5 py-2 bg-stone-950 hover:bg-stone-900 border border-stone-950 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-none cursor-pointer flex items-center gap-1.5 transition-all shadow-md"
                  >
                    {isApplyingStrategy ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {strategistStrategy.templateExists ? "Applying Strategy..." : "Registering Template..."}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {strategistStrategy.templateExists ? "Approve & Launch Strategy" : "Approve & Register New Template"}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Consolidated "create" action — build a template without leaving the
          campaign builder. On success we select it and refresh the workspace. */}
      <CreateTemplateModal
        isOpen={isCreateTemplateOpen}
        onClose={() => setIsCreateTemplateOpen(false)}
        orgId={orgId}
        onCreated={(name) => {
          setBroadcastMode("template");
          setTemplateName(name);
          if (orgId) refreshWorkspace(orgId);
        }}
      />

    </div>
  );
};
