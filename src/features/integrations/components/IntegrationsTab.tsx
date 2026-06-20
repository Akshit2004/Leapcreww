"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { notify } from "@/shared/lib/toast";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Link2,
  Link2Off,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  ShoppingBag,
  CreditCard,
  Truck,
  Eye,
  EyeOff,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ShopifyCredentials {
  shopDomain: string;
  accessToken: string;
  shopName: string;
}

interface StoredIntegration {
  status: string;
  apiKey: string | null;
  webhookUrl: string | null;
}



// ─── Constants ───────────────────────────────────────────────────────────────

const GUIDE_STEPS = [
  "Go to admin.shopify.com and open your store.",
  "Navigate to Settings → Apps and sales channels → Develop apps.",
  'Click "Create an app" and name it LeapCreww Integration.',
  "Under Configuration, enable Admin API scopes for Products, Orders, and Customers (read + write).",
  'Click "Install app" then copy the Admin API Access Token shown (starts with shpat_...).',
];

const WEBHOOK_TOPICS = [
  { topic: "orders/create", label: "New order placed" },
  { topic: "orders/fulfilled", label: "Order dispatched" },
  { topic: "checkouts/create", label: "Abandoned cart started" },
];

type IntegrationId = "shopify" | "razorpay" | "shiprocket";

interface IntegrationMeta {
  id: IntegrationId;
  name: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  badge: "live";
  accentColor: string;
}

const INTEGRATIONS: IntegrationMeta[] = [
  {
    id: "shopify",
    name: "Shopify",
    tagline: "Orders, carts & products",
    description:
      "Pull your live product catalog, receive order and cart events as webhooks, and trigger WhatsApp campaigns automatically when customers buy or abandon checkout.",
    icon: <ShoppingBag className="w-5 h-5" />,
    badge: "live",
    accentColor: "#96bf48",
  },
  {
    id: "razorpay",
    name: "Razorpay (Payments for Marketplace)",
    tagline: "Accept payments directly",
    description:
      "Link your Razorpay account to receive payments for your marketplace orders directly into your own account. Required to enable Marketplace Bot.",
    icon: <CreditCard className="w-5 h-5" />,
    badge: "live",
    accentColor: "#3395FF",
  },
  {
    id: "shiprocket",
    name: "Shiprocket",
    tagline: "Shipping & NDR automation",
    description:
      "Connect Shiprocket to automatically send WhatsApp notifications when orders ship, arrive out for delivery, or fail. NDR recovery flows fire instantly — reducing RTO before the courier retries.",
    icon: <Truck className="w-5 h-5" />,
    badge: "live",
    accentColor: "#F76A1A",
  },
];



// ─── Component ────────────────────────────────────────────────────────────────

export function IntegrationsTab() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;

  const [selected, setSelected] = useState<IntegrationId>("shopify");
  const [allIntegrations, setAllIntegrations] = useState<any[]>([]);
  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [srEmail, setSrEmail] = useState("");
  const [srPassword, setSrPassword] = useState("");
  const [srWebhookUrl, setSrWebhookUrl] = useState<string | null>(null);

  const [showToken, setShowToken] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [warningBanner, setWarningBanner] = useState<string | null>(null);

  const fetchIntegration = useCallback(async () => {
    const res = await fetch(`/api/org/${orgId}/integrations`);
    if (!res.ok) return;
    const data = await res.json();
    setAllIntegrations(data.integrations ?? []);
  }, [orgId]);

  const integration = allIntegrations.find(i => i.id === selected) || null;

  useEffect(() => {
    if (selected === "shopify" && integration?.apiKey) {
      try {
        const creds = JSON.parse(integration.apiKey);
        setShopDomain(creds.shopDomain ?? "");
      } catch {}
    } else if (selected === "razorpay" && integration?.apiKey) {
      try {
        const creds = JSON.parse(integration.apiKey);
        setKeyId(creds.keyId ?? "");
        setKeySecret(creds.keySecret ?? "");
        setWebhookSecret(creds.webhookSecret ?? "");
      } catch {}
    } else if (selected === "shiprocket" && integration?.apiKey) {
      try {
        const creds = JSON.parse(integration.apiKey);
        setSrEmail(creds.email ?? "");
      } catch {}
    }
  }, [selected, integration]);

  useEffect(() => {
    // Fetch-on-mount + read one-time OAuth redirect flags: synchronizing with
    // external systems (integration status API and URL query params).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchIntegration();

    const isSuccess = searchParams.get("success") === "true";
    const warningMsg = searchParams.get("warning");
    const errorMsg = searchParams.get("error");

    if (isSuccess) {
      setSuccessBanner("Shopify connected successfully! Programmatic webhooks have been registered.");
      router.replace(`/org/${orgId}`);
    }

    if (warningMsg) {
      const decoded = decodeURIComponent(warningMsg);
      if (!decoded.toLowerCase().includes("localhost")) {
        setWarningBanner(decoded);
      }
      router.replace(`/org/${orgId}`);
    }

    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
      router.replace(`/org/${orgId}`);
    }
  }, [orgId, searchParams, fetchIntegration, router]);

  const isConnected = integration?.status === "connected";

  const webhookReceiver =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/shopify`
      : "/api/webhooks/shopify";

  // 1-Click OAuth Connect
  function handleOAuthConnect() {
    if (!shopDomain) {
      setError("Please enter your Shopify Store Address.");
      return;
    }
    setError("");
    window.location.href = `/api/shopify/auth?shop=${encodeURIComponent(shopDomain)}&orgId=${orgId}`;
  }

  // Developer Mode Manual Credentials Connect
  async function handleConnect() {
    let body: any = { action: "connect", integrationId: selected };
    
    if (selected === "shopify") {
      if (!shopDomain || !accessToken) {
        setError("Store domain and access token are both required in Developer Mode.");
        return;
      }
      body = { ...body, shopDomain, accessToken };
    } else if (selected === "razorpay") {
      if (!keyId || !keySecret) {
        setError("Key ID and Key Secret are required.");
        return;
      }
      body = { ...body, keyId, keySecret, webhookSecret };
    } else if (selected === "shiprocket") {
      if (!srEmail || !srPassword) {
        setError("Shiprocket email and password are required.");
        return;
      }
      body = { ...body, email: srEmail, password: srPassword };
    }

    setError("");
    setConnecting(true);
    try {
      const res = await fetch(`/api/org/${orgId}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Connection failed.");
      } else {
        if (data.webhookWarning && !data.webhookWarning.toLowerCase().includes("localhost")) {
          setWarningBanner(data.webhookWarning);
        }
        if (data.webhookUrl) setSrWebhookUrl(data.webhookUrl);
        await fetchIntegration();
      }
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch(`/api/org/${orgId}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", integrationId: selected }),
      });
      if (selected === "shopify") {
        setShopDomain("");
        setAccessToken("");
      } else if (selected === "razorpay") {
        setKeyId("");
        setKeySecret("");
        setWebhookSecret("");
      } else if (selected === "shiprocket") {
        setSrEmail("");
        setSrPassword("");
        setSrWebhookUrl(null);
      }
      setSuccessBanner(null);
      setWarningBanner(null);
      await fetchIntegration();
    } catch {
    } finally {
      setDisconnecting(false);
    }
  }

  async function pollMetaCatalogProgress(toastId: string) {
    const POLL_INTERVAL_MS = 1200;
    const MAX_POLLS = 60; // ~72s ceiling so a stuck/dead progress entry can't poll forever

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const res = await fetch(`/api/org/${orgId}/integrations/shopify/sync/progress`);
      if (!res.ok) continue;
      const progress: { current: number; total: number; done: boolean } = await res.json();

      // done + total 0 means the batch sync finished without a metaCatalogId
      // configured — distinct from "hasn't started counting products yet".
      if (progress.done && progress.total === 0) {
        notify.update(
          toastId,
          "info",
          "WhatsApp catalog not configured",
          "Set a Meta Catalog ID in Settings to push synced products to WhatsApp."
        );
        return;
      }

      if (progress.total === 0) continue; // still counting products, keep polling

      notify.update(
        toastId,
        progress.done ? "success" : "loading",
        progress.done ? "WhatsApp catalog synced" : "Syncing to WhatsApp catalog",
        `${Math.min(progress.current, progress.total)} of ${progress.total} products`
      );

      if (progress.done) return;
    }

    notify.dismiss(toastId);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/org/${orgId}/integrations/shopify/sync`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setError("");
        setSuccessBanner(
          data.synced > 0
            ? `Synced ${data.synced} product${data.synced === 1 ? "" : "s"} from Shopify.`
            : "Sync ran, but no products were found in your Shopify store."
        );
        if (data.synced > 0) {
          const toastId = notify.loading("Syncing to WhatsApp catalog", "Starting...");
          pollMetaCatalogProgress(toastId);
        }
      } else {
        setError(data.error ?? "Sync failed.");
      }
    } catch {
      setError("Network error during sync.");
    } finally {
      setSyncing(false);
    }
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookReceiver);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const meta = INTEGRATIONS.find((i) => i.id === selected)!;

  return (
    <div className="flex h-full overflow-hidden bg-stone-100">
      {/* ── Left: Integration List (Shopify Only) ─────────────────────────── */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-stone-200 bg-white h-full max-lg:hidden lg:flex">
        <div className="px-5 pt-6 pb-4 border-b border-stone-100">
          <p className="kc-label text-stone-400 mb-1">
            Integration Hub
          </p>
          <h1 className="text-lg font-black tracking-tight text-stone-950 leading-none">
            Integrations
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 custom-scrollbar">
          {INTEGRATIONS.map((intg) => {
            const active = selected === intg.id;
            const shopifyConnected = intg.id === "shopify" && isConnected;
            return (
              <button
                key={intg.id}
                onClick={() => setSelected(intg.id as IntegrationId)}
                className={`w-full text-left px-3 py-3.5 mb-1 transition-all duration-150 border flex items-center gap-3 group ${
                  active
                    ? "bg-stone-950 border-stone-950 text-white"
                    : "border-transparent hover:border-stone-200 hover:bg-stone-50 text-stone-600"
                }`}
              >
                <div
                  className={`w-8 h-8 flex items-center justify-center shrink-0 transition-colors ${
                    active ? "text-white" : "text-stone-400 group-hover:text-stone-600"
                  }`}
                  style={
                    !active && shopifyConnected
                      ? { color: intg.accentColor }
                      : undefined
                  }
                >
                  {intg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold truncate ${
                        active ? "text-white" : "text-stone-900"
                      }`}
                    >
                      {intg.name}
                    </span>
                    <span
                      className={`text-[7px] font-black tracking-wider uppercase px-1.5 py-0.5 shrink-0 ${
                        shopifyConnected && !active
                          ? "bg-[#96bf48]/10 text-[#96bf48]"
                          : active
                          ? "bg-white/10 text-white/70"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {shopifyConnected && !active ? "On" : intg.badge}
                    </span>
                  </div>
                  <p
                    className={`text-[10px] mt-0.5 truncate ${
                      active ? "text-white/60" : "text-stone-400"
                    }`}
                  >
                    {intg.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-stone-100">
          <p className="text-[9px] text-stone-400 font-medium leading-relaxed">
            Need a custom integration?{" "}
            <span className="text-stone-600 font-bold underline decoration-stone-300 underline-offset-2 cursor-pointer hover:text-stone-900">
              Request via API
            </span>
          </p>
        </div>
      </aside>

      {/* ── Right: Detail Panel ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Detail Header */}
        <div className="shrink-0 px-8 pt-6 pb-5 border-b border-stone-200 bg-white flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 flex items-center justify-center border border-stone-200"
              style={{ color: meta.accentColor }}
            >
              {meta.icon}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-black text-stone-950 tracking-tight">{meta.name}</h2>
                <span className={isConnected ? "ds-badge ds-badge-success" : "ds-badge ds-badge-muted"}>
                  {isConnected ? "Connected" : "Not connected"}
                </span>
              </div>
              <p className="text-[10px] text-stone-500 font-medium mt-0.5">{meta.tagline}</p>
            </div>
          </div>

          {isConnected && (
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-stone-400">
              <div className="w-1.5 h-1.5 rounded-full bg-[#96bf48] animate-pulse" />
              Live sync active
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-stone-100">
          <div className="p-8 space-y-8 max-w-3xl">
            {/* Description */}
            <p className="text-sm text-stone-600 leading-relaxed font-medium border-l-2 border-stone-200 pl-4">
              {meta.description}
            </p>

            {/* Success Banner */}
            {successBanner && (
              <div className="flex items-start gap-2.5 px-4 py-3 border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>{successBanner}</div>
              </div>
            )}

            {/* Warning Banner */}
            {warningBanner && (
              <div className="flex items-start gap-2.5 px-4 py-3 border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>{warningBanner}</div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 px-4 py-3 border border-red-200 bg-red-50">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium leading-relaxed">{error}</p>
              </div>
            )}

            {/* ── Section: Credentials & Connection ── */}
            <section className="kc-float p-6 space-y-4">
              <h3 className="kc-label text-stone-400">
                {selected === "shopify" ? "Store Connection" : selected === "razorpay" ? "Razorpay Credentials" : "Shiprocket Credentials"}
              </h3>

              <div className="space-y-3">
                {/* Shopify Inputs */}
                {selected === "shopify" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 mb-1.5">
                        Shopify Store Domain
                      </label>
                      <div className="flex items-stretch border border-stone-200 bg-white focus-within:border-stone-400 transition-colors">
                        <span className="flex items-center px-3 text-[10px] text-stone-400 font-medium border-r border-stone-200 bg-stone-50 shrink-0">
                          https://
                        </span>
                        <input
                          type="text"
                          value={shopDomain}
                          onChange={(e) => {
                            setShopDomain(e.target.value);
                            setError("");
                          }}
                          placeholder="yourstore.myshopify.com"
                          disabled={isConnected}
                          className="flex-1 px-3 py-2.5 text-xs text-stone-900 bg-transparent outline-none placeholder:text-stone-300 disabled:text-stone-400 disabled:bg-stone-50"
                        />
                      </div>
                      {!isConnected && !manualMode && (
                        <p className="text-[9px] text-stone-400 mt-1.5 font-medium italic leading-relaxed">
                          Type your store domain (e.g. yourstore.myshopify.com) and click connect below.
                        </p>
                      )}
                    </div>

                    {manualMode && !isConnected && (
                      <div className="animate-fade-in">
                        <label className="block text-[10px] font-bold text-stone-600 mb-1.5">
                          Admin API Access Token (Developer Mode)
                        </label>
                        <div className="flex items-stretch border border-stone-200 bg-white focus-within:border-stone-400 transition-colors">
                          <input
                            type={showToken ? "text" : "password"}
                            value={accessToken}
                            onChange={(e) => {
                              setAccessToken(e.target.value);
                              setError("");
                            }}
                            placeholder="shpat_••••••••••••••••••••••••"
                            className="flex-1 px-3 py-2.5 text-xs font-mono text-stone-900 bg-transparent outline-none placeholder:text-stone-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowToken((v) => !v)}
                            className="px-3 border-l border-stone-200 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                          >
                            {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Shiprocket Inputs */}
                {selected === "shiprocket" && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 mb-1.5">Shiprocket Email</label>
                      <input
                        type="email"
                        value={srEmail}
                        onChange={(e) => { setSrEmail(e.target.value); setError(""); }}
                        disabled={isConnected}
                        className="ds-input !text-xs disabled:text-stone-400 disabled:bg-stone-50"
                        placeholder="you@brand.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 mb-1.5">Password</label>
                      <div className="flex items-stretch border border-stone-200 bg-white focus-within:border-stone-400 transition-colors">
                        <input
                          type={showToken ? "text" : "password"}
                          value={srPassword}
                          onChange={(e) => { setSrPassword(e.target.value); setError(""); }}
                          disabled={isConnected}
                          className="flex-1 px-3 py-2.5 text-xs font-mono text-stone-900 bg-transparent outline-none disabled:text-stone-400 disabled:bg-stone-50"
                          placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowToken(!showToken)} className="px-3 border-l border-stone-200 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer">
                          {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    {(isConnected || srWebhookUrl) && (
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-stone-600">Webhook URL — paste this in Shiprocket dashboard</label>
                        <div className="flex items-stretch border border-stone-200 bg-stone-50">
                          <code className="flex-1 px-3 py-2 text-[10px] font-mono text-stone-700 break-all">
                            {srWebhookUrl || `…/api/webhooks/shiprocket?orgId=${orgId}`}
                          </code>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(srWebhookUrl || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                            className="px-3 border-l border-stone-200 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer shrink-0"
                          >
                            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="text-[9px] text-stone-400">In Shiprocket: Settings → Channels → Webhooks → Add webhook URL above.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Razorpay Inputs */}
                {selected === "razorpay" && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 mb-1.5">Key ID</label>
                      <input
                        type="text"
                        value={keyId}
                        onChange={(e) => { setKeyId(e.target.value); setError(""); }}
                        disabled={isConnected}
                        className="ds-input !text-xs disabled:text-stone-400 disabled:bg-stone-50"
                        placeholder="rzp_live_..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 mb-1.5">Key Secret</label>
                      <div className="flex items-stretch border border-stone-200 bg-white focus-within:border-stone-400 transition-colors">
                        <input
                          type={showToken ? "text" : "password"}
                          value={keySecret}
                          onChange={(e) => { setKeySecret(e.target.value); setError(""); }}
                          disabled={isConnected}
                          className="flex-1 px-3 py-2.5 text-xs font-mono text-stone-900 bg-transparent outline-none disabled:text-stone-400 disabled:bg-stone-50"
                        />
                        <button type="button" onClick={() => setShowToken(!showToken)} className="px-3 border-l border-stone-200 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer">
                          {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 mb-1.5">Webhook Secret (Optional)</label>
                      <div className="flex items-stretch border border-stone-200 bg-white focus-within:border-stone-400 transition-colors">
                        <input
                          type={showToken ? "text" : "password"}
                          value={webhookSecret}
                          onChange={(e) => { setWebhookSecret(e.target.value); setError(""); }}
                          disabled={isConnected}
                          className="flex-1 px-3 py-2.5 text-xs font-mono text-stone-900 bg-transparent outline-none disabled:text-stone-400 disabled:bg-stone-50"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-1">
                {!isConnected ? (
                  (selected === "shopify" && !manualMode) ? (
                    // 1-Click Install Button (Default)
                    <button
                      type="button"
                      onClick={handleOAuthConnect}
                      className="ds-btn ds-btn-primary"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Connect via Shopify (1-Click Install)
                    </button>
                  ) : (
                    // Developer Mode Manual Install Button
                    <button
                      type="button"
                      onClick={handleConnect}
                      disabled={connecting}
                      className="ds-btn ds-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connecting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5" />
                      )}
                      {connecting ? "Connecting…" : selected === "shopify" ? "Connect Store (Developer)" : selected === "razorpay" ? "Link Razorpay" : "Connect Shiprocket"}
                    </button>
                  )
                ) : (
                  // Connected State Actions
                  <>
                    {selected === "shopify" && (
                      <button
                        type="button"
                        onClick={handleSync}
                        disabled={syncing}
                        className="ds-btn ds-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {syncing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        {syncing ? "Syncing…" : "Sync Catalog Now"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="ds-btn ds-btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {disconnecting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Link2Off className="w-3.5 h-3.5" />
                      )}
                      Disconnect
                    </button>
                  </>
                )}
              </div>

              {/* Mode Switcher */}
              {!isConnected && selected === "shopify" && (
                <div className="pt-2 text-left border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => {
                      setManualMode(!manualMode);
                      setError("");
                    }}
                    className="text-[9px] font-black text-stone-500 hover:text-stone-900 tracking-wide uppercase transition-colors underline decoration-stone-200 decoration-1 underline-offset-4 cursor-pointer"
                  >
                    {manualMode
                      ? "Or use simplified 1-Click OAuth (Recommended)"
                      : "Or connect manually using Custom App Access Token (Developer Mode)"}
                  </button>
                </div>
              )}
            </section>

            {/* ── Section: How to get your token (Developer Mode Only) ── */}
            {!isConnected && manualMode && selected === "shopify" && (
              <section className="kc-float animate-fade-in overflow-hidden">
                <button
                  type="button"
                  onClick={() => setGuideOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  <span className="text-[9px] font-black tracking-widest uppercase text-stone-600">
                    How to get your Admin API Token
                  </span>
                  {guideOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                  )}
                </button>

                {guideOpen && (
                  <div className="border-t border-stone-200 divide-y divide-stone-100 bg-[#fafaf9]">
                    {GUIDE_STEPS.map((text, i) => (
                      <div key={i} className="flex items-start gap-4 px-5 py-4">
                        <div className="w-6 h-6 shrink-0 bg-stone-950 text-white flex items-center justify-center text-[9px] font-black">
                          {i + 1}
                        </div>
                        <p className="text-xs text-stone-600 font-medium leading-relaxed pt-0.5">
                          {text}
                        </p>
                      </div>
                    ))}
                    <div className="px-5 py-3">
                      <a
                        href="https://help.shopify.com/en/manual/apps/app-types/custom-apps"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[9px] font-black tracking-wide uppercase text-stone-500 hover:text-stone-900 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Shopify Custom Apps Docs
                      </a>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── Section: Webhooks Details ── */}
            {selected === "shopify" && (
              <section className="kc-float p-6">
                {/* Webhook Receiver */}
                <div className="space-y-2">
                  <h4 className="kc-label text-stone-400">
                    Webhook Receiver URL
                  </h4>
                  <div className="flex items-stretch border border-stone-200 bg-stone-50 focus-within:border-stone-400 transition-colors">
                    <input
                      readOnly
                      value={webhookReceiver}
                      className="flex-1 px-3 py-2 text-[10px] font-mono text-stone-600 bg-transparent outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={copyWebhook}
                      className="px-3 border-l border-stone-200 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer bg-white"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {copied && (
                    <p className="text-[9px] text-[#96bf48] font-bold tracking-wide">
                      Copied to clipboard.
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* ── Section: Active Webhooks ── */}
            {isConnected && integration?.webhookUrl && selected === "shopify" && (
              <section className="kc-float p-6 space-y-3">
                <h4 className="kc-label text-stone-400">
                  Active Webhook Subscriptions
                </h4>
                <div className="grid sm:grid-cols-3 gap-3">
                  {WEBHOOK_TOPICS.map((item) => (
                    <div
                      key={item.topic}
                      className="ds-card-flat p-3 flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#96bf48] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-stone-900">{item.label}</p>
                        <p className="text-[8px] font-mono text-stone-400 mt-0.5">{item.topic}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
