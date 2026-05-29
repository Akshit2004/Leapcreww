"use client";

import React, { useState } from "react";
import { Coins, X, ChevronRight, CreditCard, Lock, Loader, CheckCircle2 } from "lucide-react";

interface WalletTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  refreshWorkspace: (orgId: string) => Promise<void>;
}

export const WalletTopupModal: React.FC<WalletTopupModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  refreshWorkspace,
}) => {
  const [topupAmount, setTopupAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [paymentStep, setPaymentStep] = useState<"amount" | "payment" | "processing" | "success">("amount");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card">("upi");
  const [upiId, setUpiId] = useState<string>("user@upi");
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [cardCvv, setCardCvv] = useState<string>("");
  const [isTopupSubmitting, setIsTopupSubmitting] = useState(false);
  const [topupError, setTopupError] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        onClick={() => !isTopupSubmitting && onClose()} 
        className="absolute inset-0 bg-black/45 backdrop-blur-xs cursor-pointer"
      />
      
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/60 shadow-2xl relative overflow-hidden animate-slide-up z-10 flex flex-col max-h-[90vh] select-none">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-sm">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Top Up Wallet Credits</h3>
              <p className="text-[10px] text-stone-505 font-semibold leading-none mt-1">WappFlow Secure Payment Gateway</p>
            </div>
          </div>
          <button 
            onClick={() => !isTopupSubmitting && onClose()} 
            className="p-1.5 rounded-lg hover:bg-slate-100 text-stone-400 hover:text-slate-600 transition-colors cursor-pointer"
            disabled={isTopupSubmitting}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {topupError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              {topupError}
            </div>
          )}

          {paymentStep === "amount" && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">
                1. Select Top-Up Amount
              </label>
              
              {/* Preset Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[500, 1000, 2000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setTopupAmount(preset);
                      setCustomAmount("");
                    }}
                    className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer font-extrabold text-xs flex flex-col items-center justify-center gap-1 ${
                      topupAmount === preset && !customAmount
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-[10px] text-stone-400 font-semibold">Rupees</span>
                    <span className="text-base font-black">₹{preset.toLocaleString("en-IN")}</span>
                    {preset === 1000 && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500 text-white uppercase font-black tracking-widest mt-1">Best Value</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="space-y-2">
                <span className="text-[9.5px] font-bold text-stone-500 block">Or enter custom amount:</span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                  <input 
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Enter other amount"
                    value={customAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow only digits
                      if (val === "" || /^[0-9]+$/.test(val)) {
                        setCustomAmount(val);
                        setTopupAmount(Number(val) || 0);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-8 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all select-text"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const finalAmount = customAmount ? Number(customAmount) : topupAmount;
                  if (!finalAmount || finalAmount <= 0) {
                    setTopupError("Please specify a valid top-up amount.");
                    return;
                  }
                  setTopupError("");
                  setPaymentStep("payment");
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3.5 rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                Proceed to Payment
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {paymentStep === "payment" && (
            <div className="space-y-5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Selected Credit Value:</span>
                <span className="text-sm font-black text-slate-900 font-mono">₹{(customAmount ? Number(customAmount) : topupAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">
                  2. Choose Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs flex items-center justify-center gap-2 ${
                      paymentMethod === "upi"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-xs font-extrabold"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    UPI (Instant QR)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs flex items-center justify-center gap-2 ${
                      paymentMethod === "card"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-xs font-extrabold"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Credit / Debit Card
                  </button>
                </div>
              </div>

              {/* UPI Form */}
              {paymentMethod === "upi" && (
                <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-fade-in">
                  <span className="text-[9.5px] font-extrabold text-stone-500 uppercase tracking-wide block">UPI Registration</span>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-stone-400 block">Enter your VPA / UPI ID:</label>
                    <input 
                      type="text" 
                      placeholder="e.g. username@upi" 
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 select-text"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-[8.5px] text-stone-400 font-medium pt-1">
                    <Lock className="w-3.5 h-3.5 text-stone-300" />
                    Meta-approved merchant authentication layer
                  </div>
                </div>
              )}

              {/* Card Form */}
              {paymentMethod === "card" && (
                <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-fade-in">
                  <span className="text-[9.5px] font-extrabold text-stone-500 uppercase tracking-wide block">Cardholder Credentials</span>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-stone-400 block">Card Number:</label>
                    <input 
                      type="text" 
                      placeholder="4111 2222 3333 4444" 
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 select-text"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-stone-400 block">Expiry Date:</label>
                      <input 
                        type="text" 
                        placeholder="MM / YY" 
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3.5 text-xs font-semibold focus:outline-none select-text"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-stone-400 block">CVV Security Code:</label>
                      <input 
                        type="password" 
                        placeholder="•••" 
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3.5 text-xs font-semibold focus:outline-none select-text"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentStep("amount")}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-extrabold text-xs py-3 rounded-xl border border-slate-200 transition-all cursor-pointer text-center"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const finalAmount = customAmount ? Number(customAmount) : topupAmount;
                    if (!finalAmount || finalAmount <= 0) {
                      setTopupError("Please specify a valid top-up amount.");
                      return;
                    }
                    
                    setIsTopupSubmitting(true);
                    setPaymentStep("processing");
                    setTopupError("");

                    // Simulate bank processing gateway
                    await new Promise((resolve) => setTimeout(resolve, 1800));

                    try {
                      const res = await fetch(`/api/org/${organizationId}/wallet/topup`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ amount: finalAmount }),
                      });

                      if (res.ok) {
                        setPaymentStep("success");
                        refreshWorkspace(organizationId);
                      } else {
                        const errData = await res.json();
                        setTopupError(errData.error || "Payment gateway processing failed.");
                        setPaymentStep("payment");
                      }
                    } catch {
                      setTopupError("Network connection timeout. Re-try in a moment.");
                      setPaymentStep("payment");
                    } finally {
                      setIsTopupSubmitting(false);
                    }
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/10 hover:shadow-emerald-650/20 text-center"
                >
                  Authorize ₹{ (customAmount ? Number(customAmount) : topupAmount).toLocaleString("en-IN") }
                </button>
              </div>
            </div>
          )}

          {paymentStep === "processing" && (
            <div className="h-60 flex flex-col items-center justify-center text-center space-y-4 animate-pulse-soft">
              <div className="w-16 h-16 rounded-3xl bg-emerald-600/10 text-emerald-600 border border-emerald-250 flex items-center justify-center shadow-md shadow-emerald-500/5 relative animate-spin">
                <Loader className="w-7 h-7 animate-spin" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] tracking-widest uppercase font-black text-slate-500 block">Processing Credit Gateway</span>
                <span className="text-[9px] font-semibold text-stone-400 block uppercase">Authorizing double-handshake token transaction...</span>
              </div>
            </div>
          )}

          {paymentStep === "success" && (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 animate-slide-up">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center shadow-md animate-glow-pulse">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-900 tracking-tight">Top-Up Succeeded!</h4>
                <p className="text-xs text-stone-500 font-semibold leading-relaxed max-w-xs mx-auto">
                  Credits loaded. You have successfully credited ₹{(customAmount ? Number(customAmount) : topupAmount).toLocaleString("en-IN")} into organization wallet.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Return to Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
