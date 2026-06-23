"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bot, CheckCircle2, XCircle, AlertCircle, ChevronRight,
  ToggleLeft, ToggleRight, ExternalLink, Loader2, Save,
  ShoppingCart, Palette, Ruler,
} from "lucide-react";
import { useParams, useRouter, usePathname } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentConfig {
  whatsappConnected: boolean;
  shopifyConnected: boolean;
  razorpayConnected: boolean;
  fulfillmentHoldEnabled: boolean;
  cartRecoveryDiscountCode: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Req({ ok, label, action, onNavigate }: { ok: boolean; label: string; action?: { label: string; tab: string }; onNavigate?: (tab: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        {ok
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
        <span className={`text-xs ${ok ? "text-stone-600" : "text-stone-500"}`}>{label}</span>
      </div>
      {!ok && action && onNavigate && (
        <button
          onClick={() => onNavigate(action.tab)}
          className="text-[10px] font-black uppercase tracking-wider text-stone-900 border border-stone-300 px-2 py-0.5 hover:bg-stone-50 cursor-pointer flex items-center gap-1"
        >
          {action.label} <ChevronRight className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

function StatusBadge({ active, partial }: { active: boolean; partial?: boolean }) {
  if (active) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Active
    </span>
  );
  if (partial) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200">
      <AlertCircle className="w-3 h-3" />Needs Setup
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-stone-100 text-stone-500 border border-stone-200">
      <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />Inactive
    </span>
  );
}

// ─── Agent cards ──────────────────────────────────────────────────────────────

function RtoAgentCard({
  config, saving, onToggleHold, onNavigate,
}: {
  config: AgentConfig;
  saving: boolean;
  onToggleHold: (v: boolean) => void;
  onNavigate: (tab: string) => void;
}) {
  const prereqsMet = config.whatsappConnected && config.shopifyConnected && config.razorpayConnected;
  const isActive = prereqsMet;

  return (
    <div className="bg-white border border-stone-200 border-t-4 border-t-orange-500 overflow-hidden">
      {/* Title row */}
      <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-stone-900">RTO Reduction Agent</h3>
            <p className="text-[11px] text-stone-500 mt-0.5">COD Risk Mitigation — scores orders 0–10, holds shipments, sends ₹99 token prepay</p>
          </div>
        </div>
        <StatusBadge active={isActive} partial={!isActive && config.whatsappConnected} />
      </div>

      <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Prerequisites */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Prerequisites</p>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 divide-y divide-stone-100">
            <Req ok={config.whatsappConnected} label="WhatsApp connected" action={{ label: "Connect", tab: "settings" }} onNavigate={onNavigate} />
            <Req ok={config.shopifyConnected} label="Shopify integration active" action={{ label: "Connect", tab: "integrations" }} onNavigate={onNavigate} />
            <Req ok={config.razorpayConnected} label="Razorpay integration active" action={{ label: "Connect", tab: "integrations" }} onNavigate={onNavigate} />
          </div>
        </div>

        {/* Config */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Configuration</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 py-1.5">
              <div>
                <p className="text-xs font-bold text-stone-800">Fulfillment Hold</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Pause Shopify dispatch for high-risk COD orders</p>
              </div>
              <button
                onClick={() => onToggleHold(!config.fulfillmentHoldEnabled)}
                disabled={saving || !config.shopifyConnected}
                className="cursor-pointer disabled:opacity-40"
              >
                {config.fulfillmentHoldEnabled
                  ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                  : <ToggleLeft className="w-7 h-7 text-stone-300" />}
              </button>
            </div>
            <div className="pt-1">
              <p className="text-[10px] text-stone-400 leading-relaxed">
                Risk score ≥ 7 triggers verification. Score factors: first-time buyer (+4), order &gt; ₹3k (+5), fraud network (+4).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 pb-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">What this agent does</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            "COD Risk Scorer (0–10)",
            "₹99 Token Prepay",
            "Shopify Fulfillment Hold",
            "YES/NO Verification",
            "Address Confirmation",
            "COD → Prepaid Conversion (₹50 off)",
            "NDR Rescue Pipeline",
            "Shared Fraud Network",
            "Success Fee Metering",
          ].map((f) => (
            <div key={f} className="flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3 py-1.5 text-[10px] font-semibold text-stone-600">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />{f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CartAgentCard({
  config, saving, onSaveDiscount, onNavigate,
}: {
  config: AgentConfig;
  saving: boolean;
  onSaveDiscount: (code: string) => void;
  onNavigate: (tab: string) => void;
}) {
  const [discountCode, setDiscountCode] = useState(config.cartRecoveryDiscountCode);
  useEffect(() => { setDiscountCode(config.cartRecoveryDiscountCode); }, [config.cartRecoveryDiscountCode]);

  const prereqsMet = config.whatsappConnected && config.shopifyConnected;
  const isActive = prereqsMet;

  return (
    <div className="bg-white border border-stone-200 border-t-4 border-t-blue-500 overflow-hidden">
      <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-stone-900">Cart Recovery Agent</h3>
            <p className="text-[11px] text-stone-500 mt-0.5">3-touch WhatsApp drip with AI objection analysis — closes abandoned checkouts</p>
          </div>
        </div>
        <StatusBadge active={isActive} partial={!isActive && config.whatsappConnected} />
      </div>

      <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Prerequisites</p>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 divide-y divide-stone-100">
            <Req ok={config.whatsappConnected} label="WhatsApp connected" action={{ label: "Connect", tab: "settings" }} onNavigate={onNavigate} />
            <Req ok={config.shopifyConnected} label="Shopify integration active" action={{ label: "Connect", tab: "integrations" }} onNavigate={onNavigate} />
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Configuration</p>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-1.5">
                Discount Code <span className="font-normal normal-case text-stone-400">(sent on price objection)</span>
              </label>
              <div className="flex gap-2">
                <input
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder="e.g. SAVE10"
                  className="flex-1 border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:border-stone-900 bg-stone-50"
                />
                <button
                  onClick={() => onSaveDiscount(discountCode)}
                  disabled={saving || discountCode === config.cartRecoveryDiscountCode}
                  className="flex items-center gap-1.5 bg-stone-900 text-white px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-stone-700 disabled:opacity-40 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save
                </button>
              </div>
              <p className="text-[10px] text-stone-400 mt-1.5">Leave blank to skip discount offers. AI will still handle objections.</p>
            </div>
            <div className="text-[10px] text-stone-400 pt-1">
              Abandonment window: 60 min · Drip: 30 min → 2h → 24h
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">What this agent does</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            "12-Variant Template Drip",
            "AI Objection Analyst (Groq)",
            "Price & Shipping Closer",
            "COD Payment Confirmer",
            "Human Escalation (Fit/Stock)",
            "Recovery Analytics",
          ].map((f) => (
            <div key={f} className="flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3 py-1.5 text-[10px] font-semibold text-stone-600">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />{f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FindersAgentCard({
  config, onNavigate,
}: {
  config: AgentConfig;
  onNavigate: (tab: string) => void;
}) {
  const [product, setProduct] = useState("");
  const [links, setLinks] = useState<{ shade?: string; size?: string } | null>(null);
  const [generatingLinks, setGeneratingLinks] = useState(false);
  const params = useParams();
  const orgId = params.orgId as string;

  const isActive = config.whatsappConnected;

  const generateLinks = async () => {
    setGeneratingLinks(true);
    try {
      const url = `/api/org/${orgId}/finder-links${product.trim() ? `?product=${encodeURIComponent(product.trim())}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setLinks({ shade: data.shade, size: data.size });
    } catch { /* silent */ }
    finally { setGeneratingLinks(false); }
  };

  return (
    <div className="bg-white border border-stone-200 border-t-4 border-t-violet-500 overflow-hidden">
      <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 flex items-center justify-center shrink-0">
            <Palette className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-stone-900">Conversion Finders</h3>
            <p className="text-[11px] text-stone-500 mt-0.5">Shade Finder (beauty) + Size Finder (apparel) — guides customers to the right variant</p>
          </div>
        </div>
        <StatusBadge active={isActive} partial={false} />
      </div>

      <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Prerequisites</p>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 divide-y divide-stone-100">
            <Req ok={config.whatsappConnected} label="WhatsApp connected" action={{ label: "Connect", tab: "settings" }} onNavigate={onNavigate} />
          </div>
          <div className="mt-3 text-[10px] text-stone-400 leading-relaxed">
            Customers text <span className="font-mono font-bold text-stone-600">SHADE</span> or <span className="font-mono font-bold text-stone-600">SIZE</span> to start — no template needed. Or drop the deep-link on your product pages.
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Deep-Link Generator</p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Product name (optional)"
                className="flex-1 border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:border-stone-900 bg-stone-50"
              />
              <button
                onClick={generateLinks}
                disabled={generatingLinks || !config.whatsappConnected}
                className="flex items-center gap-1.5 bg-stone-900 text-white px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-stone-700 disabled:opacity-40 cursor-pointer shrink-0"
              >
                {generatingLinks ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ruler className="w-3 h-3" />}
                Generate
              </button>
            </div>
            {links && (
              <div className="space-y-2 mt-2">
                {links.shade && (
                  <div className="bg-stone-50 border border-stone-200 px-3 py-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-black uppercase text-stone-500">Shade Finder Link</p>
                      <p className="text-[10px] text-stone-600 font-mono truncate max-w-[200px]">{links.shade}</p>
                    </div>
                    <a href={links.shade} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-stone-900 cursor-pointer">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
                {links.size && (
                  <div className="bg-stone-50 border border-stone-200 px-3 py-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-black uppercase text-stone-500">Size Finder Link</p>
                      <p className="text-[10px] text-stone-600 font-mono truncate max-w-[200px]">{links.size}</p>
                    </div>
                    <a href={links.size} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-stone-900 cursor-pointer">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
                <p className="text-[10px] text-stone-400">Paste these as &quot;Find my shade / size&quot; buttons on your Shopify product pages.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 pb-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">What this agent does</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            "3-tap Shade Diagnostic",
            "Anchor-based Size Finder",
            "Groq Brand-voice Reco",
            "Phone Capture via Keyword",
            "Storefront Deep-links",
            "Brand Tone Personalisation",
          ].map((f) => (
            <div key={f} className="flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3 py-1.5 text-[10px] font-semibold text-stone-600">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />{f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export const AgentsTab: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const orgId = params.orgId as string;

  const [config, setConfig] = useState<AgentConfig>({
    whatsappConnected: false,
    shopifyConnected: false,
    razorpayConnected: false,
    fulfillmentHoldEnabled: false,
    cartRecoveryDiscountCode: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/${orgId}/agents`);
      const data = await res.json();
      if (res.ok) setConfig(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const patch = async (payload: Partial<AgentConfig>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/org/${orgId}/agents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) setConfig((prev) => ({ ...prev, ...payload }));
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleNavigate = (tab: string) => {
    router.push(`${pathname}?tab=${tab}`, { scroll: false });
  };

  const activeCount = [
    config.whatsappConnected && config.shopifyConnected && config.razorpayConnected,
    config.whatsappConnected && config.shopifyConnected,
    config.whatsappConnected,
  ].filter(Boolean).length;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-[#fafaf9]">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-6 py-5 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-stone-900 flex items-center gap-2">
              <Bot className="w-5 h-5" /> AI Agents
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Autonomous revenue pipelines — activate once, run forever
            </p>
          </div>
          {/* Active agents progress indicator */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-700">
              {loading ? "—" : `${activeCount}/3 Agents Active`}
            </span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-5 h-1.5 rounded-full transition-colors ${!loading && i < activeCount ? "bg-[#25D366]" : "bg-stone-200"}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Info bar */}
        <div className="mt-4 bg-blue-50 border border-blue-100 px-4 py-2 text-xs text-blue-700">
          Configure autonomous revenue pipelines that run 24×7 on WhatsApp
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-48 h-32 border border-stone-200 bg-white animate-pulse" />
            <Loader2 className="w-5 h-5 animate-spin text-stone-300" />
          </div>
        </div>
      ) : (
        <div className="px-6 py-6 space-y-5 max-w-5xl">
          <RtoAgentCard
            config={config}
            saving={saving}
            onToggleHold={(v) => patch({ fulfillmentHoldEnabled: v })}
            onNavigate={handleNavigate}
          />
          <CartAgentCard
            config={config}
            saving={saving}
            onSaveDiscount={(code) => patch({ cartRecoveryDiscountCode: code })}
            onNavigate={handleNavigate}
          />
          <FindersAgentCard
            config={config}
            onNavigate={handleNavigate}
          />
        </div>
      )}
    </div>
  );
};
