"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, ArrowRight, User, Mail, KeyRound, Briefcase, AlertCircle, Loader } from "lucide-react";

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
        // Redirect to login with dynamic registered success flag
        router.push("/login?registered=true");
      }
    } catch {
      setErrorMsg("Unable to connect to registration servers. Please check your network.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-6 relative select-none">
      {/* Background glowing meshes */}
      <div className="absolute w-[500px] h-[500px] bg-emerald-500/5 rounded-full filter blur-[120px] pointer-events-none" />

      {/* Registration Container Card */}
      <div className="w-full max-w-md bg-white border border-slate-100 p-8 rounded-3xl backdrop-filter backdrop-blur-md shadow-2xl space-y-6 relative z-10 bg-gradient-to-b from-emerald-50/10 to-white animate-slide-up">
        
        {/* Branding header */}
        <div className="text-center space-y-2.5">
          <Link href="/" className="inline-flex w-10 h-10 rounded-2xl bg-emerald-600 items-center justify-center shadow-lg shadow-emerald-600/20 mb-1 hover:scale-105 active:scale-95 transition-transform">
            <Bot className="w-6 h-6 text-white" />
          </Link>
          <h2 className="text-xl font-black text-slate-900 font-sans">Create Your SaaS Workspace</h2>
          <p className="text-slate-500 text-xs font-semibold">Start managing WhatsApp leads and visual chatbots</p>
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div className="bg-red-500/5 border border-red-500/10 p-3.5 rounded-xl flex items-start gap-2.5 text-[11px] font-semibold text-red-500 animate-slide-in-left leading-relaxed select-text">
            <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* User Name input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Full Name
            </label>
            <input
              type="text"
              required
              disabled={loading}
              placeholder="e.g. Alex Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 select-text"
            />
          </div>

          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email Address
            </label>
            <input
              type="email"
              required
              disabled={loading}
              placeholder="e.g. alex@wappflow.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 select-text"
            />
          </div>

          {/* Org name input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              Organization / Company
            </label>
            <input
              type="text"
              required
              disabled={loading}
              placeholder="e.g. Acme Marketing Corp"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 select-text"
            />
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              Security Password
            </label>
            <input
              type="password"
              required
              disabled={loading}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 select-text"
            />
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading || !name.trim() || !email.trim() || !orgName.trim() || !password.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold text-xs py-3 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20 active:scale-98"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin text-white" />
                <span>Generating SaaS Workspace...</span>
              </>
            ) : (
              <>
                <span>Launch New Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info link */}
        <div className="text-center text-[11px] text-zinc-500 pt-4 border-t border-slate-100 font-medium">
          <span>Already have an active account? </span>
          <Link href="/login" className="text-emerald-600 hover:text-emerald-500 font-bold">
            Sign In Instead
          </Link>
        </div>
      </div>
    </div>
  );
}
