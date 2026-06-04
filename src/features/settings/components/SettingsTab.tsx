"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/shared/context/AppContext";
import {
  CheckCircle2,
  XCircle,
  Loader,
  Unplug,
  Phone,
  Building2,
  Globe,
  Shield,
  RefreshCw,
  Sparkles,
  Save,
} from "lucide-react";
import type { BrandProfile } from "@/shared/context/types";

// ─── Facebook SDK helpers (avoids conflicts with @types/facebook-js-sdk) ────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFB(): any | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).FB;
}
 
function setFbAsyncInit(fn: () => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).fbAsyncInit = fn;
}

interface PortfolioItem {
  wabaId: string;
  name: string;
  phoneNumbers: {
    id: string;
    display_phone_number: string;
    verified_name?: string;
    quality_rating?: string;
  }[];
}

export const SettingsTab: React.FC = () => {
  const { organization, refreshWorkspace, updateBrandProfile } = useApp();
  const orgId = organization?.id;

  // ─── Brand Profile (Brand-Aware AI content generation) ────────────────
  const [brandName, setBrandName] = useState("");
  const [brandIndustry, setBrandIndustry] = useState("");
  const [brandTone, setBrandTone] = useState("");
  const [brandWebsite, setBrandWebsite] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [syncedBrandKey, setSyncedBrandKey] = useState<string | null>(null);

  const [whatsappStatus, setWhatsappStatus] = useState<{
    connected: boolean;
    businessAccountId: string | null;
    phoneNumberId: string | null;
    businessId: string | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selection state (when multiple WABAs/phones found)
  const [selectionRequired, setSelectionRequired] = useState(false);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [selectedWaba, setSelectedWaba] = useState<string>("");
  const [selectedPhone, setSelectedPhone] = useState<string>("");
  const [connectBusinessId, setConnectBusinessId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ─── Load FB SDK ────────────────────────────────────────────────────────
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!appId) return;

    // Only load once
    if (document.getElementById("facebook-jssdk")) return;

    setFbAsyncInit(function () {
      getFB()?.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v21.0",
      });
    });

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  }, []);

  // ─── Fetch Connection Status ──────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/status?orgId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setWhatsappStatus(data);
      }
    } catch {
      console.error("Failed to fetch WhatsApp status");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    // Fetch-on-mount: synchronizing with an external system (WhatsApp status API).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatus();
  }, [fetchStatus]);

  // ─── Seed Brand Profile fields from loaded organization ───────────────
  // The org loads asynchronously (and updates on save), so we sync the form
  // fields whenever the persisted profile content changes — using React's
  // render-time state adjustment rather than an effect. Typing into the
  // inputs doesn't change the persisted profile, so edits are never clobbered.
  const persistedBrand = (organization?.brandProfile as BrandProfile | null | undefined) ?? null;
  const persistedBrandKey = persistedBrand ? JSON.stringify(persistedBrand) : null;
  if (persistedBrandKey !== syncedBrandKey) {
    setSyncedBrandKey(persistedBrandKey);
    setBrandName(persistedBrand?.name || "");
    setBrandIndustry(persistedBrand?.industry || "");
    setBrandTone(persistedBrand?.toneOfVoice || "");
    setBrandWebsite(persistedBrand?.websiteUrl || "");
  }

  const handleSaveBrand = async () => {
    if (!orgId || !brandName.trim()) {
      setBrandError("Brand name is required.");
      return;
    }
    setSavingBrand(true);
    setBrandError(null);
    setBrandSaved(false);
    try {
      await updateBrandProfile(orgId, {
        name: brandName.trim(),
        industry: brandIndustry.trim(),
        toneOfVoice: brandTone.trim(),
        websiteUrl: brandWebsite.trim(),
      });
      setBrandSaved(true);
      setTimeout(() => setBrandSaved(false), 2500);
    } catch (err) {
      setBrandError(err instanceof Error ? err.message : "Failed to save brand profile.");
    } finally {
      setSavingBrand(false);
    }
  };

  // ─── Embedded Signup Launch ───────────────────────────────────────────
  const launchEmbeddedSignup = () => {
    setError(null);
    setSuccessMsg(null);

    const fb = getFB();
    if (!fb) {
      setError("Facebook SDK not loaded. Please refresh and try again.");
      return;
    }

    setConnecting(true);

    fb.login(
      (response: { authResponse?: { code?: string }; status?: string }) => {
        if (response.authResponse?.code) {
          handleSignupCallback(response.authResponse.code);
        } else {
          setConnecting(false);
          setError("Signup was cancelled or failed. Please try again.");
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

  // ─── Handle Signup Callback ───────────────────────────────────────────
  const handleSignupCallback = async (code: string) => {
    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Connection failed");
        setConnecting(false);
        return;
      }

      if (data.status === "connected") {
        // Auto-connected (single WABA + single phone)
        setSuccessMsg(`Connected! Phone: ${data.displayPhoneNumber}`);
        setSelectionRequired(false);
        await fetchStatus();
        if (orgId) await refreshWorkspace(orgId);
      } else if (data.status === "selection_required") {
        // Multiple WABAs or phones — show selection UI
        setPortfolios(data.portfolios || []);
        setConnectBusinessId(data.businessId);
        setSelectionRequired(true);

        // Pre-select first option
        if (data.portfolios?.length > 0) {
          setSelectedWaba(data.portfolios[0].wabaId);
          if (data.portfolios[0].phoneNumbers?.length > 0) {
            setSelectedPhone(data.portfolios[0].phoneNumbers[0].id);
          }
        }
      }
    } catch {
      setError("Network error during connection. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  // ─── Confirm Selection ────────────────────────────────────────────────
  const confirmSelection = async () => {
    if (!selectedWaba || !selectedPhone || !orgId) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/whatsapp/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          wabaId: selectedWaba,
          phoneNumberId: selectedPhone,
        }),
      });

      if (res.ok) {
        // Also store business ID if available
        if (connectBusinessId) {
          // Business ID is already stored by the connect endpoint for auto-connect
          // For manual selection, we update it via a separate call
        }

        setSuccessMsg("WhatsApp Business Account connected successfully!");
        setSelectionRequired(false);
        setPortfolios([]);
        await fetchStatus();
        await refreshWorkspace(orgId);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save selection");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Disconnect ───────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!orgId) return;
    
    const confirmed = window.confirm(
      "Disconnect WhatsApp? You will need to re-connect via Embedded Signup to send messages again."
    );
    if (!confirmed) return;

    setDisconnecting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/whatsapp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      if (res.ok) {
        setSuccessMsg("WhatsApp disconnected.");
        await fetchStatus();
        await refreshWorkspace(orgId);
      } else {
        setError("Failed to disconnect. Please try again.");
      }
    } catch {
      setError("Network error during disconnection.");
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = whatsappStatus?.connected;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up bg-[#fafaf9]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900 uppercase">Settings</h2>
          <p className="text-stone-500 text-xs mt-1">Manage your WhatsApp Business connection and workspace settings.</p>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-4 py-3 rounded-xl flex items-center gap-2 animate-slide-up">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-4 py-3 rounded-xl flex items-center gap-2 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* WhatsApp Connection Card */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isConnected ? "bg-emerald-100 text-emerald-600" : "bg-stone-100 text-stone-400"}`}>
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">WhatsApp Business Connection</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-stone-300"}`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isConnected ? "text-emerald-600" : "text-stone-400"}`}>
                  {loading ? "Checking..." : isConnected ? "Connected" : "Not Connected"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader className="w-5 h-5 animate-spin text-stone-400" />
          </div>
        ) : isConnected ? (
          /* ─── Connected State ─────────────────────────────────── */
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-stone-50 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-stone-400">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">WABA ID</span>
                </div>
                <p className="text-xs font-mono font-bold text-stone-700 break-all">
                  {whatsappStatus?.businessAccountId || "—"}
                </p>
              </div>
              <div className="bg-stone-50 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-stone-400">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Phone Number ID</span>
                </div>
                <p className="text-xs font-mono font-bold text-stone-700 break-all">
                  {whatsappStatus?.phoneNumberId || "—"}
                </p>
              </div>
              <div className="bg-stone-50 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-stone-400">
                  <Globe className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Business ID</span>
                </div>
                <p className="text-xs font-mono font-bold text-stone-700 break-all">
                  {whatsappStatus?.businessId || "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => fetchStatus()}
                className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Status
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {disconnecting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
                Disconnect
              </button>
            </div>
          </div>
        ) : selectionRequired ? (
          /* ─── WABA Selection State ────────────────────────────── */
          <div className="p-6 space-y-5">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-blue-700 text-xs font-semibold">
                Multiple WhatsApp Business Accounts found. Please select the account and phone number to connect.
              </p>
            </div>

            {portfolios.map((portfolio) => (
              <div key={portfolio.wabaId} className="border border-stone-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => {
                    setSelectedWaba(portfolio.wabaId);
                    if (portfolio.phoneNumbers.length > 0) {
                      setSelectedPhone(portfolio.phoneNumbers[0].id);
                    }
                  }}
                  className={`w-full p-4 text-left transition-all cursor-pointer ${
                    selectedWaba === portfolio.wabaId 
                      ? "bg-emerald-50 border-b border-emerald-100" 
                      : "bg-stone-50 hover:bg-stone-100 border-b border-stone-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-stone-900">{portfolio.name}</p>
                      <p className="text-[10px] font-mono text-stone-400 mt-0.5">{portfolio.wabaId}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${selectedWaba === portfolio.wabaId ? "border-emerald-500 bg-emerald-500" : "border-stone-300"}`} />
                  </div>
                </button>

                {selectedWaba === portfolio.wabaId && (
                  <div className="p-4 space-y-2 bg-white">
                    {portfolio.phoneNumbers.map((phone) => (
                      <button
                        key={phone.id}
                        onClick={() => setSelectedPhone(phone.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${
                          selectedPhone === phone.id 
                            ? "bg-emerald-50 border border-emerald-200" 
                            : "bg-stone-50 hover:bg-stone-100 border border-stone-100"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-stone-800">{phone.display_phone_number}</p>
                          {phone.verified_name && (
                            <p className="text-[10px] text-stone-400 mt-0.5">{phone.verified_name}</p>
                          )}
                        </div>
                        <div className={`w-3.5 h-3.5 rounded-full border-2 ${selectedPhone === phone.id ? "border-emerald-500 bg-emerald-500" : "border-stone-300"}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="flex gap-3">
              <button
                onClick={confirmSelection}
                disabled={!selectedWaba || !selectedPhone || saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Connect Selected Account
              </button>
              <button
                onClick={() => { setSelectionRequired(false); setPortfolios([]); }}
                className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ─── Not Connected State ─────────────────────────────── */
          <div className="p-6 space-y-5">
            <div className="bg-stone-50 border border-stone-100 rounded-xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-stone-400 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-xs text-stone-600 font-semibold leading-relaxed">
                    Connect your WhatsApp Business Account to start sending messages, managing templates, and receiving inbound conversations.
                  </p>
                  <ul className="text-[11px] text-stone-500 space-y-1.5 list-none">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      Your WhatsApp number stays yours — we never take ownership
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      We never store your Facebook/Meta login credentials
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      You can disconnect anytime from this settings page
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={launchEmbeddedSignup}
              disabled={connecting}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold text-sm rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 cursor-pointer disabled:opacity-60"
            >
              {connecting ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.594-.818-6.34-2.192l-.442-.352-3.25 1.09 1.09-3.25-.352-.442A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                </svg>
              )}
              {connecting ? "Connecting..." : "Connect with WhatsApp"}
            </button>
          </div>
        )}
      </div>

      {/* Brand Profile Card */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-100 text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Brand Profile</h3>
              <p className="text-stone-400 text-[11px] mt-0.5">
                Powers Brand-Aware AI so generated templates sound like your business.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Brand Name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Aurora Coffee Co."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Industry</label>
              <input
                type="text"
                value={brandIndustry}
                onChange={(e) => setBrandIndustry(e.target.value)}
                placeholder="e.g. E-commerce, EdTech, D2C"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Tone of Voice</label>
              <input
                type="text"
                value={brandTone}
                onChange={(e) => setBrandTone(e.target.value)}
                placeholder="e.g. Professional, Friendly, Urgent, Playful"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Website URL</label>
              <input
                type="url"
                value={brandWebsite}
                onChange={(e) => setBrandWebsite(e.target.value)}
                placeholder="e.g. https://www.auroracoffee.com"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900 transition-all"
              />
            </div>
          </div>

          {brandError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-4 py-2.5 rounded-xl flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              {brandError}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSaveBrand}
              disabled={savingBrand || !brandName.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {savingBrand ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {savingBrand ? "Saving..." : "Save Profile"}
            </button>
            {brandSaved && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Security Info */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <h3 className="font-bold text-stone-900 text-sm mb-3">Security & Privacy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-stone-50 rounded-xl p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Token Architecture</p>
            <p className="text-xs text-stone-600 font-medium">System User Token — platform-level, never exposed to tenants</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Data Stored</p>
            <p className="text-xs text-stone-600 font-medium">WABA ID, Phone Number ID, Business ID — no access tokens</p>
          </div>
        </div>
      </div>
    </div>
  );
};
