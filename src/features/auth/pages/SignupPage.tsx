"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import {
  Bot, ArrowRight, Mail, AlertCircle, Loader, CheckCircle,
  MessageSquare, Copy, Building, User, Lock
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Tab states
  const [activeTab, setActiveTab] = useState<"whatsapp" | "email">("email");
  
  // Email Form states
  const [email, setEmail] = useState("");
  
  // WhatsApp QR Attempt states
  const [waAttemptId, setWaAttemptId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [waUrl, setWaUrl] = useState("");
  const [expiresIn, setExpiresIn] = useState(300); // 5 minutes in seconds
  
  // Unified OTP Fallback states (Used for both Email and WhatsApp)
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  
  // Messages & Loaders
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  // New User Onboarding Modal states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [verifiedEmailOrPhone, setVerifiedEmailOrPhone] = useState("");
  const [obName, setObName] = useState("");
  const [obOrgName, setObOrgName] = useState("");
  const [obPassword, setObPassword] = useState("");
  const [obLoading, setObLoading] = useState(false);
  const [obLogs, setObLogs] = useState<string[]>([]);
  const [onboardingType, setOnboardingType] = useState<"email" | "whatsapp">("email");

  const initiateWhatsAppSession = async () => {
    try {
      const res = await fetch("/api/whatsapp-auth/initiate", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setWaAttemptId(data.attemptId);
        setVerificationCode(data.code);
        setWaUrl(data.waUrl);
        setExpiresIn(300);
      }
    } catch (err) {
      console.error("Failed to initiate WhatsApp session:", err);
    }
  };

  // Handle standard URL queries
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setTimeout(() => {
        setErrorMsg("An authentication error occurred. Please try again.");
      }, 0);
    }
  }, [searchParams]);

  // Initiate WhatsApp Verification Session automatically on tab switch
  useEffect(() => {
    if (activeTab === "whatsapp" && !waAttemptId) {
      setTimeout(() => {
        initiateWhatsAppSession();
      }, 0);
    }
  }, [activeTab, waAttemptId]);

  // Countdown timer for active QR attempt
  useEffect(() => {
    if (!waAttemptId || expiresIn <= 0 || activeTab !== "whatsapp") return;
    
    const timer = setInterval(() => {
      setExpiresIn(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setWaAttemptId(null);
          initiateWhatsAppSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [waAttemptId, activeTab, expiresIn]);

  // OTP Cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Session Polling to detect QR Code scans / Direct message sending
  useEffect(() => {
    if (!waAttemptId || activeTab !== "whatsapp" || showOnboarding) return;

    let isSubscribed = true;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/whatsapp-auth/status?attemptId=${waAttemptId}`);
        const data = await res.json();
        
        if (!isSubscribed) return;

        if (data.success) {
          if (data.status === "VERIFIED") {
            clearInterval(pollInterval);
            setLoading(true);
            const authRes = await signIn("credentials", {
              type: "whatsapp",
              attemptId: waAttemptId,
              redirect: false
            });

            if (authRes?.error) {
              setErrorMsg(authRes.error);
              setLoading(false);
            } else {
              const session = await getSession();
              interface CustomSessionUser {
                activeOrgId?: string | null;
                organizations?: Array<{ id: string; name: string; slug: string }>;
              }
              const activeOrgId = (session?.user as unknown as CustomSessionUser)?.activeOrgId || (session?.user as unknown as CustomSessionUser)?.organizations?.[0]?.id;
              
              if (activeOrgId) {
                router.push(`/org/${activeOrgId}`);
              } else {
                setErrorMsg("No active workspace found for this profile.");
                setLoading(false);
              }
            }
          } else if (data.status === "VERIFIED_NEW_USER") {
            clearInterval(pollInterval);
            setVerifiedEmailOrPhone(data.phone || "");
            setOnboardingType("whatsapp");
            setCurrentAttemptId(waAttemptId);
            setShowOnboarding(true);
          } else if (data.status === "EXPIRED") {
            clearInterval(pollInterval);
            setWaAttemptId(null);
            initiateWhatsAppSession();
          }
        }
      } catch (err) {
        console.error("Status polling failed:", err);
      }
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
    };
  }, [waAttemptId, activeTab, showOnboarding, router]);

  // Handle Email OTP Dispatch
  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || otpCooldown > 0) return;

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/email-otp/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setCurrentAttemptId(data.attemptId);
        setOtpSent(true);
        setOtpCooldown(60);
        setSuccessMsg("OTP successfully sent to your email address.");
        setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
      } else {
        setErrorMsg(data.error || "Failed to dispatch OTP. Please try again.");
      }
    } catch {
      setErrorMsg("Unable to connect to OTP dispatch servers.");
    } finally {
      setLoading(false);
    }
  };

  // Handle WhatsApp OTP Dispatch
  const handleSendWaOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone || otpCooldown > 0) return;
    
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/whatsapp-auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      
      if (data.success) {
        setCurrentAttemptId(data.attemptId);
        setOtpSent(true);
        setOtpCooldown(30);
        setSuccessMsg("OTP successfully sent to your WhatsApp number.");
        setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
      } else {
        setErrorMsg(data.error || "Failed to dispatch OTP. Please check the number.");
      }
    } catch {
      setErrorMsg("Unable to connect to OTP dispatch servers.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otpValues];
    newOtp[index] = cleanVal;
    setOtpValues(newOtp);

    if (cleanVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      const newOtp = [...otpValues];
      newOtp[index - 1] = "";
      setOtpValues(newOtp);
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalOtp = otpValues.join("");
    if (finalOtp.length !== 6 || !currentAttemptId) return;

    setErrorMsg("");
    setSuccessMsg("");
    setOtpVerifying(true);

    const endpoint = activeTab === "whatsapp" ? "/api/whatsapp-auth/verify-otp" : "/api/auth/email-otp/verify";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: currentAttemptId, otp: finalOtp }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.status === "VERIFIED") {
          // An account already exists for this identity.
          if (activeTab === "email") {
            // Email accounts log in with a password — send them to the login page.
            setOtpVerifying(false);
            setSuccessMsg("An account with this email already exists. Redirecting you to sign in…");
            setTimeout(() => router.push("/login?registered=true"), 1500);
            return;
          }

          // WhatsApp is its own auth channel — complete the WhatsApp sign-in.
          const authRes = await signIn("credentials", {
            type: "whatsapp",
            attemptId: currentAttemptId,
            redirect: false
          });

          if (authRes?.error) {
            setErrorMsg(authRes.error);
            setOtpVerifying(false);
          } else {
            const session = await getSession();
            interface CustomSessionUser {
              activeOrgId?: string | null;
              organizations?: Array<{ id: string; name: string; slug: string }>;
            }
            const activeOrgId = (session?.user as unknown as CustomSessionUser)?.activeOrgId || (session?.user as unknown as CustomSessionUser)?.organizations?.[0]?.id;
            if (activeOrgId) {
              router.push(`/org/${activeOrgId}`);
            } else {
              setErrorMsg("No active workspace located.");
              setOtpVerifying(false);
            }
          }
        } else if (data.status === "VERIFIED_NEW_USER") {
          setVerifiedEmailOrPhone(activeTab === "whatsapp" ? (data.phone || phone) : data.email);
          setOnboardingType(activeTab);
          setShowOnboarding(true);
          setOtpVerifying(false);
        }
      } else {
        setErrorMsg(data.error || "Incorrect OTP code. Please verify and try again.");
        setOtpVerifying(false);
      }
    } catch {
      setErrorMsg("An error occurred during verification.");
      setOtpVerifying(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obName.trim() || !obOrgName.trim()) return;
    // Email signups must set a password (used to log in afterwards).
    if (onboardingType === "email") {
      if (obPassword.length < 8) {
        setErrorMsg("Password must be at least 8 characters.");
        return;
      }
    }

    setErrorMsg("");
    setObLoading(true);
    setOnboardingStep(2);

    setObLogs([
      "Email verification confirmed.",
      "Initiating registration sequence on central cluster...",
    ]);

    try {
      const payload: Record<string, string> = {
        name: obName.trim(),
        organizationName: obOrgName.trim(),
        attemptId: currentAttemptId ?? "",
        attemptType: onboardingType
      };

      if (onboardingType === "email") {
        payload.email = verifiedEmailOrPhone;
        payload.password = obPassword;
      } else {
        payload.email = `${verifiedEmailOrPhone.replace(/[^0-9]/g, "")}@wa.wappflow.internal`; // temporary placeholder
        payload.phone = verifiedEmailOrPhone;
      }

      const regRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const regData = await regRes.json();
      
      if (!regRes.ok) {
        setErrorMsg(regData.error || "Failed to create organization profile.");
        setOnboardingStep(1);
        setObLoading(false);
        return;
      }

      setObLogs(prev => [...prev, "User profile and organization seeded.", "Executing auto-provisioning scripts...", "Default visual nodes and triggers loaded."]);

      setTimeout(async () => {
        try {
          // Email accounts sign in with their new password; WhatsApp accounts use
          // the verified attempt. OTP is never used to authenticate.
          const authRes = onboardingType === "email"
            ? await signIn("credentials", {
                email: verifiedEmailOrPhone,
                password: obPassword,
                redirect: false
              })
            : await signIn("credentials", {
                type: "whatsapp",
                attemptId: currentAttemptId!,
                redirect: false
              });

          if (authRes?.error) {
            setErrorMsg(authRes.error);
            setOnboardingStep(1);
            setObLoading(false);
          } else {
            setObLogs(prev => [...prev, "Workspace ready! Redirecting to dashboard..."]);
            setTimeout(() => {
              router.push(`/org/${regData.orgId}`);
            }, 1000);
          }
        } catch {
          setErrorMsg("Login verification handshake failed.");
          setOnboardingStep(1);
          setObLoading(false);
        }
      }, 1500);

    } catch (err) {
      console.error(err);
      setErrorMsg("An unexpected registration connection failure occurred.");
      setOnboardingStep(1);
      setObLoading(false);
    }
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(`Hi, I'd like to verify my Account Signup for LeapCrew AI. Verification Code: ${verificationCode}`);
    setSuccessMsg("WhatsApp message text copied to clipboard!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  return (
    <div className="h-screen w-screen bg-[#FAF9F5] text-stone-900 grid grid-cols-1 md:grid-cols-12 overflow-hidden select-none font-sans">
      
      {/* ─── Left Column: Premium Visual Cover Showcase ─── */}
      <div className="max-md:hidden md:flex md:col-span-5 lg:col-span-6 h-full relative bg-stone-955 flex-col justify-between p-12 overflow-hidden">
        {/* Full-bleed illustration showcase */}
        <div className="absolute inset-0 z-0 bg-stone-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/login_showcase.png"
            alt="LeapCrew AI SaaS Dashboard Illustration"
            className="w-full h-full object-cover opacity-60 mix-blend-luminosity hover:opacity-75 transition-opacity duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent z-10" />
        </div>

        {/* Brand Header */}
        <div className="relative z-20">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/leapcrew-logo.png" alt="LeapCrew AI" className="h-11 w-auto object-contain brightness-0 invert" style={{ maxWidth: 180, background: "none" }} />
          </Link>
        </div>

        {/* Editorial Text Details */}
        <div className="relative z-20 space-y-4 max-w-md">
          <span className="text-[9px] font-bold tracking-widest text-emerald-400 uppercase font-mono bg-emerald-950/50 border border-emerald-900/30 px-3 py-1 rounded-full">
            REAL-TIME MARKETING INTEGRATIONS
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif text-white leading-tight font-medium">
            Elevate conversational sales on <br/>
            <span className="italic text-emerald-400 font-normal">your own terms.</span>
          </h2>
          <p className="text-stone-300 text-xs leading-relaxed max-w-sm font-sans font-light">
            Orchestrate instant Meta broadcasts, configure branching visual chatbot nodes, and monitor webhook metrics under a unified logical tenant dashboard.
          </p>
        </div>
      </div>

      {/* ─── Right Column: Centered Login Card ─── */}
      <div className="col-span-1 md:col-span-7 lg:col-span-6 h-full flex flex-col justify-center items-center relative p-6 sm:p-12">
        <div className="absolute inset-0 canvas-dot-grid opacity-85 pointer-events-none" />

        {/* Mobile Brand Header */}
        <div className="md:hidden text-center mb-4 relative z-10">
          <Link href="/" className="inline-flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/leapcrew-logo.png" alt="LeapCrew AI" className="h-10 w-auto object-contain" style={{ maxWidth: 160, background: "none" }} />
          </Link>
        </div>

        {/* Elevated Right Card */}
        <div className="w-full max-w-sm bg-white border border-stone-200/85 p-6 sm:p-8 rounded-3xl shadow-xl space-y-6 relative z-10 bg-gradient-to-b from-[#FDFDFD] to-white animate-slide-up">
          
          <div className="text-center space-y-1">
            <h2 className="text-lg font-serif text-stone-900 font-semibold tracking-tight">Register Your Instance</h2>
            <p className="text-stone-500 text-[10px] font-medium">Verify your contact info to build your workspace</p>
          </div>

          {/* Feedback Banners */}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-start gap-2 text-[11px] text-emerald-800 animate-slide-in-left leading-relaxed font-medium select-text">
              <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-start gap-2 text-[11px] text-rose-800 animate-slide-in-left leading-relaxed font-medium select-text">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Segment Tab Controls */}
          <div className="bg-stone-100 p-1 rounded-xl flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setActiveTab("email");
                setErrorMsg("");
                setSuccessMsg("");
                setOtpSent(false);
              }}
              className={`w-1/2 text-center py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activeTab === "email" 
                  ? "bg-white text-stone-900 shadow-sm" 
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Email OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("whatsapp");
                setErrorMsg("");
                setSuccessMsg("");
                setOtpSent(false);
              }}
              className={`w-1/2 text-center py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activeTab === "whatsapp" 
                  ? "bg-white text-stone-900 shadow-sm" 
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              WhatsApp Link
            </button>
          </div>

          {/* WhatsApp Auth Panel */}
          {activeTab === "whatsapp" && (
            <div className="space-y-4">
              
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="relative p-3 bg-white border border-stone-200 rounded-2xl shadow-inner flex items-center justify-center">
                  {waAttemptId ? (
                    <div className="relative">
                      <QRCodeSVG
                        value={waUrl}
                        size={140}
                        bgColor={"#ffffff"}
                        fgColor={"#0c0a09"}
                        level={"M"}
                        includeMargin={false}
                        className="rounded-lg select-none"
                      />
                      <div className="absolute inset-0 m-auto w-8 h-8 bg-white border border-stone-150 rounded-xl flex items-center justify-center shadow-md">
                        <MessageSquare className="w-4 h-4 text-emerald-600 fill-emerald-500" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-[140px] h-[140px] flex flex-col items-center justify-center text-stone-400 gap-1.5 font-medium text-[11px]">
                      <Loader className="w-4 h-4 animate-spin text-emerald-700" />
                      Initializing...
                    </div>
                  )}
                </div>

                <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-stone-400">
                  Expires in {formatTime(expiresIn)}
                </div>
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-[#128c7e] hover:bg-[#075e54] text-white text-[10px] font-bold py-2.5 px-3 rounded-xl cursor-pointer transition-all active:scale-98 shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Open WhatsApp
                </a>
                <button
                  type="button"
                  onClick={copyCodeToClipboard}
                  className="flex items-center justify-center gap-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-[10px] font-bold py-2.5 px-3 rounded-xl cursor-pointer transition-all active:scale-98"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Link
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-stone-200"></div>
                <span className="flex-shrink mx-3 text-[9px] font-bold tracking-widest text-stone-400 uppercase font-mono">OR ENTER OTP</span>
                <div className="flex-grow border-t border-stone-200"></div>
              </div>

              {/* OTP Input Fallback */}
              {!otpSent ? (
                <div className="space-y-2">
                  <input
                    type="tel"
                    placeholder="WhatsApp number (e.g. +91 87969 16888)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-850 disabled:opacity-50 select-text"
                  />
                  <button
                    type="button"
                    disabled={loading || !phone.trim()}
                    onClick={handleSendWaOtp}
                    className="w-full bg-stone-900 hover:bg-stone-850 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-all active:scale-98 shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {loading ? (
                      <Loader className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <>
                        <span>Send OTP Code</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleOtpSubmit} className="space-y-3">
                  <div className="grid grid-cols-6 gap-1.5">
                    {otpValues.map((digit, idx) => (
                      <input
                        key={idx}
                        type="text"
                        maxLength={1}
                        required
                        disabled={otpVerifying}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        ref={(el) => { otpInputsRef.current[idx] = el; }}
                        className="w-full aspect-square text-center font-mono text-base font-bold bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-850 focus:border-transparent disabled:opacity-50 transition-all select-text"
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    {otpCooldown > 0 ? (
                      <span className="text-stone-400 font-mono font-medium">Resend in 00:{otpCooldown < 10 ? "0" : ""}{otpCooldown}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendWaOtp}
                        className="text-emerald-800 hover:text-emerald-700 font-bold underline cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-stone-500 hover:text-stone-700 font-semibold"
                    >
                      Change number
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={otpVerifying || otpValues.join("").length !== 6}
                    className="w-full bg-[#128c7e] hover:bg-[#075e54] disabled:opacity-55 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-all active:scale-98 shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {otpVerifying ? (
                      <Loader className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <span>Submit Code</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Email OTP Login Panel */}
          {activeTab === "email" && (
            <div className="space-y-4 animate-slide-up">
              {!otpSent ? (
                <form onSubmit={handleSendEmailOtp} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      disabled={loading}
                      placeholder="e.g. alex@wappflow.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-850 disabled:opacity-50 select-text"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full bg-stone-900 hover:bg-stone-850 disabled:opacity-40 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
                  >
                    {loading ? (
                      <Loader className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <>
                        <span>Send Registration Code</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleOtpSubmit} className="space-y-3">
                  <div className="grid grid-cols-6 gap-1.5">
                    {otpValues.map((digit, idx) => (
                      <input
                        key={idx}
                        type="text"
                        maxLength={1}
                        required
                        disabled={otpVerifying}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        ref={(el) => { otpInputsRef.current[idx] = el; }}
                        className="w-full aspect-square text-center font-mono text-base font-bold bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-850 focus:border-transparent disabled:opacity-50 transition-all select-text"
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    {otpCooldown > 0 ? (
                      <span className="text-stone-400 font-mono font-medium">Resend in 00:{otpCooldown < 10 ? "0" : ""}{otpCooldown}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendEmailOtp}
                        className="text-emerald-800 hover:text-emerald-700 font-bold underline cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-stone-500 hover:text-stone-700 font-semibold"
                    >
                      Change email
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={otpVerifying || otpValues.join("").length !== 6}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-55 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-all active:scale-98 shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {otpVerifying ? (
                      <Loader className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <span>Verify & Continue</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Footer Terms & Signup Links */}
          <div className="text-center text-[9px] text-stone-400 font-mono tracking-wider pt-4 border-t border-stone-150 uppercase leading-relaxed font-semibold">
            <span>Already have an active account? </span>
            <Link href="/login" className="text-emerald-800 hover:underline font-bold">
              Sign In Instead
            </Link>
            <div className="text-[8px] text-stone-400 mt-1.5 font-normal font-sans tracking-normal select-text">
              Google <Link href="/privacy" className="underline hover:text-emerald-850">Privacy Policy</Link> and <Link href="/terms" className="underline hover:text-emerald-850">Terms of Service</Link> apply.
            </div>
          </div>

        </div>
      </div>

      {/* ─── Premium Multi-Step Onboarding Modal ─── */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-md px-4">
          <div className="w-full max-w-sm bg-white border border-stone-250 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-5 animate-slide-up relative bg-gradient-to-b from-[#FAF9F6] to-white">
            
            <div className="text-center space-y-1">
              <div className="inline-flex w-8 h-8 rounded-xl bg-emerald-850 items-center justify-center shadow-lg shadow-emerald-950/20 mb-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-serif text-stone-900 font-semibold tracking-tight">Configure Your SaaS Instance</h3>
              <p className="text-stone-500 text-[10px] font-sans">Initialize your workspace profile & seed default modules</p>
            </div>

            <div className="flex items-center justify-center">
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 border border-emerald-100 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-emerald-800">Verified: {verifiedEmailOrPhone}</span>
              </div>
            </div>

            {onboardingStep < 2 && (
              <div className="flex items-center justify-center gap-1.5 text-[9px] font-mono font-bold tracking-widest text-stone-400 uppercase">
                <span className={onboardingStep === 1 ? "text-emerald-800" : "text-stone-400"}>01. Profile & Tenant</span>
              </div>
            )}

            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
              {onboardingStep === 1 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Rivera"
                      value={obName}
                      onChange={(e) => setObName(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-850 select-text"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      Workspace Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Corp"
                      value={obOrgName}
                      onChange={(e) => setObOrgName(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-850 select-text"
                    />
                  </div>

                  {onboardingType === "email" && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Create Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        placeholder="At least 8 characters"
                        value={obPassword}
                        onChange={(e) => setObPassword(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-850 select-text"
                      />
                      <p className="text-[9px] text-stone-400 font-medium">You&apos;ll use this password to sign in.</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={obLoading || !obName.trim() || !obOrgName.trim() || (onboardingType === "email" && obPassword.length < 8)}
                    className="w-full bg-stone-900 hover:bg-stone-850 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                  >
                    <span>Launch Workspace</span>
                    <Bot className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="space-y-3 animate-slide-up">
                  <div className="bg-[#141413] border border-stone-850 p-4 rounded-xl shadow-inner space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Loader className="w-3 h-3 animate-spin text-emerald-500" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 font-mono">Provisioning...</span>
                      </div>
                    </div>
                    <div className="font-mono text-[9px] text-stone-300 space-y-1.5 leading-relaxed select-text">
                      {obLogs.map((log, index) => (
                        <div key={index}>
                          <span className="text-emerald-600 mr-1.5">✓</span>{log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-[#FAF9F5] text-emerald-800 font-sans">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
