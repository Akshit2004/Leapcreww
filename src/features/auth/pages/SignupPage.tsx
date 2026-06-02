"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Bot, ArrowRight, User, Mail, KeyRound, Briefcase, AlertCircle, Loader 
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [password, setPassword] = useState("");
  
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !orgName.trim() || !password.trim()) return;

    setErrorMsg("");
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          organizationName: orgName.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || "A registration error occurred.");
        setLoading(false);
      } else {
        router.push("/login?registered=true");
      }
    } catch {
      setErrorMsg("Unable to connect to registration servers. Please check your network.");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#FAF9F5] text-stone-900 grid grid-cols-1 md:grid-cols-12 overflow-hidden select-none font-sans">
      
      {/* ─── Left Column: Premium Visual Cover Showcase ─── */}
      <div className="hidden md:flex md:col-span-5 lg:col-span-6 h-full relative bg-stone-950 flex-col justify-between p-12 overflow-hidden">
        {/* Full-bleed high-taste illustration showcase */}
        <div className="absolute inset-0 z-0">
          <img
            src="/login_showcase.png"
            alt="WappFlow SaaS Dashboard Mockup"
            className="w-full h-full object-cover opacity-60 mix-blend-luminosity hover:opacity-75 transition-opacity duration-700"
          />
          {/* Subtle gradient overlay to darken bottom for typography legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent z-10" />
        </div>

        {/* Brand Logo Header */}
        <div className="relative z-20">
          <Link href="/" className="inline-flex items-center gap-2 text-white font-mono text-xs tracking-[0.2em] font-black uppercase">
            <Bot className="w-5 h-5 text-emerald-500" />
            WappFlow
          </Link>
        </div>

        {/* Editorial Typography Overlay */}
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

      {/* ─── Right Column: Centered Registration Card ─── */}
      <div className="col-span-1 md:col-span-7 lg:col-span-6 h-full flex flex-col justify-center items-center relative p-6 sm:p-12">
        {/* Fine background dot canvas */}
        <div className="absolute inset-0 canvas-dot-grid opacity-80 pointer-events-none" />

        {/* Mobile Header (Hidden on Desktop) */}
        <div className="md:hidden text-center space-y-2 mb-4 relative z-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-stone-900 font-mono text-xs tracking-[0.2em] font-black uppercase">
            <Bot className="w-5 h-5 text-emerald-850" />
            WappFlow
          </Link>
        </div>

        {/* Elevated Right Card */}
        <div className="w-full max-w-sm bg-white border border-stone-200/85 p-6 sm:p-8 rounded-3xl shadow-xl space-y-5 relative z-10 bg-gradient-to-b from-[#FDFDFD] to-white animate-slide-up">
          
          <div className="text-center space-y-1">
            <h2 className="text-lg font-serif text-stone-900 font-semibold tracking-tight">Create Workspace</h2>
            <p className="text-stone-500 text-[10px] font-medium">Start managing WhatsApp leads and visual chatbots</p>
          </div>

          {/* Error banner */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-start gap-2 text-[11px] text-rose-800 animate-slide-in-left leading-relaxed font-medium select-text">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* User Name */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                <User className="w-3 h-3" />
                Full Name
              </label>
              <input
                type="text"
                required
                disabled={loading}
                placeholder="e.g. Alex Rivera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-850 disabled:opacity-50 select-text"
              />
            </div>

            {/* Email Address */}
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

            {/* Org name */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                Organization / Company
              </label>
              <input
                type="text"
                required
                disabled={loading}
                placeholder="e.g. Acme Marketing Corp"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-850 disabled:opacity-50 select-text"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                <KeyRound className="w-3 h-3" />
                Security Password
              </label>
              <input
                type="password"
                required
                disabled={loading}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-850 disabled:opacity-50 select-text"
              />
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading || !name.trim() || !email.trim() || !orgName.trim() || !password.trim()}
              className="w-full bg-stone-900 hover:bg-stone-850 disabled:opacity-40 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
            >
              {loading ? (
                <Loader className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <>
                  <span>Launch New Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link to Login */}
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

    </div>
  );
}
