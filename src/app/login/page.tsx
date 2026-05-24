"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { Bot, ArrowRight, KeyRound, Mail, AlertCircle, Loader, CheckCircle } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Capture standard auth errors from url query
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const registeredParam = searchParams.get("registered");
    
    setErrorMsg("");
    setSuccessMsg("");
    
    if (errorParam) {
      if (errorParam === "CredentialsSignin") {
        setErrorMsg("Incorrect email address or password.");
      } else {
        setErrorMsg("An authentication error occurred. Please try again.");
      }
    } else if (registeredParam === "true") {
      setSuccessMsg("SaaS Sandbox Workspace created! Enter email and password to enter your dashboard.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        redirect: false
      });

      if (res?.error) {
        setErrorMsg(res.error || "Incorrect email or password.");
        setLoading(false);
      } else {
        // Retrieve session to resolve organizational slugs
        const session = await getSession();
        const activeOrgId = (session?.user as any)?.activeOrgId || (session?.user as any)?.organizations?.[0]?.id;

        if (activeOrgId) {
          router.push(`/org/${activeOrgId}`);
        } else {
          setErrorMsg("We couldn't locate any active workspace for your profile.");
          setLoading(false);
        }
      }
    } catch (err) {
      setErrorMsg("An unexpected connection issue occurred. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 text-stone-900 flex flex-col justify-center items-center px-6 relative select-none">
      {/* Background radial highlight */}
      <div className="absolute w-[500px] h-[500px] bg-orange-500/5 rounded-full filter blur-[120px] pointer-events-none" />

      {/* Login Container Box */}
      <div className="w-full max-w-md bg-white border border-orange-100 p-8 rounded-3xl backdrop-filter backdrop-blur-md shadow-2xl space-y-6 relative z-10 bg-gradient-to-b from-orange-50/80 to-white animate-slide-up">
        {/* Header Branding */}
        <div className="text-center space-y-2.5">
          <Link href="/" className="inline-flex w-10 h-10 rounded-2xl bg-orange-600 items-center justify-center shadow-lg shadow-orange-600/20 mb-1 hover:scale-105 active:scale-95 transition-transform">
            <Bot className="w-6 h-6 text-white" />
          </Link>
          <h2 className="text-xl font-black text-stone-900 font-sans">Welcome Back to WappFlow</h2>
          <p className="text-stone-500 text-xs font-semibold">Enter your credentials to access your SaaS CRM</p>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="bg-orange-500/5 border border-orange-500/10 p-3.5 rounded-xl flex items-start gap-2.5 text-[11px] font-semibold text-orange-500 animate-slide-in-left leading-relaxed select-text">
            <CheckCircle className="w-4.5 h-4.5 text-orange-500 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="bg-red-500/5 border border-red-500/10 p-3.5 rounded-xl flex items-start gap-2.5 text-[11px] font-semibold text-red-500 animate-slide-in-left leading-relaxed select-text">
            <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full bg-white border border-orange-200 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50 select-text"
            />
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              Password
            </label>
            <input
              type="password"
              required
              disabled={loading}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-orange-200 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50 select-text"
            />
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-orange-600 text-white font-bold text-xs py-3 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-orange-600/20 active:scale-98"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin text-white" />
                <span>Authenticating Workspace...</span>
              </>
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Card Footer notes */}
        <div className="text-center text-[11px] text-zinc-500 pt-4 border-t border-orange-100 font-medium">
          <span>Need a new organization instance? </span>
          <Link href="/signup" className="text-orange-500 hover:text-orange-400 font-bold">
            Register Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-amber-50 text-orange-600 font-sans">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
