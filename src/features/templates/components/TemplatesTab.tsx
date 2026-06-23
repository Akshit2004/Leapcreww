"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  CheckCircle2,
  Loader,
  Image,
  Video,
  MousePointerClick,
  X,
  Plus,
  Megaphone,
  Trash2,
  Globe,
  GlobeOff,
  RefreshCw,
  Clock,
  XCircle,
} from "lucide-react";
import { useApp } from "@/shared/context/AppContext";
import { useParams } from "next/navigation";
import { useConfirm } from "@/shared/components/ui/ConfirmDialog";
import { CreateTemplateModal } from "./CreateTemplateModal";

// ── Industry mapping (template name → vertical) ───────────────────────────
const TEMPLATE_INDUSTRY: Record<string, string> = {
  // E-commerce
  wishlist_reminder: "E-commerce", price_drop_alert: "E-commerce",
  order_cancelled: "E-commerce", refund_processed: "E-commerce",
  review_request: "E-commerce", loyalty_points_earned: "E-commerce",
  product_launch: "E-commerce", abandoned_checkout: "E-commerce",
  exchange_initiated: "E-commerce", delivery_scheduled: "E-commerce",
  cart_recovery: "E-commerce", order_shipped: "E-commerce",
  order_confirmation: "E-commerce", special_offer: "E-commerce",
  delivery_delayed: "E-commerce",
  // Education
  assignment_due: "Education", exam_reminder: "Education",
  result_announced: "Education", fee_reminder: "Education",
  admission_confirmed: "Education", scholarship_awarded: "Education",
  parent_teacher_meeting: "Education", attendance_alert: "Education",
  course_completion: "Education", student_welcome: "Education",
  // Healthcare
  prescription_ready: "Healthcare", vaccination_reminder: "Healthcare",
  health_checkup_reminder: "Healthcare", doctor_appt_confirmed: "Healthcare",
  doctor_appointment_confirmed: "Healthcare", lab_report_ready: "Healthcare",
  insurance_claim_update: "Healthcare", surgery_reminder: "Healthcare",
  appointment_reminder: "Healthcare", appointment_confirmed: "Healthcare",
  // Restaurant
  delivery_on_way: "Restaurant", reservation_reminder: "Restaurant",
  special_menu_today: "Restaurant", food_loyalty_reward: "Restaurant",
  catering_booking_confirmed: "Restaurant", table_booking_confirmed: "Restaurant",
  // Finance
  transaction_alert: "Finance", credit_card_due: "Finance",
  investment_update: "Finance", savings_milestone: "Finance",
  fixed_deposit_maturity: "Finance", credit_score_update: "Finance",
  emi_reminder: "Finance", account_statement_ready: "Finance",
  // Travel
  cab_booking_confirmed: "Travel", hotel_checkout_reminder: "Travel",
  visa_appt_confirmed: "Travel", travel_package_confirmed: "Travel",
  flight_delay_alert: "Travel", hotel_upgrade: "Travel",
  check_in_reminder: "Travel", flight_reminder: "Travel",
  // Automobile
  service_due_reminder: "Automobile", vehicle_doc_expiry: "Automobile",
  test_drive_confirmed: "Automobile", roadside_assistance: "Automobile",
  service_booking_confirmed: "Automobile", vehicle_ready_pickup: "Automobile",
  insurance_renewal: "Automobile",
  // HR
  offer_letter_sent: "HR", onboarding_welcome: "HR",
  payslip_ready: "HR", leave_approved: "HR",
  performance_review: "HR", training_reminder: "HR",
  // Real Estate
  property_visit_confirmed: "Real Estate", rent_payment_reminder: "Real Estate",
  rental_agreement_ready: "Real Estate", property_booking_confirmed: "Real Estate",
  maintenance_request: "Real Estate",
  // Events
  event_reminder: "Events", ticket_confirmed: "Events",
};

const getIndustry = (name: string): string =>
  TEMPLATE_INDUSTRY[name] ?? "General";

const INDUSTRY_EMOJI: Record<string, string> = {
  "E-commerce":  "🛒",
  "Education":   "🎓",
  "Healthcare":  "🏥",
  "Restaurant":  "🍽️",
  "Finance":     "💰",
  "Travel":      "✈️",
  "Automobile":  "🚗",
  "HR":          "👥",
  "Real Estate": "🏠",
  "Events":      "🎫",
  "General":     "⚡",
};

export const TemplatesTab: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { templates, deleteTemplate, addSystemLog, refreshWorkspace } = useApp();
  const confirm = useConfirm();

  const params = useParams();
  const orgId = params.orgId as string;

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeIndustry, setActiveIndustry] = useState<string>("all");
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

  // Build the list of industries that actually exist in this org's templates
  const availableIndustries = Array.from(
    new Set(templates.map((t) => getIndustry(t.name)))
  ).sort();

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = activeCategory === "all" || t.category === activeCategory;
    const matchesIndustry = activeIndustry === "all" || getIndustry(t.name) === activeIndustry;
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesIndustry && matchesSearch;
  });

  /** Convert snake_case or slug to Title Case — e.g. "diwali_discount20" → "Diwali Discount20" */
  const formatName = (name: string) =>
    name.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const categoryConfig: Record<string, { color: string; bg: string; border: string }> = {
    Marketing:      { color: "#0891b2", bg: "#e0f2fe", border: "#0891b2" },
    Utility:        { color: "#7c3aed", bg: "#ede9fe", border: "#7c3aed" },
    Authentication: { color: "#059669", bg: "#d1fae5", border: "#059669" },
  };

  const getCategoryStyle = (category: string) =>
    categoryConfig[category] ?? { color: "#6b7280", bg: "#f3f4f6", border: "#9ca3af" };

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

  const statusConfig = {
    approved: { icon: CheckCircle2, label: "Approved", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    rejected: { icon: XCircle,      label: "Rejected",  cls: "text-red-700 bg-red-50 border-red-200" },
    pending:  { icon: Clock,        label: "Pending",   cls: "text-amber-700 bg-amber-50 border-amber-200" },
  };

  const getStatusChip = (status?: string) => {
    const key = (status?.toLowerCase() ?? "pending") as keyof typeof statusConfig;
    const cfg = statusConfig[key] ?? statusConfig.pending;
    const Icon = key === "pending" ? Loader : cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 border rounded-full ${cfg.cls}`}>
        <Icon className={`w-3 h-3 ${key === "pending" ? "animate-spin" : ""}`} />
        {cfg.label}
      </span>
    );
  };

  const getMediaTag = (mediaType?: string) => {
    if (!mediaType || mediaType === "none") return null;
    const Icon = mediaType === "image" ? Image : mediaType === "video" ? Video : FileText;
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full capitalize">
        <Icon className="w-3 h-3" />
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
            className="ds-badge ds-badge-muted inline-flex"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const totalCount = templates.length;
  const approvedCount = templates.filter((t) => t.metaStatus?.toLowerCase() === "approved").length;
  const pendingCount = templates.filter((t) => t.metaStatus?.toLowerCase() === "pending").length;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar animate-slide-up bg-[#fafaf9]">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 sm:px-8">

        <div className="flex items-center justify-between py-4 gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-tight text-stone-900">Meta Approved Templates</h2>
            <p className="text-stone-500 text-xs mt-0.5">WhatsApp-compliant layouts · ready to broadcast</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSyncTemplates}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 border border-stone-200 bg-white text-stone-700 hover:border-wa-green hover:text-wa-green rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing…" : "Sync Meta"}</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-wa-green hover:bg-wa-green-dark text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex gap-6 pb-3 border-b border-stone-100 mb-2">
          <div className="flex flex-col">
            <span className="text-xl font-black text-stone-900 leading-none">{totalCount}</span>
            <span className="text-[10px] uppercase tracking-wider text-stone-500 mt-0.5">Total</span>
          </div>
          <div className="w-px bg-stone-200" />
          <div className="flex flex-col">
            <span className="text-xl font-black text-emerald-600 leading-none">{approvedCount}</span>
            <span className="text-[10px] uppercase tracking-wider text-stone-500 mt-0.5">Approved</span>
          </div>
          <div className="w-px bg-stone-200" />
          <div className="flex flex-col">
            <span className="text-xl font-black text-amber-600 leading-none">{pendingCount}</span>
            <span className="text-[10px] uppercase tracking-wider text-stone-500 mt-0.5">Pending</span>
          </div>
        </div>

        {/* Row 2: category filters + search */}
        <div className="flex items-center justify-between gap-3 pb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {["all", "Marketing", "Utility", "Authentication"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                  activeCategory === cat
                    ? "bg-wa-green text-white border-wa-green"
                    : "text-stone-500 border-stone-300 hover:border-stone-500 bg-white"
                }`}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
          <div className="relative w-56 shrink-0">
            <input
              type="text"
              placeholder="Search templates…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ds-input text-xs pl-8 pr-8 py-1.5 w-full"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 3: industry filter chips */}
        <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {["all", ...availableIndustries].map((ind) => (
            <button
              key={ind}
              onClick={() => setActiveIndustry(ind)}
              className={`text-[11px] font-bold px-3 py-1 rounded-full border bg-white whitespace-nowrap transition-all cursor-pointer shrink-0 hover:border-stone-400 ${
                activeIndustry === ind
                  ? "bg-stone-900 text-white border-stone-900"
                  : "text-stone-500 border-stone-200"
              }`}
            >
              {ind === "all" ? "🏢 All Industries" : INDUSTRY_EMOJI[ind] ? `${INDUSTRY_EMOJI[ind]} ${ind}` : ind}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content grid ─────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-8 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.length === 0 && (
          <div className="col-span-full py-16 text-center space-y-4">
            <div className="text-5xl">📋</div>
            {templates.length === 0 ? (
              <>
                <div>
                  <h4 className="font-black text-stone-900 uppercase text-xs mb-1">No templates yet</h4>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">Templates are required to send campaigns. Create a Meta-approved template to get started.</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-stone-900 text-white text-xs font-black uppercase tracking-wider px-4 py-2 hover:bg-stone-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create First Template
                </button>
              </>
            ) : (
              <p className="text-xs text-stone-500">No templates match your search or filter.</p>
            )}
          </div>
        )}
        {filteredTemplates.map((t) => {
          const catStyle = getCategoryStyle(t.category);
          const isApproved = t.metaStatus?.toLowerCase() === "approved";
          return (
          <div
            key={t.id}
            className="bg-white border-2 border-stone-200 flex flex-col overflow-hidden rounded-xl shadow-none hover:border-stone-400 transition-all"
          >
            {/* Colored top accent bar based on category */}
            <div className="h-1.5 shrink-0" style={{ background: catStyle.border }} />

            {/* Card header */}
            <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-stone-100">
              <div className="min-w-0 flex-1">
                <h4 className="font-black text-sm text-stone-900 leading-tight truncate">{formatName(t.name)}</h4>
                <p className="text-[10px] text-stone-400 font-mono mt-0.5 truncate">{t.name}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
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
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
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
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Delete Template"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Meta chips: status + category + industry + media */}
            <div className="px-5 py-2.5 flex flex-wrap items-center gap-1.5 border-b border-stone-100">
              {getStatusChip(t.metaStatus)}
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 border rounded-full"
                style={{ color: catStyle.color, background: catStyle.bg, borderColor: catStyle.border + "66" }}
              >
                {t.category}
              </span>
              {(() => {
                const ind = getIndustry(t.name);
                const emoji = INDUSTRY_EMOJI[ind] ?? "";
                return (
                  <span
                    onClick={() => setActiveIndustry(ind)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-full cursor-pointer hover:border-stone-400 transition-colors"
                    title={`Filter by ${ind}`}
                  >
                    {emoji} {ind}
                  </span>
                );
              })()}
              {t.isShared && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
                  <Globe className="w-3 h-3" />
                  Shared
                </span>
              )}
              {getMediaTag(t.mediaType)}
            </div>

            {/* Message body — styled like a WA bubble */}
            <div className="px-5 py-4 flex-1">
              <div
                className="text-xs leading-relaxed text-stone-800 bg-[#dcf8c6] rounded-xl rounded-tl-sm p-3.5 max-h-28 overflow-y-auto custom-scrollbar select-text whitespace-pre-wrap shadow-sm"
              >
                {formatBodyWithHighlights(t.body)}
              </div>
            </div>

            {/* Footer: buttons preview + broadcast CTA */}
            <div className="px-5 pb-4 space-y-2">
              {t.buttons && t.buttons.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[9px] uppercase tracking-wider font-bold text-stone-400 flex items-center gap-1">
                    <MousePointerClick className="w-3 h-3" />
                    Quick Reply Buttons
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.buttons.map((btn, bIdx) => (
                      <span
                        key={bIdx}
                        className="text-[11px] font-semibold border border-[#53bdeb] text-[#0a7abf] bg-white px-3 py-1 rounded-full leading-none"
                      >
                        {btn}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {isApproved && t.name !== "lead_capture_result" ? (
                <button
                  onClick={() => onNavigate?.(`campaigns&launchTemplate=${encodeURIComponent(t.name)}`)}
                  className="w-full flex items-center justify-center gap-2 bg-wa-green hover:bg-wa-green-dark text-white text-[11px] font-black uppercase tracking-wider py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  Use in Campaign
                </button>
              ) : !isApproved ? (
                <div className="text-[10px] text-stone-400 italic text-center py-1">Awaiting Meta review</div>
              ) : null}
            </div>
          </div>
          );
        })}
      </div>
      </div>{/* end scrollable area */}

      {/* Template Creator Modal Wizard */}
      <CreateTemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orgId={orgId}
      />

    </div>
  );
};
