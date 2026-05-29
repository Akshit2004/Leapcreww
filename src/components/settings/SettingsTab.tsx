"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Globe, Phone, CheckCircle2, Loader, AlertCircle, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";

interface PhoneNumber {
  id: string;
  display_phone_number: string;
  quality_rating?: string;
}

interface Waba {
  wabaId: string;
  name: string;
  phoneNumbers: PhoneNumber[];
}

interface PortfolioData {
  activeWabaId: string | null;
  activePhoneNumberId: string | null;
  portfolios: Waba[];
}

export const SettingsTab: React.FC = () => {
  const params = useParams();
  const orgId = params.orgId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<PortfolioData | null>(null);
  const [linking, setLinking] = useState<string | null>(null);

  const [hasSystemAccess, setHasSystemAccess] = useState<boolean | null>(null);
  const [accessChecking, setAccessChecking] = useState(true);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (orgId) {
      const load = async () => {
        setLoading(true);
        setError("");
        try {
          const res = await fetch(`/api/whatsapp/portfolio?orgId=${orgId}`);
          if (!res.ok) {
            if (res.status === 404) {
              setError("WhatsApp is not connected yet. Please connect via Facebook from the sidebar first.");
            } else {
              setError("Failed to load Facebook Portfolio data.");
            }
            setLoading(false);
            return;
          }
          const json = await res.json();
          setData(json);

          // Check system user access
          const accessRes = await fetch(`/api/whatsapp/partner-invite?orgId=${orgId}`);
          if (accessRes.ok) {
            const accessData = await accessRes.json();
            setHasSystemAccess(accessData.hasAccess);
          }
        } catch (err: unknown) {
          setError(err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "An unexpected error occurred.");
        } finally {
          setAccessChecking(false);
          setLoading(false);
        }
      };
      load();
    }
  }, [orgId]);

  const handleGenerateInvite = async () => {
    setInviteLoading(true);
    try {
      const res = await fetch("/api/whatsapp/partner-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (res.ok) {
        const data = await res.json();
        setInviteUrl(data.url);
        window.open(data.url, "_blank");
      } else {
        alert("Failed to generate invite link. Make sure META_BUSINESS_MANAGER_ID is configured.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRefreshAccess = async () => {
    setAccessChecking(true);
    try {
      const res = await fetch(`/api/whatsapp/partner-invite?orgId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setHasSystemAccess(data.hasAccess);
      }
    } catch {
      setHasSystemAccess(null);
    } finally {
      setAccessChecking(false);
    }
  };

  const handleLinkNumber = async (wabaId: string, phoneNumberId: string) => {
    setLinking(phoneNumberId);
    try {
      const res = await fetch("/api/whatsapp/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, wabaId, phoneNumberId }),
      });
      if (res.ok) {
        // Optimistically update
        setData((prev) => prev ? { ...prev, activeWabaId: wabaId, activePhoneNumberId: phoneNumberId } : null);
        // Dispatch custom event to let Sidebar know it needs to refresh connection status
        // Not strictly necessary since they share orgId, but good practice if needed.
        window.location.reload();
      } else {
        alert("Failed to link phone number.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setLinking(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up bg-[#fafaf9]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900 uppercase">Settings</h2>
          <p className="text-stone-500 text-xs mt-1">Manage your workspace configuration and WhatsApp connection.</p>
        </div>
      </div>

      {/* System User Access Status */}
      <div className="bg-white p-6 rounded-none border border-stone-200 flex flex-col shadow-none max-w-3xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2 mb-6">
          <ShieldCheck className="w-5 h-5 text-stone-900" />
          System User Access
        </h3>
        {error ? null : accessChecking ? (
          <div className="flex items-center gap-2 p-3 border border-stone-200 bg-stone-50">
            <Loader className="w-4 h-4 animate-spin text-stone-500" />
            <span className="text-xs text-stone-500 font-semibold">Checking System User access...</span>
          </div>
        ) : hasSystemAccess === true ? (
          <div className="flex items-center justify-between p-3 border border-green-300 bg-green-50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-700" />
              <span className="text-xs font-bold text-green-800 uppercase">System User has access to this WABA</span>
            </div>
            <button
              onClick={handleRefreshAccess}
              disabled={accessChecking}
              className="flex items-center gap-1 px-3 py-1 text-[10px] font-bold text-green-800 border border-green-300 hover:bg-green-100 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-3 border border-amber-300 bg-amber-50">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="text-xs font-bold text-amber-800 uppercase">System User does NOT have access to this WABA</span>
            </div>
            <p className="text-[10px] text-amber-700">
              Your System User needs to be added to this WABA before you can send messages. Click below to generate an invitation link for the customer's Business Manager.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateInvite}
                disabled={inviteLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-stone-950 text-white text-[10px] font-bold uppercase tracking-wider border border-stone-950 hover:bg-stone-900 cursor-pointer disabled:opacity-50"
              >
                {inviteLoading ? <Loader className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                {inviteLoading ? "Generating..." : "Generate Invite Link"}
              </button>
              <button
                onClick={handleRefreshAccess}
                disabled={accessChecking}
                className="flex items-center gap-1 px-3 py-2 text-[10px] font-bold text-stone-700 border border-stone-300 hover:bg-stone-100 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3 h-3" /> Check Again
              </button>
            </div>
            {inviteUrl && (
              <div className="mt-1 p-2 bg-white border border-stone-200 text-[10px] text-stone-600 break-all">
                <span className="font-bold">Invite URL:</span>{" "}
                <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className="underline text-stone-900">
                  {inviteUrl}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-none border border-stone-200 flex flex-col shadow-none max-w-3xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2 mb-6">
          <Globe className="w-5 h-5 text-stone-900" />
          Facebook Portfolio Management
        </h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-3 bg-[#fafaf9] border border-stone-200">
            <Loader className="w-6 h-6 animate-spin text-stone-900" />
            <span className="text-xs text-stone-500 font-bold uppercase">Loading Portfolio...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 bg-stone-50 border border-stone-300 rounded-none text-stone-900 font-semibold text-xs">
            <AlertCircle className="w-5 h-5 text-stone-900 shrink-0" />
            <p>{error}</p>
          </div>
        ) : data && data.portfolios.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-3 p-6 border border-dashed border-stone-300 rounded-none bg-stone-50">
            <p className="text-sm text-stone-900 text-center font-bold uppercase text-xs">No WhatsApp Business Accounts found.</p>
            <p className="text-xs text-stone-500 text-center max-w-md">Make sure your Facebook account has a configured WhatsApp Business Account (WABA). Ensure the app has been granted access to your businesses during login.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {data?.portfolios.map((waba) => (
              <div key={waba.wabaId} className="border border-stone-200 rounded-none overflow-hidden bg-white shadow-none">
                <div className="bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-stone-900">{waba.name}</h4>
                    <p className="text-[10px] text-stone-500 mt-0.5">WABA ID: {waba.wabaId}</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {waba.phoneNumbers.length === 0 ? (
                    <p className="text-xs text-stone-500 italic">No phone numbers associated with this account.</p>
                  ) : (
                    waba.phoneNumbers.map((phone) => {
                      const isActive = data.activePhoneNumberId === phone.id;
                      return (
                        <div key={phone.id} className={`flex items-center justify-between p-3 rounded-none border transition-all duration-300 ${isActive ? "bg-stone-100 border-stone-300" : "bg-stone-50 border-stone-200 hover:border-stone-400"}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-none flex items-center justify-center ${isActive ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-600"}`}>
                              <Phone className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-stone-800">{phone.display_phone_number}</p>
                              <p className="text-[10px] text-stone-500 mt-0.5">Phone ID: {phone.id}</p>
                            </div>
                          </div>
                          <div>
                            {isActive ? (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 border border-stone-950 text-white text-[10px] font-bold rounded-none uppercase tracking-wider">
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                Linked
                              </span>
                            ) : (
                              <button
                                onClick={() => handleLinkNumber(waba.wabaId, phone.id)}
                                disabled={linking !== null}
                                className="px-4 py-1.5 bg-stone-950 text-white text-[10px] uppercase tracking-wider font-bold rounded-none hover:bg-stone-900 border border-stone-950 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                              >
                                {linking === phone.id ? (
                                  <><Loader className="w-3 h-3 animate-spin" /> Linking...</>
                                ) : "Link Number"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
