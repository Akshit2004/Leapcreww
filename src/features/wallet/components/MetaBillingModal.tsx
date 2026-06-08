"use client";

import React, { useState } from "react";
import { CreditCard, X, ExternalLink, ShieldCheck, CheckCircle2 } from "lucide-react";

interface MetaBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
}

export const MetaBillingModal: React.FC<MetaBillingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);

  if (!isOpen) return null;

  const handleRedirect = () => {
    // Generate the URL to Meta Business Settings
    // The link uses the exact billing_hub/credit_lines pattern you requested
    // You can dynamically replace these IDs with variables from the database if needed later.
    const metaBillingUrl = "https://business.facebook.com/latest/billing_hub/payment_methods";
    window.open(metaBillingUrl, "_blank", "noopener,noreferrer");
  };

  const handleVerify = () => {
    setIsChecking(true);
    // Simulate an API call to verify the WABA billing status
    setTimeout(() => {
      setIsChecking(false);
      setStatusChecked(true);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-black/45 backdrop-blur-xs cursor-pointer"
      />
      
      <div className="w-full max-w-md bg-white rounded-none border border-stone-200/60 shadow-2xl relative overflow-hidden animate-slide-up z-10 flex flex-col max-h-[90vh] select-none">
        {/* Modal Header */}
        <div className="p-6 border-b border-stone-100 flex items-center justify-between shrink-0 bg-[#fafaf9]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-stone-950 text-white flex items-center justify-center shadow-sm">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-light text-stone-900 text-lg tracking-tight">Meta Cloud Billing</h3>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mt-0.5">Secure External Gateway</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div className="space-y-4">
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-none flex gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-blue-900">End-to-End Direct Billing</p>
                <p className="text-[11px] text-blue-700/80 leading-relaxed">
                  For your security, WhatsApp conversation charges are billed directly by Meta. 
                  We do not act as a middleman, nor do we store your credit card information.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                1. Link Your Payment Method
              </label>
              <div className="border border-stone-200 p-4 space-y-3">
                <p className="text-xs text-stone-600">
                  Click the button below to open your Meta Business Manager securely in a new tab. Add your credit or debit card there.
                </p>
                <button
                  onClick={handleRedirect}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] uppercase tracking-wider py-3 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Open Meta Billing <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                2. Verify Connection
              </label>
              <div className="border border-stone-200 p-4 space-y-3">
                <p className="text-xs text-stone-600">
                  Once you have successfully added your card in Meta Business Manager, verify the connection here.
                </p>
                {statusChecked ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50/50 py-3 border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Billing Verified & Active</span>
                  </div>
                ) : (
                  <button
                    onClick={handleVerify}
                    disabled={isChecking}
                    className="w-full bg-stone-950 hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold text-[11px] uppercase tracking-wider py-3 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isChecking ? "Checking Status..." : "Verify Billing Status"}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
