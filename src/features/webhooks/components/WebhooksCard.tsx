"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/shared/context/AppContext";
import { useConfirm } from "@/shared/components/ui/ConfirmDialog";
import { Webhook, Loader, Plus, Trash2, Zap, CheckCircle2, XCircle, Copy } from "lucide-react";
import { WEBHOOK_EVENTS, type WebhookEvent, type TestDeliveryResult } from "../types";

interface SubscriptionRow {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
}

const EVENT_LABELS: Record<WebhookEvent, string> = {
  "message.received": "Inbound message",
  "message.status": "Delivery status",
  "order.placed": "Order placed",
};

/**
 * Outbound Webhooks configurator — Settings card.
 * Paste an endpoint → pick events → Subscribe (signing secret shown once) →
 * "Send test" proves the integration end-to-end in seconds.
 */
export const WebhooksCard: React.FC = () => {
  const { organization } = useApp();
  const orgId = organization?.id;
  const confirm = useConfirm();

  const [subs, setSubs] = useState<SubscriptionRow[] | null>(null);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>(["message.received"]);
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestDeliveryResult>>({});

  const fetchSubs = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/org/${orgId}/webhooks`);
      if (res.ok) {
        const data = await res.json();
        setSubs(data.subscriptions);
      }
    } catch {
      console.error("Failed to load webhook subscriptions");
    }
  }, [orgId]);

  useEffect(() => {
    // Fetch-on-mount: synchronizing with persisted subscriptions.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSubs();
  }, [fetchSubs]);

  const toggleEvent = (event: WebhookEvent) =>
    setEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]));

  const handleSubscribe = async () => {
    if (!orgId || !url.trim() || !events.length) return;
    setCreating(true);
    setError(null);
    setNewSecret(null);
    try {
      const res = await fetch(`/api/org/${orgId}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), events }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to subscribe endpoint.");
        return;
      }
      setNewSecret(data.subscription.secret);
      setUrl("");
      await fetchSubs();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleTest = async (id: string) => {
    if (!orgId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/org/${orgId}/webhooks/${id}/test`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setTestResults((prev) => ({ ...prev, [id]: data.result }));
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: { ok: false, status: null, durationMs: 0, error: "Network error" } }));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (sub: SubscriptionRow) => {
    if (!orgId) return;
    const confirmed = await confirm({
      title: "Remove webhook endpoint?",
      description: `${sub.url} will stop receiving events immediately.`,
      tone: "danger",
      confirmLabel: "Remove",
    });
    if (!confirmed) return;
    setBusyId(sub.id);
    try {
      const res = await fetch(`/api/org/${orgId}/webhooks/${sub.id}`, { method: "DELETE" });
      if (res.ok) await fetchSubs();
    } finally {
      setBusyId(null);
    }
  };

  const copySecret = async () => {
    if (!newSecret) return;
    try {
      await navigator.clipboard.writeText(newSecret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      /* user can select + copy manually */
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-100 text-violet-600">
            <Webhook className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Outbound Webhooks</h3>
            <p className="text-stone-400 text-[11px] mt-0.5">
              Push events (messages, statuses, orders) to your systems in real time — HMAC-signed, retried automatically.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Add endpoint */}
        <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Endpoint URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.yourapp.com/wappflow-events"
              className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900 transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {WEBHOOK_EVENTS.map((event) => (
              <button
                key={event}
                onClick={() => toggleEvent(event)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                  events.includes(event)
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                }`}
              >
                {EVENT_LABELS[event]}
              </button>
            ))}
            <button
              onClick={handleSubscribe}
              disabled={creating || !url.trim() || !events.length}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {creating ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Subscribe
            </button>
          </div>
        </div>

        {/* One-time secret reveal */}
        {newSecret && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <p className="text-[11px] font-bold text-emerald-700">
              Endpoint subscribed. Save this signing secret — it is shown only once:
            </p>
            <div className="flex items-stretch gap-2">
              <code className="flex-1 bg-stone-900 text-emerald-300 rounded-lg px-3 py-2 text-[11px] font-mono overflow-x-auto whitespace-nowrap">
                {newSecret}
              </code>
              <button
                onClick={copySecret}
                className="flex items-center gap-1.5 px-3 bg-white border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded-lg cursor-pointer hover:bg-emerald-100 transition-all"
              >
                {secretCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {secretCopied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-[10px] text-emerald-600">
              Verify deliveries by comparing <code>x-wappflow-signature</code> to HMAC-SHA256(secret, raw body).
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-4 py-2.5 rounded-xl flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Subscription list */}
        {subs === null ? (
          <div className="flex items-center justify-center py-6">
            <Loader className="w-5 h-5 animate-spin text-stone-400" />
          </div>
        ) : subs.length === 0 ? (
          <p className="text-xs text-stone-400 text-center py-2">No endpoints subscribed yet.</p>
        ) : (
          <div className="space-y-2">
            {subs.map((sub) => {
              const result = testResults[sub.id];
              const busy = busyId === sub.id;
              return (
                <div key={sub.id} className="border border-stone-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-mono font-bold text-stone-800 break-all flex-1">{sub.url}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleTest(sub.id)}
                        disabled={busy}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                      >
                        {busy ? <Loader className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                        Send test
                      </button>
                      <button
                        onClick={() => handleDelete(sub)}
                        disabled={busy}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                        aria-label="Remove endpoint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sub.events.map((e) => (
                      <span key={e} className="text-[9px] font-bold uppercase tracking-widest text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                        {e}
                      </span>
                    ))}
                    {result && (
                      <span className={`flex items-center gap-1 text-[10px] font-bold ml-auto ${result.ok ? "text-emerald-600" : "text-red-600"}`}>
                        {result.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {result.ok ? `${result.status} OK — ${result.durationMs}ms` : result.error || "Failed"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
