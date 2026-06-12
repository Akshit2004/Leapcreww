"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/shared/context/AppContext";
import { Clock, Loader, CheckCircle2 } from "lucide-react";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;
type Day = typeof DAYS[number];

interface DaySchedule { open: boolean; from: string; to: string; }
interface WorkingHoursConfig {
  enabled: boolean;
  timezone: string;
  schedule: Record<Day, DaySchedule>;
  awayMessage: string;
}

export const WorkingHoursCard: React.FC = () => {
  const { organization } = useApp();
  const orgId = organization?.id;

  const [config, setConfig] = useState<WorkingHoursConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!orgId) return;
    const res = await fetch(`/api/org/${orgId}/working-hours`);
    if (res.ok) setConfig(await res.json());
  }, [orgId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const save = async () => {
    if (!orgId || !config) return;
    setSaving(true);
    try {
      await fetch(`/api/org/${orgId}/working-hours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (day: Day, patch: Partial<DaySchedule>) =>
    setConfig((c) => c ? { ...c, schedule: { ...c.schedule, [day]: { ...c.schedule[day], ...patch } } } : c);

  if (!config) return <div className="h-32 bg-stone-100 animate-pulse" />;

  return (
    <div className="bg-white border border-stone-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-stone-400" />
          <span className="text-sm font-bold text-stone-800">Working Hours</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-stone-500">Auto-away when closed</span>
          <div
            onClick={() => setConfig((c) => c ? { ...c, enabled: !c.enabled } : c)}
            className={`relative w-9 h-5 transition-colors cursor-pointer ${config.enabled ? "bg-emerald-500" : "bg-stone-200"}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white transition-transform ${config.enabled ? "translate-x-4" : ""}`} />
          </div>
        </label>
      </div>

      <div className="space-y-2 mb-4">
        {DAYS.map((day) => {
          const s = config.schedule[day];
          return (
            <div key={day} className="flex items-center gap-3">
              <label className="flex items-center gap-2 w-28 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={s.open}
                  onChange={(e) => updateDay(day, { open: e.target.checked })}
                  className="w-3 h-3 accent-stone-900"
                />
                <span className="text-xs font-medium text-stone-700 capitalize">{day.slice(0,3)}</span>
              </label>
              <input
                type="time"
                value={s.from}
                disabled={!s.open}
                onChange={(e) => updateDay(day, { from: e.target.value })}
                className="text-xs border border-stone-200 px-2 py-1 disabled:opacity-40 focus:outline-none focus:border-stone-400"
              />
              <span className="text-xs text-stone-400">–</span>
              <input
                type="time"
                value={s.to}
                disabled={!s.open}
                onChange={(e) => updateDay(day, { to: e.target.value })}
                className="text-xs border border-stone-200 px-2 py-1 disabled:opacity-40 focus:outline-none focus:border-stone-400"
              />
            </div>
          );
        })}
      </div>

      <div className="mb-4">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
          Away Message
        </label>
        <textarea
          value={config.awayMessage}
          onChange={(e) => setConfig((c) => c ? { ...c, awayMessage: e.target.value } : c)}
          rows={2}
          className="w-full text-xs text-stone-700 border border-stone-200 px-3 py-2 resize-none focus:outline-none focus:border-stone-400"
        />
      </div>

      <div className="mb-4">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
          Timezone
        </label>
        <select
          value={config.timezone}
          onChange={(e) => setConfig((c) => c ? { ...c, timezone: e.target.value } : c)}
          className="text-xs border border-stone-200 px-2 py-1.5 bg-white focus:outline-none focus:border-stone-400"
        >
          {["Asia/Kolkata","Asia/Dubai","Europe/London","America/New_York","America/Los_Angeles","Asia/Singapore","Australia/Sydney"].map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer"
        >
          {saving ? <Loader className="w-3 h-3 animate-spin" /> : saved ? <CheckCircle2 className="w-3 h-3" /> : null}
          {saved ? "Saved" : saving ? "Saving..." : "Save Hours"}
        </button>
      </div>
    </div>
  );
};
