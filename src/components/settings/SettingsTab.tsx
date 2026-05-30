"use client";

import React from "react";

export const SettingsTab: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up bg-[#fafaf9]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900 uppercase">Settings</h2>
          <p className="text-stone-500 text-xs mt-1">Configure your workspace settings.</p>
        </div>
      </div>

      {/* Clean Minimal Placeholder */}
      <div className="bg-white p-6 border border-stone-200 shadow-none text-stone-400 text-[10px] font-black uppercase tracking-wider">
        Workspace settings are configured automatically in Sandbox mode.
      </div>
    </div>
  );
};
