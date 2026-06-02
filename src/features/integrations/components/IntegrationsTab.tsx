"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Plug,
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
  Eye,
  EyeOff,
  ArrowRight,
  Clock,
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

interface ActivityEntry {
  id: number;
  time: string;
  message: string;
  type: "success" | "error" | "info";
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GUIDE_STEPS = [
  "Go to admin.shopify.com and open your store.",
  "Navigate to Settings → Apps and sales channels → Develop apps.",
  'Click "Create an app" and name it WappFlow Integration.',
  "Under Configuration, enable Admin API scopes for Products, Orders, and Customers (read + write).",
  'Click "Install app" then copy the Admin API Access Token shown (starts with shpat_...).',
];

const WEBHOOK_TOPICS = [
  { topic: "orders/create", label: "New order placed" },
  { topic: "orders/fulfilled", label: "Order dispatched" },
  { topic: "checkouts/create", label: "Abandoned cart started" },
];

type IntegrationId = "shopify" | "woocommerce" | "zapier" | "gsheets";

interface IntegrationMeta {
  id: IntegrationId;
  name: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  badge: "live" | "beta" | "soon";
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
];

// ─── Helper ───────────────────────────────────────────────────────────────────

let _logId = 0;
function makeLogId() {
  return ++_logId;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IntegrationsTab() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [selected, setSelected] = useState<IntegrationId>("shopify");
  const [integration, setIntegration] = useState<StoredIntegration | null>(null);
  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  const addActivity = useCallback((message: string, type: ActivityEntry["type"] = "info") => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
    setActivity((prev) => [{ id: makeLogId(), time, message, type }, ...prev].slice(0, 20));
  }, []);

  const fetchIntegration = useCallback(async () => {
    const res = await fetch(`/api/org/${orgId}/integrations`);
    if (!res.ok) return;
    const data = await res.json();
    setIntegration(data.integration ?? null);
    if (data.integration?.apiKey) {
      try {
        const creds: ShopifyCredentials = JSON.parse(data.integration.apiKey);
        setShopDomain(creds.shopDomain ?? "");
      } catch {}
    }
  }, [orgId]);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  const isConnected = integration?.status === "connected";

  const webhookReceiver =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/shopify`
      : "/api/webhooks/shopify";

  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  async function handleConnect() {
    if (!shopDomain || !accessToken) {
      setError("Store domain and access token are both required.");
      return;
    }
    setError("");
    setConnecting(true);
    addActivity("Verifying credentials with Shopify API…", "info");
    try {
      const res = await fetch(`/api/org/${orgId}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain, accessToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Connection failed.");
        addActivity(data.error ?? "Connection failed.", "error");
      } else {
        addActivity(`Connected to "${data.shopName}".`, "success");
        if (data.webhooksRegistered?.length) {
          addActivity(
            `${data.webhooksRegistered.length} webhook topic(s) registered.`,
            "success"
          );
        }
        if (data.webhookWarning) addActivity(data.webhookWarning, "info");
        await fetchIntegration();
      }
    } catch {
      setError("Network error — check your connection and try again.");
      addActivity("Network error.", "error");
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
        body: JSON.stringify({ action: "disconnect" }),
      });
      setIntegration(null);
      setShopDomain("");
      setAccessToken("");
      addActivity("Store disconnected.", "info");
    } catch {
      addActivity("Error disconnecting.", "error");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    addActivity("Fetching catalog from Shopify…", "info");
    try {
      const res = await fetch(`/api/webhooks/shopify?action=sync&orgId=${orgId}`);
      const data = await res.json();
      if (res.ok) {
        addActivity(`${data.synced} product(s) imported into WappFlow.`, "success");
      } else {
        addActivity(data.error ?? "Sync failed.", "error");
      }
    } catch {
      addActivity("Network error during sync.", "error");
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
    <div className="flex h-full overflow-hidden bg-[#fafaf9]">
      {/* ── Left: Integration List ─────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-stone-200 bg-white h-full hidden lg:flex">
        <div className="px-5 pt-6 pb-4 border-b border-stone-100">
          <p className="text-[9px] font-black tracking-[0.15em] uppercase text-stone-400 mb-1">
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
                onClick={() => setSelected(intg.id)}
                disabled={intg.badge === "soon"}
                className={`w-full text-left px-3 py-3.5 mb-1 transition-all duration-150 border flex items-center gap-3 group cursor-pointer disabled:cursor-not-allowed ${
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
                          : intg.badge === "live"
                          ? "bg-stone-100 text-stone-500"
                          : "bg-stone-50 text-stone-400"
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
                {meta.id === "shopify" && (
                  <span
                    className={`text-[8px] font-black tracking-widest uppercase px-2 py-0.5 border ${
                      isConnected
                        ? "border-[#96bf48]/30 text-[#96bf48] bg-[#96bf48]/5"
                        : "border-stone-200 text-stone-400 bg-stone-50"
                    }`}
                  >
                    {isConnected ? "Connected" : "Not connected"}
                  </span>
                )}
                {meta.badge !== "live" && (
                  <span className="text-[8px] font-black tracking-widest uppercase px-2 py-0.5 border border-stone-200 text-stone-400 bg-stone-50">
                    {meta.badge}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-stone-500 font-medium mt-0.5">{meta.tagline}</p>
            </div>
          </div>

          {meta.id === "shopify" && isConnected && (
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-stone-400">
              <div className="w-1.5 h-1.5 rounded-full bg-[#96bf48] animate-pulse" />
              Live sync active
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* ── Shopify Detail ── */}
          {meta.id === "shopify" && (
            <div className="p-8 space-y-8 max-w-3xl">
              {/* Description */}
              <p className="text-sm text-stone-600 leading-relaxed font-medium border-l-2 border-stone-200 pl-4">
                {meta.description}
              </p>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 px-4 py-3 border border-red-200 bg-red-50">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-medium leading-relaxed">{error}</p>
                </div>
              )}

              {/* ── Section: Credentials ── */}
              <section className="space-y-4">
                <h3 className="text-[9px] font-black tracking-[0.15em] uppercase text-stone-400">
                  Store Credentials
                </h3>

                <div className="space-y-3">
                  {/* Domain */}
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 mb-1.5">
                      Store Domain
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
                  </div>

                  {/* Token */}
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 mb-1.5">
                      Admin API Access Token
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
                        disabled={isConnected}
                        className="flex-1 px-3 py-2.5 text-xs font-mono text-stone-900 bg-transparent outline-none placeholder:text-stone-300 disabled:text-stone-400 disabled:bg-stone-50"
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
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-1">
                  {!isConnected ? (
                    <button
                      onClick={handleConnect}
                      disabled={connecting}
                      className="flex items-center gap-2 px-5 py-2.5 bg-stone-950 text-white text-[9px] font-black tracking-widest uppercase hover:bg-stone-800 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {connecting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5" />
                      )}
                      {connecting ? "Connecting…" : "Connect Store"}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-2 px-5 py-2.5 text-white text-[9px] font-black tracking-widest uppercase transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        style={{ backgroundColor: "#96bf48" }}
                      >
                        {syncing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        {syncing ? "Syncing…" : "Sync Catalog Now"}
                      </button>
                      <button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="flex items-center gap-2 px-4 py-2.5 text-stone-500 border border-stone-200 text-[9px] font-black tracking-widest uppercase hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
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
              </section>

              {/* ── Section: How to get your token ── */}
              {!isConnected && (
                <section>
                  <button
                    onClick={() => setGuideOpen((v) => !v)}
                    className="flex items-center gap-2 text-[9px] font-black tracking-widest uppercase text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                  >
                    {guideOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    How to get your Admin API Token
                  </button>

                  {guideOpen && (
                    <div className="mt-4 border border-stone-200 bg-white divide-y divide-stone-100">
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
                      <div className="px-5 py-3 bg-stone-50">
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

              {/* ── Section: Webhooks ── */}
              <section className="space-y-4">
                <h3 className="text-[9px] font-black tracking-[0.15em] uppercase text-stone-400">
                  Webhook Configuration
                </h3>

                {/* Receiver URL */}
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 mb-1.5">
                    WappFlow Receiver URL
                  </label>
                  <div className="flex items-stretch border border-stone-200 bg-stone-50">
                    <input
                      readOnly
                      value={webhookReceiver}
                      className="flex-1 px-3 py-2.5 text-[10px] font-mono text-stone-500 bg-transparent outline-none select-all"
                    />
                    <button
                      onClick={copyWebhook}
                      className="flex items-center gap-1.5 px-3 border-l border-stone-200 text-[9px] font-bold text-stone-400 hover:text-stone-700 transition-colors cursor-pointer shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Localhost Warning */}
                {isLocalhost && (
                  <div className="border border-amber-200 bg-amber-50 px-5 py-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-[9px] font-black tracking-widest uppercase text-amber-700">
                        Local environment detected
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                      Shopify cannot reach{" "}
                      <code className="font-mono bg-amber-100 px-1">localhost</code>. Use a public
                      tunnel so Shopify can POST events to WappFlow:
                    </p>
                    <div className="bg-white border border-amber-200 divide-y divide-amber-100">
                      {[
                        "ngrok http 3000",
                        "cloudflared tunnel --url http://localhost:3000",
                      ].map((cmd) => (
                        <div key={cmd} className="px-3 py-2 font-mono text-[10px] text-stone-700">
                          {cmd}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-amber-600 font-medium">
                      Replace <code className="font-mono">localhost:3000</code> in the URL above
                      with your tunnel domain, then paste it into Shopify Admin under webhook
                      settings.
                    </p>
                  </div>
                )}

                {/* Active webhook topics */}
                {isConnected && (
                  <div className="border border-stone-200 bg-white">
                    <div className="px-5 py-3 border-b border-stone-100">
                      <span className="text-[9px] font-black tracking-[0.15em] uppercase text-stone-500">
                        Active subscriptions
                      </span>
                    </div>
                    <div className="divide-y divide-stone-100">
                      {WEBHOOK_TOPICS.map(({ topic, label }) => (
                        <div
                          key={topic}
                          className="flex items-center justify-between px-5 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#96bf48" }} />
                            <span className="text-xs font-medium text-stone-700">{label}</span>
                          </div>
                          <span className="text-[9px] font-mono text-stone-400">{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* ── Section: Recent Activity ── */}
              {activity.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-[9px] font-black tracking-[0.15em] uppercase text-stone-400">
                    Recent Activity
                  </h3>
                  <div className="border border-stone-200 bg-white divide-y divide-stone-100">
                    {activity.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-4 px-5 py-3">
                        <div className="flex items-center gap-2 shrink-0 pt-0.5">
                          <Clock className="w-3 h-3 text-stone-300" />
                          <span className="text-[9px] font-mono text-stone-400">{entry.time}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              entry.type === "success"
                                ? "bg-[#96bf48]"
                                : entry.type === "error"
                                ? "bg-red-400"
                                : "bg-stone-300"
                            }`}
                          />
                          <span
                            className={`text-xs font-medium leading-relaxed ${
                              entry.type === "success"
                                ? "text-stone-700"
                                : entry.type === "error"
                                ? "text-red-600"
                                : "text-stone-500"
                            }`}
                          >
                            {entry.message}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ── Non-Shopify Placeholder ── */}
          {meta.id !== "shopify" && (
            <div className="flex flex-col items-start justify-center h-full px-16 py-20 max-w-xl">
              <div
                className="w-12 h-12 flex items-center justify-center border border-stone-200 mb-6"
                style={{ color: meta.accentColor }}
              >
                {meta.icon}
              </div>
              <span className="text-[9px] font-black tracking-[0.15em] uppercase text-stone-400 mb-2">
                {meta.badge === "beta" ? "Private Beta" : "Coming Soon"}
              </span>
              <h2 className="text-2xl font-black text-stone-950 tracking-tight mb-3 leading-tight">
                {meta.name} is on the roadmap.
              </h2>
              <p className="text-sm text-stone-500 font-medium leading-relaxed mb-6">
                {meta.description}
              </p>
              <button className="flex items-center gap-2 px-5 py-2.5 border border-stone-950 text-stone-950 text-[9px] font-black tracking-widest uppercase hover:bg-stone-950 hover:text-white transition-colors cursor-pointer">
                Request Early Access
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Mobile: stacked view (no left sidebar) ── */}
      <style jsx global>{`
        @media (max-width: 1023px) {
          .integrations-mobile-nav {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
}
