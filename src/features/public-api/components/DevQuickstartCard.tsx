"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/shared/context/AppContext";
import { Terminal, KeyRound, Loader, Copy, CheckCircle2, XCircle, Send } from "lucide-react";

interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

type SnippetLang = "curl" | "node" | "python";

function buildSnippet(lang: SnippetLang, origin: string, key: string): string {
  const apiKey = key || "wf_live_YOUR_API_KEY";
  if (lang === "curl") {
    return `curl -X POST ${origin}/api/v1/messages \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-1042-confirm" \\
  -d '{
    "to": "+919876543210",
    "template": {
      "name": "order_confirmation",
      "variables": ["Asha", "Tomorrow", "https://track.example.com/1042"]
    }
  }'`;
  }
  if (lang === "node") {
    return `const res = await fetch("${origin}/api/v1/messages", {
  method: "POST",
  headers: {
    Authorization: "Bearer ${apiKey}",
    "Content-Type": "application/json",
    "Idempotency-Key": "order-1042-confirm",
  },
  body: JSON.stringify({
    to: "+919876543210",
    text: "Hello from WappFlow!",
  }),
});
console.log(await res.json()); // { ok: true, waMessageId: "wamid..." }`;
  }
  return `import requests

res = requests.post(
    "${origin}/api/v1/messages",
    headers={
        "Authorization": "Bearer ${apiKey}",
        "Idempotency-Key": "order-1042-confirm",
    },
    json={"to": "+919876543210", "text": "Hello from WappFlow!"},
)
print(res.json())  # { "ok": True, "waMessageId": "wamid..." }`;
}

/**
 * Developer Quickstart — Settings card.
 * One click issues an API key; ready-to-paste snippets render with the real
 * key and host, and "Send test" proves the path before any code is written.
 */
export const DevQuickstartCard: React.FC = () => {
  const { organization } = useApp();
  const orgId = organization?.id;

  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const [plainKey, setPlainKey] = useState<string | null>(null); // shown once after generation
  const [generating, setGenerating] = useState(false);
  const [lang, setLang] = useState<SnippetLang>("curl");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const fetchKeys = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/org/${orgId}/api-keys`);
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys);
      }
    } catch {
      console.error("Failed to load API keys");
    }
  }, [orgId]);

  useEffect(() => {
    // Fetch-on-mount: synchronizing with persisted API keys.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchKeys();
  }, [fetchKeys]);

  const handleGenerate = async () => {
    if (!orgId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/${orgId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Quickstart key" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate a key.");
        return;
      }
      setPlainKey(data.key);
      await fetchKeys();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const snippet = buildSnippet(lang, origin, plainKey ?? "");

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't access the clipboard — copy the snippet manually.");
    }
  };

  const handleTestSend = async () => {
    if (!orgId || !testPhone.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/org/${orgId}/test-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testPhone.trim() }),
      });
      const data = await res.json();
      setTestResult(
        res.ok && data.ok
          ? { ok: true, detail: `Delivered to WhatsApp (${data.waMessageId ?? "queued"})` }
          : { ok: false, detail: data.error || "Send failed — is WhatsApp connected?" }
      );
    } catch {
      setTestResult({ ok: false, detail: "Network error. Please try again." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-stone-900 text-emerald-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Developer Quickstart</h3>
            <p className="text-stone-400 text-[11px] mt-0.5">
              First API call in under two minutes — key, snippet, test send.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Step 1 — key */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">1 · Get an API key</p>
          {plainKey ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-[11px] font-bold text-emerald-700 mb-1.5">
                Your key — shown only once, it&apos;s already in the snippets below:
              </p>
              <code className="block bg-stone-900 text-emerald-300 rounded-lg px-3 py-2 text-[11px] font-mono overflow-x-auto whitespace-nowrap">
                {plainKey}
              </code>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {generating ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                Generate API Key
              </button>
              {keys && keys.length > 0 && (
                <span className="text-[11px] text-stone-400">
                  {keys.length} existing key{keys.length === 1 ? "" : "s"} (
                  {keys[0].prefix}…) — generating adds another.
                </span>
              )}
            </div>
          )}
        </div>

        {/* Step 2 — snippet */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">2 · Copy a snippet</p>
            <div className="flex items-center gap-1">
              {(["curl", "node", "python"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    lang === l ? "bg-stone-900 text-white" : "text-stone-400 hover:bg-stone-100"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <pre className="bg-stone-900 text-stone-100 rounded-xl px-4 py-3 text-[11px] font-mono overflow-x-auto leading-relaxed">
              {snippet}
            </pre>
            <button
              onClick={copySnippet}
              className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-700 hover:bg-stone-600 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Step 3 — test send */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">3 · See it work</p>
          <div className="flex items-stretch gap-2">
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Your WhatsApp number, e.g. +919876543210"
              className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900 transition-all"
            />
            <button
              onClick={handleTestSend}
              disabled={testing || !testPhone.trim()}
              className="flex items-center gap-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {testing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send test
            </button>
          </div>
          {testResult && (
            <p className={`flex items-center gap-1.5 text-xs font-bold ${testResult.ok ? "text-emerald-600" : "text-red-600"}`}>
              {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testResult.detail}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-4 py-2.5 rounded-xl flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
