"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/shared/context/AppContext";
import {
  ClipboardList,
  KeyRound,
  Loader,
  Copy,
  CheckCircle2,
  XCircle,
  Send,
} from "lucide-react";

interface SubmissionRow {
  id: string;
  source: string;
  result: string;
  resultDelivered: boolean;
  deliveredAt: string | null;
  createdAt: string;
  contact: { name: string; phone: string } | null;
}

function buildSnippet(origin: string, key: string): string {
  const apiKey = key || "wf_live_YOUR_API_KEY";
  return `curl -X POST ${origin}/api/v1/leads \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "+919876543210",
    "name": "Asha Singh",
    "source": "shopify_quiz",
    "result": "Your skin type is Combination — we recommend our Hydrating Gel Cleanser.",
    "attributes": { "age": 27, "gender": "female", "quiz_answer": "B" }
  }'`;
}

/**
 * Lead Capture — Settings → Developer card.
 * Sits beside DevQuickstartCard: issue a key (with `leads:write`), copy the
 * /v1/leads snippet pre-filled with the real key, fire a test capture, and watch
 * submissions land in the recent table — proof a storefront POST reaches WhatsApp.
 */
export const LeadCaptureCard: React.FC = () => {
  const { organization } = useApp();
  const orgId = organization?.id;

  const [plainKey, setPlainKey] = useState<string | null>(null); // shown once
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null);

  const [submissions, setSubmissions] = useState<SubmissionRow[] | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const fetchSubmissions = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/org/${orgId}/lead-submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions);
      }
    } catch {
      console.error("Failed to load lead submissions");
    }
  }, [orgId]);

  useEffect(() => {
    // Fetch-on-mount: surface previously captured submissions.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleGenerate = async () => {
    if (!orgId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/${orgId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Lead Capture key",
          scopes: ["leads:write", "contacts:write"],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate a key.");
        return;
      }
      setPlainKey(data.key);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const snippet = buildSnippet(origin, plainKey ?? "");

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
      const res = await fetch(`/api/org/${orgId}/lead-submissions/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testPhone.trim() }),
      });
      const data = await res.json();
      setTestResult(
        res.ok && data.sent
          ? { ok: true, detail: "Template sent — tap the button on WhatsApp to get the result." }
          : res.ok
            ? { ok: false, detail: data.error || "Captured, but the template didn't send — is WhatsApp connected?" }
            : { ok: false, detail: data.error || "Send failed." }
      );
      await fetchSubmissions();
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
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Lead Capture</h3>
            <p className="text-stone-400 text-[11px] mt-0.5">
              POST a captured lead + result to /v1/leads — we WhatsApp it via the{" "}
              <code className="font-mono text-stone-500">lead_capture_result</code> template.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Step 1 — key */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
            1 · Get a key with leads:write
          </p>
          {plainKey ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-[11px] font-bold text-emerald-700 mb-1.5">
                Your key — shown only once, it&apos;s already in the snippet below:
              </p>
              <code className="block bg-stone-900 text-emerald-300 rounded-lg px-3 py-2 text-[11px] font-mono overflow-x-auto whitespace-nowrap">
                {plainKey}
              </code>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {generating ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              Generate API Key
            </button>
          )}
        </div>

        {/* Step 2 — snippet */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">2 · Copy the request</p>
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

        {/* Recent submissions */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Recent submissions</p>
          {submissions && submissions.length > 0 ? (
            <div className="border border-stone-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-stone-400 uppercase tracking-wider text-[9px]">
                    <th className="px-3 py-2 font-bold">Lead</th>
                    <th className="px-3 py-2 font-bold">Source</th>
                    <th className="px-3 py-2 font-bold">Result</th>
                    <th className="px-3 py-2 font-bold">Delivered</th>
                    <th className="px-3 py-2 font-bold whitespace-nowrap">When</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id} className="border-b border-stone-100 last:border-0 text-stone-600">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-stone-800">{s.contact?.name ?? "—"}</div>
                        <div className="font-mono text-stone-400">{s.contact?.phone ?? ""}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-stone-500">{s.source}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={s.result}>
                        {s.result}
                      </td>
                      <td className="px-3 py-2">
                        {s.resultDelivered ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-stone-400 font-bold">
                            <XCircle className="w-3 h-3" /> No
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-stone-400">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[11px] text-stone-400 italic">
              No submissions yet — fire the test above or POST from your storefront.
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
