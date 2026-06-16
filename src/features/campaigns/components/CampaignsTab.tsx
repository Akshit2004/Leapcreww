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
  ChevronDown,
} from "lucide-react";
import { useApp } from "@/shared/context/AppContext";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { notify } from "@/shared/lib/toast";
import { useConfirm } from "@/shared/components/ui/ConfirmDialog";
import { CampaignReportDrawer } from "./CampaignReportDrawer";
import { CreateTemplateModal } from "@/features/templates/components/CreateTemplateModal";
import { UploadButton } from "@/shared/lib/uploadthing";
import { SegmentRules, evaluateSegmentRules } from "@/shared/lib/segmentMatch";
import { LeadQualifierWizard } from "./LeadQualifierWizard";
import type { LeadQualifierConfig } from "@/features/campaigns/lib/leadQualifier";

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

  // Quick Action FAB
  useEffect(() => {
    const handler = () => setIsModalOpen(true);
    window.addEventListener("leapcreww:quickaction", handler);
    return () => window.removeEventListener("leapcreww:quickaction", handler);
  }, []);
  const [isStrategistOpen, setIsStrategistOpen] = useState(false);
  const [strategistPrompt, setStrategistPrompt] = useState("");
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [strategistStrategy, setStrategistStrategy] = useState<any>(null);
  const [strategistError, setStrategistError] = useState("");
  const [connectingWaba, setConnectingWaba] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState("Analyzing market positioning...");
  const [isApplyingStrategy, setIsApplyingStrategy] = useState(false);
  const [strategistQualifier, setStrategistQualifier] = useState<LeadQualifierConfig | null>(null);
  const [qualifierEnabled, setQualifierEnabled] = useState(true);
  const [sequenceEnabled, setSequenceEnabled] = useState(true);
  const [isGeneratingQualifier, setIsGeneratingQualifier] = useState(false);
  const [chatEditSection, setChatEditSection] = useState<"template" | "audience" | "schedule" | "sequence" | "qualifier" | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [strategistResult, setStrategistResult] = useState<{
    templateApproved: boolean;
    templateName: string;
    templateBody: string;
    enrolledCount: number;
    scheduledAt: string | null;
    steps: Array<{ delayMinutes: number; message: string }>;
  } | null>(null);

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
  const [qualifierConfig, setQualifierConfig] = useState<LeadQualifierConfig | null>(null);
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

      // Fire qualifier generation without blocking — populates section 5 while user reads sections 1–4
      setStrategistQualifier(null);
      setQualifierEnabled(true);
      setSequenceEnabled(true);
      setIsGeneratingQualifier(true);
      fetch("/api/ai/lead-qualifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateBody: data.strategy.template.body,
          templateName: data.strategy.template.name,
          orgId,
        }),
      })
        .then(async (r) => {
          const d = await r.json();
          if (r.ok && d.config) setStrategistQualifier(d.config);
          // else: qualifier stays null, UI shows retry button
        })
        .catch(() => { /* network error — retry button handles it */ })
        .finally(() => setIsGeneratingQualifier(false));
    } catch (err: any) {
      setStrategistError(err.message || "An unexpected error occurred.");
    } finally {
      clearInterval(stepInterval);
      setIsGeneratingStrategy(false);
    }
  }, [orgId]);

  // Manual qualifier (re)generation — called from the retry button in the chat UI
  const generateQualifier = useCallback(async () => {
    if (!orgId || !strategistStrategy) return;
    setIsGeneratingQualifier(true);
    setStrategistQualifier(null);
    try {
      const r = await fetch("/api/ai/lead-qualifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateBody: strategistStrategy.template.body,
          templateName: strategistStrategy.template.name,
          orgId,
        }),
      });
      const d = await r.json();
      if (r.ok && d.config) setStrategistQualifier(d.config);
    } catch { /* ignore */ }
    finally { setIsGeneratingQualifier(false); }
  }, [orgId, strategistStrategy]);

  // Dashboard "Done-For-You" copilot hands off here via ?tab=campaigns&goal=...
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

  // Recipe "Launch Campaign →" hands off here via ?tab=campaigns&launchTemplate=<name>
  const launchTemplateHandledRef = useRef(false);
  useEffect(() => {
    const tpl = (searchParams.get("launchTemplate") || "").trim();
    if (!tpl || !orgId || launchTemplateHandledRef.current) return;
    launchTemplateHandledRef.current = true;
    setBroadcastMode("template");
    setTemplateName(tpl);
    setIsModalOpen(true);
    router.replace(`${pathname}?tab=campaigns`, { scroll: false });
  }, [searchParams, orgId, pathname, router]);

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
        leadQualifier: qualifierConfig ?? undefined,
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
    setQualifierConfig(null);
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

  const formatName = (name: string) =>
    name.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();

  const STATUS_CHIP_STYLE: Record<string, { cls: string; icon: React.ElementType }> = {
    Completed:       { cls: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle },
    Sending:         { cls: "text-amber-700 bg-amber-50 border-amber-200",       icon: PlayCircle },
    Active:          { cls: "text-amber-700 bg-amber-50 border-amber-200",       icon: PlayCircle },
    Scheduled:       { cls: "text-blue-700 bg-blue-50 border-blue-200",          icon: Calendar },
    PendingTemplate: { cls: "text-amber-700 bg-amber-50 border-amber-200",       icon: Clock },
    Failed:          { cls: "text-red-700 bg-red-50 border-red-200",             icon: AlertCircle },
  };

  const getStatusChip = (status: string) => {
    const cfg = STATUS_CHIP_STYLE[status] ?? { cls: "text-stone-500 bg-stone-100 border-stone-200", icon: Clock };
    const Icon = cfg.icon;
    const label = status === "PendingTemplate" ? "Awaiting Approval" : status === "Active" ? "Sending" : status;
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 border rounded-full ${cfg.cls}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
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
    <div className="flex-1 overflow-y-auto custom-scrollbar animate-slide-up bg-stone-100">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 sm:px-8">
        <div className="flex items-center justify-between py-4 gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-tight text-stone-900">Campaigns & Broadcasts</h2>
            <p className="text-stone-500 text-xs mt-0.5">Broadcast WhatsApp templates · track delivery & click metrics</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setIsStrategistOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 border border-stone-200 bg-white text-stone-700 hover:border-wa-green hover:text-wa-green rounded-lg transition-all cursor-pointer whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5" />
              AI Campaign Strategist
            </button>
            <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-wa-green hover:bg-wa-green-dark text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap">
              <Megaphone className="w-4 h-4" />
              Launch Broadcast
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 pb-3">
          {(["all", "Sending", "Completed", "Scheduled"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-wa-green text-white border-wa-green"
                  : "text-stone-500 border-stone-300 hover:border-stone-500 bg-white"
              }`}
            >
              {status === "all" ? "All" : status}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content grid ─────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-8 py-6">
        <h3 className="kc-label text-stone-500 mb-4">Recent Broadcast Activity</h3>

        {filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center rounded-none space-y-4 bg-white border border-stone-200 kc-float">
            <Send className="w-10 h-10 text-stone-300 mx-auto" />
            {campaigns.length === 0 ? (
              <>
                <div>
                  <h4 className="font-black text-stone-900 uppercase text-xs mb-1">No campaigns yet</h4>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">Send your first broadcast to see live delivery metrics and ROI tracking here.</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="ds-btn ds-btn-primary ds-btn-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  Create First Campaign
                </button>
              </>
            ) : (
              <>
                <h4 className="font-bold text-stone-700 uppercase text-xs">No campaigns match this filter</h4>
                <p className="text-xs text-stone-500">Try a different status filter or clear the search.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((camp) => {
              const delRate = camp.sent > 0 ? Math.round((camp.delivered / camp.sent) * 100) : 0;
              const readRate = camp.delivered > 0 ? Math.round((camp.read / camp.delivered) * 100) : 0;
              const clickRate = camp.read > 0 ? Math.round((camp.clicked / camp.read) * 100) : 0;

              const accentColor =
                camp.status === "Sending" || camp.status === "Active" ? "#059669" :
                camp.status === "Completed" ? "#0891b2" :
                camp.status === "Scheduled" ? "#d97706" : "#9ca3af";

              return (
                <div key={camp.id} className="bg-white border border-stone-200 flex flex-col overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow">

                  {/* Colored top accent bar — matches status */}
                  <div className="h-1 shrink-0" style={{ background: accentColor }} />

                  {/* Card header — name + mono slug + delete */}
                  <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-stone-100">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-sm text-stone-900 leading-tight truncate">{formatName(camp.name)}</h4>
                      <p className="text-[10px] text-stone-400 font-mono mt-0.5 truncate">{camp.name}</p>
                    </div>
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
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Chips row — status + audience + fired (mirrors template chips row) */}
                  <div className="px-5 py-2.5 flex flex-wrap items-center gap-1.5 border-b border-stone-100">
                    {getStatusChip(camp.status)}
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
                      <Users className="w-3 h-3" />
                      {camp.segment ? (camp.segment as any).name : camp.targetTag}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
                      <TrendingUp className="w-3 h-3" />
                      {camp.sent} fired
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono ml-auto">
                      {camp.templateName}
                    </span>
                  </div>

                  {/* Delivery funnel — compact */}
                  <div className="px-5 py-3.5 flex-1">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-stone-500 font-medium">Delivery Rate</span>
                      <span className="font-black text-stone-800">{delRate}% <span className="font-normal text-stone-400">({camp.delivered}/{camp.sent})</span></span>
                    </div>
                    <div className="h-1 w-full bg-stone-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${delRate}%`, background: accentColor }} />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Read</span>
                        <span className="text-[11px] font-black text-stone-700">{readRate}% <span className="text-[10px] text-stone-400 font-normal">({camp.read})</span></span>
                      </div>
                      <div className="w-px h-3 bg-stone-200" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">CTR</span>
                        <span className="text-[11px] font-black text-stone-700">{clickRate}% <span className="text-[10px] text-stone-400 font-normal">({camp.clicked})</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 pb-3.5 pt-2.5 border-t border-stone-100 flex justify-between items-center gap-2">
                    <span className="text-[10px] text-stone-400 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {camp.date}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedCampaignId(camp.id);
                          setReportInitialTab("setup");
                          setReportDrawerOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 border border-stone-200 bg-white text-stone-600 hover:border-wa-green hover:text-wa-green rounded-lg transition-all cursor-pointer whitespace-nowrap"
                        title="View read-only campaign setup"
                      >
                        <Eye className="w-3 h-3" />
                        Setup
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCampaignId(camp.id);
                          setReportInitialTab("analytics");
                          setReportDrawerOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 border border-stone-200 bg-white text-stone-600 hover:border-wa-green hover:text-wa-green rounded-lg transition-all cursor-pointer whitespace-nowrap"
                      >
                        <BarChart4 className="w-3 h-3" />
                        Analytics
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>{/* end content grid */}

      {/* Launch Campaign Wizard Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-xl rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden animate-slide-up bg-white shadow-2xl border border-stone-200">

            {/* Header */}
            <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-base text-stone-900 tracking-tight">Launch Broadcast</h3>
                <p className="text-[11px] text-stone-400 mt-0.5">Configure and send a WhatsApp campaign</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLaunchCampaign} className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar max-h-[80vh]">

              {/* Campaign Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Black Friday discount drop"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-wa-green transition-colors"
                />
              </div>

              {/* Broadcast Mode Toggle */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Broadcast Mode</label>
                <div className="flex gap-1.5 bg-stone-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setBroadcastMode("template")}
                    className={`flex-1 py-2 text-center text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                      broadcastMode === "template" ? "bg-wa-green text-white shadow-sm" : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    Template Broadcast
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastMode("session")}
                    className={`flex-1 py-2 text-center text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                      broadcastMode === "session" ? "bg-wa-green text-white shadow-sm" : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    Free-Form (24h window)
                  </button>
                </div>
                {broadcastMode === "session" && (
                  <p className="text-[11px] text-stone-500 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 mt-1">
                    No template needed — sends within 24h customer-initiated window.
                  </p>
                )}
              </div>

              {/* Audience section */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Audience
                </p>

                {/* Target Audience */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-stone-600">Target Segment</label>
                    <span className="text-[10px] font-bold text-wa-green-dark bg-wa-green/10 border border-wa-green/20 px-2 py-0.5 rounded-full">
                      {targetAudienceSize} leads matched
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      value={selectedSegmentId}
                      onChange={(e) => setSelectedSegmentId(e.target.value)}
                      className="w-full appearance-none bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-wa-green transition-colors cursor-pointer pr-9"
                    >
                      <option value="all_contacts">All Contacts</option>
                      {segments.map((seg) => (
                        <option key={seg.id} value={seg.id}>{seg.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {targetAudienceSize === 0 && (
                    <div className="text-[11px] text-amber-700 font-semibold flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      No contacts match this segment — broadcast will fire to 0 users.
                    </div>
                  )}
                </div>

                {/* Exclude Audience */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-stone-600">Exclude Tag</label>
                  <div className="relative">
                    <select
                      value={excludeTag}
                      onChange={(e) => setExcludeTag(e.target.value)}
                      className="w-full appearance-none bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-wa-green transition-colors cursor-pointer pr-9"
                    >
                      <option value="None">No exclusion</option>
                      {allUniqueTags.map((tag) => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {broadcastMode === "template" ? (
                <>
                  {/* Template selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Template</label>
                      <button
                        type="button"
                        onClick={() => setIsCreateTemplateOpen(true)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-wa-green hover:text-wa-green-dark transition-colors cursor-pointer"
                      >
                        <FilePlus2 className="w-3.5 h-3.5" />
                        New Template
                      </button>
                    </div>
                    {templates.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => setIsCreateTemplateOpen(true)}
                        className="w-full border-2 border-dashed border-stone-200 bg-stone-50 hover:border-wa-green hover:bg-wa-green/5 py-4 px-4 text-xs text-stone-400 hover:text-wa-green transition-colors cursor-pointer flex items-center justify-center gap-1.5 rounded-xl"
                      >
                        <FilePlus2 className="w-4 h-4" />
                        No templates yet — create your first
                      </button>
                    ) : (
                      <div className="relative">
                        <select
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          className="w-full appearance-none bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-wa-green transition-colors cursor-pointer pr-9"
                        >
                          {templates.map((t) => (
                            <option key={t.id} value={t.name}>{formatName(t.name)} ({t.category})</option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  {/* Dynamic Media Input */}
                  {activeTemplate && activeTemplate.mediaType && activeTemplate.mediaType !== "none" && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        {activeTemplate.mediaType} Media URL
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="url"
                          placeholder={`https://example.com/media.${activeTemplate.mediaType === 'image' ? 'jpg' : 'mp4'}`}
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-wa-green transition-colors flex-1"
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
                            button: "bg-wa-green hover:bg-wa-green-dark text-white rounded-xl text-xs font-bold px-4 py-2.5 cursor-pointer shrink-0 flex items-center justify-center border-0 transition-all",
                            allowedContent: "hidden"
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Parameter Mappings */}
                  {activeTemplate && Object.keys(variablesMapping).length > 0 && (
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                        <Settings2 className="w-3.5 h-3.5" />
                        Template Variables
                      </h5>
                      <div className="space-y-2.5">
                        {Object.keys(variablesMapping).map((variable) => {
                          const current = variablesMapping[variable];
                          return (
                            <div key={variable} className="bg-white border border-stone-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                              <div className="flex items-center gap-2">
                                <span className="bg-stone-900 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                                  {variable}
                                </span>
                              </div>
                              <div className="relative">
                                <select
                                  value={current.type}
                                  onChange={(e) => {
                                    const nextType = e.target.value as "contact_field" | "static";
                                    setVariablesMapping((prev) => ({
                                      ...prev,
                                      [variable]: { type: nextType, value: nextType === "contact_field" ? "name" : "" }
                                    }));
                                  }}
                                  className="w-full appearance-none bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-[11px] text-stone-800 focus:outline-none focus:border-wa-green cursor-pointer pr-7"
                                >
                                  <option value="contact_field">CRM Field</option>
                                  <option value="static">Custom Text</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                              <div className="relative">
                                {current.type === "contact_field" ? (
                                  <>
                                    <select
                                      value={current.value}
                                      onChange={(e) => setVariablesMapping((prev) => ({ ...prev, [variable]: { type: "contact_field", value: e.target.value } }))}
                                      className="w-full appearance-none bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-[11px] text-stone-800 focus:outline-none focus:border-wa-green cursor-pointer pr-7"
                                    >
                                      <option value="name">Contact Name</option>
                                      <option value="email">Email</option>
                                      <option value="phone">Phone</option>
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Custom value…"
                                    required
                                    value={current.value}
                                    onChange={(e) => setVariablesMapping((prev) => ({ ...prev, [variable]: { type: "static", value: e.target.value } }))}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-[11px] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-wa-green"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Live Preview */}
                  {activeTemplate && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> Live Preview
                      </label>
                      <div className="bg-[#e5ddd5] rounded-xl p-4">
                        <div className="bg-[#dcf8c6] rounded-xl rounded-tl-sm p-3.5 text-xs text-stone-800 leading-relaxed shadow-sm max-w-[90%]">
                          {activeTemplate.mediaType && activeTemplate.mediaType !== "none" && (
                            <div className="mb-2 inline-flex items-center gap-1 bg-white/60 text-stone-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-stone-200/50">
                              {activeTemplate.mediaType} header
                            </div>
                          )}
                          <p className="whitespace-pre-wrap font-medium">{compileLivePreview()}</p>
                          {activeTemplate.buttons && activeTemplate.buttons.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-stone-300/40 flex flex-wrap gap-1.5">
                              {activeTemplate.buttons.map((btn, idx) => (
                                <span key={idx} className="text-[11px] font-semibold border border-[#53bdeb] text-[#0a7abf] bg-white px-3 py-1 rounded-full">
                                  {btn}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Session Broadcast Text */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Free-Form Message</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Write your message — no template needed. Only contacts active in the last 24h will receive it."
                      value={sessionText}
                      onChange={(e) => setSessionText(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-xl py-2.5 px-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-wa-green resize-none transition-colors"
                    />
                    <p className="text-[11px] text-stone-500 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
                      Only contacts who messaged in the last 24h will receive this. No Meta approval needed.
                    </p>
                  </div>
                </>
              )}

              {/* Delivery Controls */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> Delivery
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-stone-600">Send timing</label>
                    <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-stone-200">
                      <button
                        type="button"
                        onClick={() => setRunMode("immediate")}
                        className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                          runMode === "immediate" ? "bg-wa-green text-white shadow-sm" : "text-stone-500 hover:text-stone-800"
                        }`}
                      >
                        Send Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setRunMode("scheduled")}
                        className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                          runMode === "scheduled" ? "bg-wa-green text-white shadow-sm" : "text-stone-500 hover:text-stone-800"
                        }`}
                      >
                        Schedule
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-stone-600">Anti-spam delay</label>
                      <span className="text-[11px] font-black text-wa-green-dark">{sendDelay}s / msg</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={sendDelay}
                      onChange={(e) => setSendDelay(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-stone-200 rounded-full appearance-none cursor-pointer accent-wa-green mt-3"
                    />
                  </div>
                </div>

                {runMode === "scheduled" && (
                  <div className="grid grid-cols-2 gap-3 pt-1 animate-slide-up">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-stone-600">Date</label>
                      <input
                        type="date"
                        required
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-wa-green transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-stone-600">Time</label>
                      <input
                        type="time"
                        required
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-wa-green transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Lead Qualifier Wizard — template mode only */}
              {broadcastMode === "template" && activeTemplate && (
                <LeadQualifierWizard
                  templateBody={activeTemplate.body}
                  templateName={templateName}
                  orgId={orgId}
                  onChange={setQualifierConfig}
                />
              )}

              {/* Footer CTA */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 border border-stone-200 bg-white text-stone-700 hover:border-stone-300 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={targetAudienceSize === 0 || !campaignName.trim()}
                  className="inline-flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 bg-wa-green hover:bg-wa-green-dark text-white rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {runMode === "scheduled" ? "Schedule Broadcast" : "Launch Broadcast"}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden bg-white border border-stone-200 shadow-2xl h-[92vh] sm:h-[90vh] animate-slide-up">
            {/* Header */}
            <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-7 h-7 rounded-lg bg-wa-green/10 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-wa-green" />
                  </div>
                  <h3 className="text-base font-black text-stone-900">AI Campaign Strategist</h3>
                </div>
                <p className="text-xs text-stone-500 mt-1">Generate a complete campaign — template, audience, schedule & drip sequence</p>
              </div>
              <button
                onClick={() => {
                  setIsStrategistOpen(false);
                  setStrategistStrategy(null);
                  setStrategistResult(null);
                  setStrategistQualifier(null);
                  setQualifierEnabled(true);
                  setSequenceEnabled(true);
                  setChatEditSection(null);
                  setShowTemplatePicker(false);
                  setStrategistError("");
                }}
                className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

              {strategistResult ? (
                /* Result Screen */
                <div className="max-w-xl mx-auto py-6 space-y-5">
                  {/* Hero */}
                  <div className="text-center space-y-2 pb-5 border-b border-stone-100">
                    <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-black text-stone-900 tracking-tight">Campaign Built!</h3>
                    <p className="text-sm text-stone-500 leading-relaxed max-w-xs mx-auto">
                      {strategistResult.templateApproved
                        ? "Your campaign is live. Contacts have been enrolled and will receive the broadcast."
                        : "Strategy saved. The campaign will launch automatically once Meta approves the template."}
                    </p>
                  </div>

                  {/* Stat cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Template</div>
                      <div className="font-black text-stone-900 text-sm leading-snug break-words">{strategistResult.templateName}</div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${strategistResult.templateApproved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                        {strategistResult.templateApproved ? "Approved & Live" : "Pending Meta Review"}
                      </span>
                    </div>

                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        {strategistResult.templateApproved ? "Enrolled" : "Queued"}
                      </div>
                      <div className="text-3xl font-black text-stone-900">{strategistResult.enrolledCount.toLocaleString()}</div>
                      <div className="text-xs text-stone-500">contacts</div>
                    </div>

                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Broadcast Time</div>
                      <div className="font-bold text-stone-900 text-sm">
                        {strategistResult.scheduledAt
                          ? new Date(strategistResult.scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                          : "Immediate"}
                      </div>
                    </div>

                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Follow-Up Drip</div>
                      <div className="text-3xl font-black text-stone-900">{strategistResult.steps.length}</div>
                      <div className="text-xs text-stone-500">automated steps</div>
                    </div>
                  </div>

                  {/* Message preview */}
                  <div className="bg-[#e5ddd5] rounded-xl p-4 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Message Preview</div>
                    <div className="bg-[#dcf8c6] rounded-xl rounded-tl-sm p-3.5 shadow-sm">
                      <p className="text-sm leading-relaxed text-stone-800 whitespace-pre-wrap">{strategistResult.templateBody}</p>
                    </div>
                  </div>

                  {/* Drip timeline */}
                  {strategistResult.steps.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Drip Sequence</div>
                      {strategistResult.steps.map((step, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <div className="w-6 h-6 bg-wa-green text-white text-[10px] font-black rounded-full flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <div className="flex-1 bg-stone-50 border border-stone-200 rounded-xl p-3">
                            <div className="text-[10px] font-bold text-stone-400 mb-1">
                              {step.delayMinutes === 0 ? "Immediate" : step.delayMinutes < 60 ? `After ${step.delayMinutes} min` : `After ${Math.round(step.delayMinutes / 60)}h`}
                            </div>
                            <p className="text-xs text-stone-700 leading-snug">
                              {step.message.length > 140 ? step.message.slice(0, 140) + "…" : step.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : !strategistStrategy ? (
                /* Prompt State */
                <div className="max-w-xl mx-auto py-10 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-wa-green/10 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-7 h-7 text-wa-green" />
                    </div>
                    <h4 className="text-xl font-black text-stone-900 tracking-tight">
                      What are you selling or promoting?
                    </h4>
                    <p className="text-sm text-stone-500 leading-relaxed max-w-sm mx-auto">
                      Describe your goal and the AI will generate a complete campaign — template, audience, schedule, and drip sequence.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <textarea
                      placeholder="e.g. It's Diwali, I sell handwoven Banarasi sarees. Give a 15% discount code DIWALI15 to past buyers."
                      value={strategistPrompt}
                      onChange={(e) => setStrategistPrompt(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm focus:outline-none focus:border-wa-green resize-none min-h-[120px] text-stone-800 placeholder:text-stone-400 focus:bg-white transition-all"
                      disabled={isGeneratingStrategy}
                    />

                    {strategistError && (
                      <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs border border-red-200 font-semibold text-left">
                        {strategistError}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isGeneratingStrategy || !strategistPrompt.trim()}
                      onClick={() => handleGenerateStrategy(strategistPrompt)}
                      className="w-full py-3 bg-wa-green hover:bg-wa-green-dark text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isGeneratingStrategy ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{loadingStepText}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate Campaign Strategy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Strategy Review — Immersive Chat Flow */
                <div className="max-w-lg mx-auto space-y-6 pb-6">

                  {/* User bubble */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-stone-950 text-white text-sm px-4 py-3 font-medium leading-relaxed" style={{borderRadius:"18px 18px 4px 18px"}}>
                      {strategistPrompt}
                    </div>
                  </div>

                  {/* AI: Status */}
                  <div className="flex gap-3 items-end">
                    <div className="w-9 h-9 bg-stone-950 flex items-center justify-center shrink-0 rounded-full border-2 border-stone-800">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className={`px-4 py-3 text-xs font-semibold leading-snug flex-1 ${strategistStrategy.templateExists ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`} style={{borderRadius:"18px 18px 18px 4px"}}>
                      {strategistStrategy.templateExists
                        ? <>✓ Matched your approved template <strong>&quot;{strategistStrategy.template.name}&quot;</strong> — no Meta review needed, launches immediately.</>
                        : <>Drafted <strong>&quot;{strategistStrategy.template.name}&quot;</strong> — will submit to Meta for approval. Review and edit below.</>}
                    </div>
                  </div>

                  {/* WA not connected */}
                  {!organization?.whatsappConnected && (
                    <div className="ml-12 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
                      <p className="text-[11px] text-red-700 font-bold">WhatsApp not connected — required to broadcast.</p>
                      <button type="button" onClick={launchEmbeddedSignup} disabled={connectingWaba}
                        className="bg-[#1877F2] text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50">
                        {connectingWaba ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Connect
                      </button>
                    </div>
                  )}

                  {/* ── TEMPLATE ── */}
                  <div className="flex gap-3 items-end">
                    <div className="w-9 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <p className="text-[10px] text-stone-400 font-semibold pl-1">Template · tap to edit</p>

                      {/* Template picker strip — when templateExists, offer switching */}
                      {strategistStrategy.templateExists && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-stone-500">Using:</span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 border border-emerald-200">{strategistStrategy.template.name}</span>
                          <button type="button" onClick={() => setShowTemplatePicker((v) => !v)}
                            className="text-[10px] text-stone-400 underline hover:text-stone-700 cursor-pointer">
                            {showTemplatePicker ? "hide" : "pick different ▾"}
                          </button>
                        </div>
                      )}

                      {showTemplatePicker && (
                        <div className="border border-stone-200 bg-white rounded-xl max-h-40 overflow-y-auto divide-y divide-stone-100">
                          {templates.filter(t => t.metaStatus === "approved").map(t => (
                            <button key={t.name} type="button"
                              onClick={() => { setStrategistStrategy({ ...strategistStrategy, template: { ...strategistStrategy.template, name: t.name, body: t.body, buttons: t.buttons || [] } }); setShowTemplatePicker(false); }}
                              className={`w-full text-left px-3 py-2 text-[11px] hover:bg-stone-50 cursor-pointer transition-colors ${strategistStrategy.template.name === t.name ? "bg-emerald-50 font-black text-emerald-800" : "text-stone-700 font-medium"}`}>
                              {t.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* WhatsApp message preview card */}
                      <div
                        onClick={() => setChatEditSection(s => s === "template" ? null : "template")}
                        className="bg-white border border-stone-200 overflow-hidden shadow-sm cursor-pointer hover:border-stone-400 transition-colors rounded-xl">
                        {/* Phone-style header */}
                        <div className="bg-[#075E54] px-4 py-2.5 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-400 flex items-center justify-center text-white text-[10px] font-black">LC</div>
                          <div>
                            <p className="text-white text-[11px] font-bold leading-none">LeapCreww</p>
                            <p className="text-emerald-200 text-[9px]">WhatsApp Business</p>
                          </div>
                        </div>
                        {/* Message bubble */}
                        <div className="bg-[#ECE5DD] px-4 py-3">
                          {chatEditSection === "template" ? (
                            <div className="space-y-2" onClick={e => e.stopPropagation()}>
                              <input type="text" value={strategistStrategy.template.name}
                                onChange={(e) => setStrategistStrategy({ ...strategistStrategy, template: { ...strategistStrategy.template, name: e.target.value } })}
                                className="w-full text-[10px] font-black text-stone-500 bg-transparent border-b border-stone-300 focus:outline-none focus:border-stone-600 pb-0.5"
                                placeholder="template_name"
                              />
                              <textarea rows={4} value={strategistStrategy.template.body}
                                onChange={(e) => setStrategistStrategy({ ...strategistStrategy, template: { ...strategistStrategy.template, body: e.target.value } })}
                                className="w-full bg-white/80 text-sm font-medium leading-relaxed text-stone-800 p-2 focus:outline-none resize-none border border-stone-200 rounded-lg"
                              />
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-[9px] font-black text-stone-400 uppercase tracking-wider">{strategistStrategy.template.name}</p>
                              <p className="text-sm leading-relaxed text-stone-800 font-medium whitespace-pre-wrap">{strategistStrategy.template.body}</p>
                            </div>
                          )}
                        </div>
                        {/* CTA buttons */}
                        {strategistStrategy.template.buttons && strategistStrategy.template.buttons.length > 0 && (
                          <div className="bg-white border-t border-stone-100 divide-x divide-stone-100 flex">
                            {chatEditSection === "template"
                              ? strategistStrategy.template.buttons.map((btn: string, bIdx: number) => (
                                <input key={bIdx} type="text" value={btn} onClick={e => e.stopPropagation()}
                                  onChange={(e) => { const nb = [...strategistStrategy.template.buttons]; nb[bIdx] = e.target.value; setStrategistStrategy({ ...strategistStrategy, template: { ...strategistStrategy.template, buttons: nb } }); }}
                                  className="flex-1 text-center text-[11px] font-black text-[#128C7E] py-2.5 focus:outline-none bg-transparent"
                                />
                              ))
                              : strategistStrategy.template.buttons.map((btn: string, bIdx: number) => (
                                <div key={bIdx} className="flex-1 text-center text-[11px] font-black text-[#128C7E] py-2.5">{btn}</div>
                              ))
                            }
                          </div>
                        )}
                        {chatEditSection !== "template" && (
                          <div className="border-t border-stone-100 px-3 py-1.5 flex items-center justify-end gap-1 bg-stone-50">
                            <span className="text-[9px] text-stone-400">tap to edit</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI bubble: audience */}
                  <div className="flex gap-3 items-end">
                    <div className="w-9 h-9 bg-stone-950 flex items-center justify-center shrink-0 rounded-full border-2 border-stone-800">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="bg-stone-100 px-4 py-2.5 text-[12px] font-medium text-stone-700" style={{borderRadius:"18px 18px 18px 4px"}}>
                      Who should receive this message?
                    </div>
                  </div>

                  {/* ── AUDIENCE ── */}
                  <div className="flex gap-3 items-end">
                    <div className="w-9 shrink-0" />
                    <div
                      onClick={() => setChatEditSection(s => s === "audience" ? null : "audience")}
                      className="flex-1 bg-white border border-stone-200 shadow-sm overflow-hidden cursor-pointer hover:border-stone-400 transition-colors rounded-xl">
                      <div className="px-4 py-3 space-y-2">
                        {chatEditSection === "audience" ? (
                          <div className="space-y-2" onClick={e => e.stopPropagation()}>
                            <input type="text" value={strategistStrategy.segment.name}
                              onChange={(e) => setStrategistStrategy({ ...strategistStrategy, segment: { ...strategistStrategy.segment, name: e.target.value } })}
                              className="w-full font-black text-sm text-stone-950 bg-transparent border-b border-stone-300 focus:outline-none focus:border-stone-950 pb-0.5"
                            />
                            <div className="space-y-1.5 pt-1">
                              {strategistStrategy.segment.rules.all?.map((rule: any, rIdx: number) => (
                                <div key={rIdx} className="flex items-center gap-2 text-[11px]">
                                  <span className="text-stone-500">where <strong className="text-stone-900 uppercase">{rule.field}</strong> is</span>
                                  <input type="text" value={rule.value}
                                    onChange={(e) => { const nr = { ...strategistStrategy.segment.rules }; nr.all[rIdx].value = e.target.value; setStrategistStrategy({ ...strategistStrategy, segment: { ...strategistStrategy.segment, rules: nr } }); }}
                                    className="flex-1 bg-stone-50 border border-stone-200 px-2 py-1 text-[11px] font-black focus:outline-none focus:border-stone-950"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-black text-sm text-stone-950">{strategistStrategy.segment.name}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {strategistStrategy.segment.rules.all?.map((rule: any, rIdx: number) => (
                                <span key={rIdx} className="bg-stone-100 border border-stone-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-stone-600">
                                  {rule.field} = <strong className="text-stone-900">{rule.value}</strong>
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      {chatEditSection !== "audience" && (
                        <div className="border-t border-stone-100 px-3 py-1.5 flex items-center justify-end bg-stone-50">
                          <span className="text-[9px] text-stone-400">tap to edit filters</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI bubble: schedule */}
                  <div className="flex gap-3 items-end">
                    <div className="w-9 h-9 bg-stone-950 flex items-center justify-center shrink-0 rounded-full border-2 border-stone-800">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="bg-stone-100 px-4 py-2.5 text-[12px] font-medium text-stone-700" style={{borderRadius:"18px 18px 18px 4px"}}>
                      When should it go out?
                    </div>
                  </div>

                  {/* ── SCHEDULE ── */}
                  <div className="flex gap-3 items-end">
                    <div className="w-9 shrink-0" />
                    <div
                      onClick={() => setChatEditSection(s => s === "schedule" ? null : "schedule")}
                      className="flex-1 bg-white border border-stone-200 shadow-sm overflow-hidden cursor-pointer hover:border-stone-400 transition-colors rounded-xl">
                      <div className="px-4 py-3 space-y-2">
                        {chatEditSection === "schedule" ? (
                          <div className="space-y-2" onClick={e => e.stopPropagation()}>
                            <p className="text-[10px] text-stone-400 italic">{strategistStrategy.schedule.reasoning}</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-[9px] font-bold text-stone-400 uppercase mb-1">Send at</p>
                                <input type="datetime-local" value={strategistStrategy.schedule.scheduledAt ? strategistStrategy.schedule.scheduledAt.substring(0, 16) : ""}
                                  onChange={(e) => setStrategistStrategy({ ...strategistStrategy, schedule: { ...strategistStrategy.schedule, scheduledAt: new Date(e.target.value).toISOString() } })}
                                  className="w-full bg-stone-50 border border-stone-200 py-1.5 px-2 text-[11px] font-bold focus:outline-none focus:border-stone-950"
                                />
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-stone-400 uppercase mb-1">Delay (s)</p>
                                <input type="number" min="1" max="5" value={strategistStrategy.schedule.delay}
                                  onChange={(e) => setStrategistStrategy({ ...strategistStrategy, schedule: { ...strategistStrategy.schedule, delay: parseInt(e.target.value) } })}
                                  className="w-full bg-stone-50 border border-stone-200 py-1.5 px-2 text-[11px] font-bold focus:outline-none focus:border-stone-950"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
                            <div>
                              <p className="text-sm font-black text-stone-950">
                                {strategistStrategy.schedule.scheduledAt
                                  ? new Date(strategistStrategy.schedule.scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                                  : "Send immediately"}
                              </p>
                              <p className="text-[10px] text-stone-400">{strategistStrategy.schedule.delay}s between messages · anti-spam</p>
                            </div>
                          </div>
                        )}
                      </div>
                      {chatEditSection !== "schedule" && (
                        <div className="border-t border-stone-100 px-3 py-1.5 flex items-center justify-end bg-stone-50">
                          <span className="text-[9px] text-stone-400">tap to adjust</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── DRIP SEQUENCE ── */}
                  <div className="flex gap-3 items-end">
                    <div className="w-9 shrink-0" />
                    <div className="flex-1 bg-white border border-stone-200 shadow-sm overflow-hidden rounded-xl">
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-black text-stone-950">Follow-up Drip</p>
                          <p className="text-[9px] text-stone-400 mt-0.5">{strategistStrategy.sequence.steps.length} automated messages after the broadcast</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button"
                            onClick={() => setChatEditSection(s => s === "sequence" ? null : "sequence")}
                            className="text-[9px] text-stone-400 underline hover:text-stone-700 cursor-pointer">
                            {chatEditSection === "sequence" ? "done" : "edit"}
                          </button>
                          <button type="button" onClick={() => setSequenceEnabled((v) => !v)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out ${sequenceEnabled ? "bg-wa-green border-wa-green" : "bg-stone-200 border-stone-300"}`}>
                            <span aria-hidden="true" className={`inline-block h-4 w-4 transform bg-white ring-0 transition duration-200 ease-in-out rounded-full ${sequenceEnabled ? "translate-x-4" : "translate-x-0.5"} mt-0.5`} />
                          </button>
                        </div>
                      </div>
                      {sequenceEnabled && (
                        <div className="border-t border-stone-100 px-4 py-3 space-y-2 bg-stone-50">
                          {strategistStrategy.sequence.steps.map((step: any, sIdx: number) => (
                            <div key={sIdx} className="flex gap-2 items-start">
                              <span className="bg-stone-900 text-white text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                                {step.delayMinutes === 0 ? "Now" : step.delayMinutes < 60 ? `+${step.delayMinutes}m` : `+${Math.round(step.delayMinutes / 60)}h`}
                              </span>
                              {chatEditSection === "sequence" ? (
                                <textarea rows={2} value={step.message}
                                  onChange={(e) => { const ns = [...strategistStrategy.sequence.steps]; ns[sIdx].message = e.target.value; setStrategistStrategy({ ...strategistStrategy, sequence: { ...strategistStrategy.sequence, steps: ns } }); }}
                                  className="flex-1 bg-white border border-stone-200 rounded-lg p-2 text-[11px] font-medium text-stone-700 focus:outline-none focus:border-wa-green resize-none"
                                />
                              ) : (
                                <p className="flex-1 text-[11px] text-stone-600 font-medium leading-snug">{step.message.length > 100 ? step.message.slice(0, 100) + "…" : step.message}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── LEAD QUALIFIER ── */}
                  <div className="flex gap-3 items-end">
                    <div className="w-9 shrink-0" />
                    <div className="flex-1 bg-white border border-stone-200 shadow-sm overflow-hidden rounded-xl">
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-black text-stone-950">Lead Qualifier</p>
                          <p className="text-[9px] text-stone-400 mt-0.5">
                            {isGeneratingQualifier ? "Generating questions…" : strategistQualifier ? `${strategistQualifier.questions.length} qualifying questions` : "Not generated"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {strategistQualifier && !isGeneratingQualifier && (
                            <button type="button"
                              onClick={() => setChatEditSection(s => s === "qualifier" ? null : "qualifier")}
                              className="text-[9px] text-stone-400 underline hover:text-stone-700 cursor-pointer">
                              {chatEditSection === "qualifier" ? "done" : "edit"}
                            </button>
                          )}
                          <button type="button" onClick={() => setQualifierEnabled((v) => !v)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out ${qualifierEnabled ? "bg-wa-green border-wa-green" : "bg-stone-200 border-stone-300"}`}>
                            <span aria-hidden="true" className={`inline-block h-4 w-4 transform bg-white ring-0 transition duration-200 ease-in-out rounded-full ${qualifierEnabled ? "translate-x-4" : "translate-x-0.5"} mt-0.5`} />
                          </button>
                        </div>
                      </div>
                      {isGeneratingQualifier ? (
                        <div className="border-t border-stone-100 px-4 py-3 flex items-center gap-2 bg-stone-50">
                          <Loader2 className="w-3 h-3 animate-spin text-stone-400" />
                          <span className="text-[10px] text-stone-400">Generating questions…</span>
                        </div>
                      ) : qualifierEnabled && !strategistQualifier ? (
                        <div className="border-t border-stone-100 px-4 py-3 flex items-center justify-between bg-stone-50">
                          <span className="text-[10px] text-stone-400">Could not auto-generate</span>
                          <button type="button" onClick={generateQualifier}
                            className="flex items-center gap-1 text-[10px] font-black bg-wa-green hover:bg-wa-green-dark text-white px-3 py-1.5 rounded-lg cursor-pointer">
                            <Sparkles className="w-3 h-3" /> Generate
                          </button>
                        </div>
                      ) : qualifierEnabled && strategistQualifier && (
                        <div className="border-t border-stone-100 px-4 py-3 space-y-2 bg-stone-50">
                          {strategistQualifier.questions.map((q, qIdx) => (
                            <div key={q.id} className="space-y-1.5">
                              <div className="flex items-start gap-2">
                                <span className="bg-stone-950 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center shrink-0 mt-0.5 rounded-full">{qIdx + 1}</span>
                                {chatEditSection === "qualifier" ? (
                                  <input type="text" value={q.text}
                                    onChange={(e) => { const upd = { ...strategistQualifier, questions: strategistQualifier.questions.map((qq, i) => i === qIdx ? { ...qq, text: e.target.value } : qq) }; setStrategistQualifier(upd); }}
                                    className="flex-1 text-[11px] font-bold text-stone-900 bg-white border-b border-stone-200 focus:outline-none focus:border-stone-950 pb-0.5"
                                  />
                                ) : (
                                  <p className="flex-1 text-[11px] font-bold text-stone-800">{q.text}</p>
                                )}
                                <button type="button" onClick={() => { const upd = { ...strategistQualifier, questions: strategistQualifier.questions.filter((_, i) => i !== qIdx) }; setStrategistQualifier(upd); }}
                                  className="text-stone-300 hover:text-red-400 cursor-pointer shrink-0">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1 pl-6">
                                {q.options.map((opt, oIdx) => {
                                  const isDisq = q.disqualifyOn?.includes(opt) ?? false;
                                  return chatEditSection === "qualifier" ? (
                                    <div key={oIdx} className="flex items-center gap-0.5">
                                      <input type="text" value={opt}
                                        onChange={(e) => { const nv = e.target.value; const upd = { ...strategistQualifier, questions: strategistQualifier.questions.map((qq, i) => i !== qIdx ? qq : { ...qq, options: qq.options.map((o, j) => j === oIdx ? nv : o), disqualifyOn: (qq.disqualifyOn || []).map(d => d === opt ? nv : d) }) }; setStrategistQualifier(upd); }}
                                        className={`text-[10px] px-1.5 py-0.5 w-20 border focus:outline-none ${isDisq ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-stone-200 text-stone-600"}`}
                                      />
                                      <button type="button" onClick={() => { const upd = { ...strategistQualifier, questions: strategistQualifier.questions.map((qq, i) => i !== qIdx ? qq : { ...qq, disqualifyOn: isDisq ? (qq.disqualifyOn||[]).filter(d => d !== opt) : [...(qq.disqualifyOn||[]), opt] }) }; setStrategistQualifier(upd); }}
                                        className={`text-[9px] px-1 py-0.5 border cursor-pointer ${isDisq ? "bg-amber-100 border-amber-300 text-amber-600" : "bg-stone-50 border-stone-200 text-stone-300 hover:text-amber-500"}`}>✕</button>
                                    </div>
                                  ) : (
                                    <span key={oIdx} className={`text-[10px] px-2 py-0.5 border font-medium ${isDisq ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-stone-200 text-stone-600"}`}>{opt}</span>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center gap-2 text-[9px] font-bold pt-1 pl-0.5">
                            <span className="text-stone-400">Tags:</span>
                            <span className="text-emerald-600">{strategistQualifier.qualifiedTag}</span>
                            <span className="text-stone-300">·</span>
                            <span className="text-stone-400">{strategistQualifier.disqualifiedTag}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI closing bubble */}
                  <div className="flex gap-3 items-end">
                    <div className="w-9 h-9 bg-stone-950 flex items-center justify-center shrink-0 rounded-full border-2 border-stone-800">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="bg-stone-100 px-4 py-2.5 text-[12px] font-medium text-stone-700" style={{borderRadius:"18px 18px 18px 4px"}}>
                      Everything&apos;s set 🚀 Approve to launch.
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-stone-100 flex justify-between items-center shrink-0 select-none">
              {strategistResult ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setStrategistResult(null);
                      setStrategistStrategy(null);
                      setStrategistPrompt("");
                      setStrategistError("");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 rounded-xl transition-all cursor-pointer"
                  >
                    Build Another
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsStrategistOpen(false);
                        setStrategistStrategy(null);
                        setStrategistResult(null);
                        setStrategistError("");
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 rounded-xl transition-all cursor-pointer"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsStrategistOpen(false);
                        setStrategistStrategy(null);
                        setStrategistResult(null);
                        setStrategistError("");
                        router.push(`${pathname}?tab=campaigns`, { scroll: false });
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 bg-wa-green hover:bg-wa-green-dark text-white rounded-xl transition-colors cursor-pointer"
                    >
                      View Campaigns
                      <TrendingUp className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
              <>
              <div>
                {strategistStrategy && (
                  <button
                    type="button"
                    onClick={() => { setStrategistStrategy(null); setStrategistQualifier(null); setQualifierEnabled(true); setSequenceEnabled(true); setChatEditSection(null); setShowTemplatePicker(false); }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 rounded-xl transition-all cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 rounded-xl transition-all cursor-pointer"
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
                            sequence: sequenceEnabled ? strategistStrategy.sequence : null,
                            leadQualifier: qualifierEnabled && strategistQualifier ? strategistQualifier : null,
                          })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Failed to apply strategy");

                        setStrategistResult({
                          templateApproved: data.templateApproved,
                          templateName: strategistStrategy.template.name,
                          templateBody: strategistStrategy.template.body,
                          enrolledCount: data.enrolledCount ?? data.pendingCount ?? 0,
                          scheduledAt: strategistStrategy.schedule.scheduledAt ?? null,
                          steps: strategistStrategy.sequence.steps ?? [],
                        });
                        if (orgId) await refreshWorkspace(orgId);
                      } catch (err: any) {
                        notify.error("Couldn't apply strategy", err.message || "Something went wrong. Please try again.");
                      } finally {
                        setIsApplyingStrategy(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 bg-wa-green hover:bg-wa-green-dark text-white rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isApplyingStrategy ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {strategistStrategy.templateExists ? "Applying…" : "Registering…"}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {strategistStrategy.templateExists ? "Approve & Launch" : "Approve & Register"}
                      </>
                    )}
                  </button>
                )}
              </div>
              </>
              )}
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
