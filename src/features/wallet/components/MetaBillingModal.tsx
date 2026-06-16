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
      
      <div className="kc-float w-full max-w-md rounded-2xl relative overflow-hidden animate-slide-up z-10 flex flex-col max-h-[90vh] select-none">
        {/* Modal Header */}
        <div className="p-6 border-b border-stone-100 flex items-center justify-between shrink-0 bg-[#fafaf9]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-stone-950 text-white flex items-center justify-center rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base tracking-tight">Meta Cloud Billing</h3>
              <p className="kc-label text-stone-500 mt-0.5">Secure External Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ds-btn ds-btn-ghost ds-btn-sm w-8 h-8 justify-center p-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div className="space-y-4">
            <div className="ds-badge ds-badge-info w-full justify-start text-left p-4 rounded-xl gap-3 items-start">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold">End-to-End Direct Billing</p>
                <p className="text-[11px] opacity-80 leading-relaxed normal-case tracking-normal">
                  For your security, WhatsApp conversation charges are billed directly by Meta.
                  We do not act as a middleman, nor do we store your credit card information.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="kc-label text-stone-400 block">
                1. Link Your Payment Method
              </label>
              <div className="kc-float p-4 space-y-3 rounded-xl">
                <p className="text-xs text-stone-600 leading-relaxed">
                  Click the button below to open your Meta Business Manager securely in a new tab. Add your credit or debit card there.
                </p>
                <button
                  onClick={handleRedirect}
                  className="ds-btn ds-btn-primary w-full justify-center"
                >
                  Open Meta Billing <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="kc-label text-stone-400 block">
                2. Verify Connection
              </label>
              <div className="kc-float p-4 space-y-3 rounded-xl">
                <p className="text-xs text-stone-600 leading-relaxed">
                  Once you have successfully added your card in Meta Business Manager, verify the connection here.
                </p>
                {statusChecked ? (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <span className="ds-badge ds-badge-success text-sm py-2 px-4 rounded-xl">
                      <CheckCircle2 className="w-4 h-4" />
                      Billing Verified & Active
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleVerify}
                    disabled={isChecking}
                    className="ds-btn ds-btn-secondary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
