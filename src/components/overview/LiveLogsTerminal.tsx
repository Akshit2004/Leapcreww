"use client";

import React, { useState } from "react";
import { Search, Trash2, HelpCircle } from "lucide-react";
import { SystemLog } from "../../context/types";

interface LiveLogsTerminalProps {
  systemLogs: SystemLog[];
  clearSystemLogs: () => void;
}

export const LiveLogsTerminal: React.FC<LiveLogsTerminalProps> = ({
  systemLogs,
  clearSystemLogs,
}) => {
  const [logFilter, setLogFilter] = useState<string>("all");
  const [logSearch, setLogSearch] = useState<string>("");

  // Filter logs locally
  const filteredLogs = systemLogs.filter((log) => {
    const matchesFilter = logFilter === "all" || log.type === logFilter;
    const matchesSearch = log.message.toLowerCase().includes(logSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="glass-panel p-6 rounded-3xl flex flex-col h-[420px] shadow-sm bg-white overflow-hidden leading-normal">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-150 shrink-0 select-none">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 -ml-4.5 animate-pulse-soft" />
            Live CRM & Webhook Audit Trail
          </h3>
          <p className="text-xs text-stone-500 mt-1 font-semibold">Real-time developer terminal of campaign triggers & webhook events.</p>
        </div>
        <button 
          onClick={clearSystemLogs}
          className="text-[10px] uppercase tracking-wider font-extrabold text-red-500 flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 hover:bg-red-50 transition-all cursor-pointer self-start sm:self-center"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Logs
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 py-4 shrink-0 select-none">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search events, phone, templates..."
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
          />
        </div>

        {/* Type buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-center overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar select-none">
          {["all", "crm", "campaign", "integration", "chat"].map((type) => (
            <button
              key={type}
              onClick={() => setLogFilter(type)}
              className={`text-[9px] font-extrabold uppercase tracking-widest px-3 py-2 rounded-lg transition-all cursor-pointer ${
                logFilter === type 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-stone-500 hover:bg-slate-100"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Log Stream Terminal */}
      <div className="flex-1 bg-slate-50 text-stone-700 font-mono text-xs rounded-2xl p-5 overflow-y-auto custom-scrollbar border border-slate-200 space-y-2.5">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center space-y-2">
            <HelpCircle className="w-8 h-8 text-stone-300 animate-pulse" />
            <p className="font-semibold text-xs text-stone-400">No active webhook audit trials matched the parameters.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            let badgeColor = "text-blue-600 bg-blue-100 border-blue-200";
            if (log.type === "campaign") badgeColor = "text-teal-600 bg-teal-100 border-teal-200";
            if (log.type === "integration") badgeColor = "text-purple-600 bg-purple-100 border-purple-200";
            if (log.type === "crm") badgeColor = "text-emerald-600 bg-emerald-100 border-emerald-200";

            return (
              <div key={log.id} className="flex items-start gap-4 pb-2.5 border-b border-slate-100 last:border-b-0 animate-slide-in-left leading-relaxed">
                <span className="text-stone-400 text-[10px] select-none font-bold mt-0.5 shrink-0">{log.timestamp}</span>
                <span className={`text-[8px] px-2 py-0.5 rounded font-extrabold uppercase border ${badgeColor} select-none shrink-0`}>
                  {log.type}
                </span>
                <span className="text-stone-600 flex-1 break-words"><span className="text-emerald-600/60 font-bold mr-1">$</span>{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
