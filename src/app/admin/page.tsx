"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Loader, ShieldOff } from "lucide-react";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { OverviewSection } from "@/features/admin/components/OverviewSection";
import { OrgsSection } from "@/features/admin/components/OrgsSection";
import { UsersSection } from "@/features/admin/components/UsersSection";
import { BillingSection } from "@/features/admin/components/BillingSection";
import { TemplatesSection } from "@/features/admin/components/TemplatesSection";
import { LogsSection } from "@/features/admin/components/LogsSection";

function AdminPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const activeSection = searchParams.get("section") ?? "overview";
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleSection = useCallback(
    (id: string) => {
      router.push(`/admin?section=${id}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    const checkAccess = async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (cancelled) return;
        if (res.status === 403) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error("fetch_failed");
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection />;
      case "orgs":
        return <OrgsSection onNavigateToOrg={() => handleSection("orgs")} />;
      case "users":
        return <UsersSection />;
      case "billing":
        return <BillingSection />;
      case "templates":
        return <TemplatesSection />;
      case "logs":
        return <LogsSection />;
      default:
        return <OverviewSection />;
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#fafaf9]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-stone-950 flex items-center justify-center">
            <Loader className="w-6 h-6 animate-spin text-white" />
          </div>
          <span className="text-[11px] tracking-widest uppercase font-extrabold text-stone-500">
            Loading Admin…
          </span>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#fafaf9] px-6">
        <div className="max-w-sm w-full bg-white border border-stone-200 p-8 space-y-5 text-center">
          <div className="w-12 h-12 bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
            <ShieldOff className="w-5 h-5 text-red-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-black text-stone-900 text-base uppercase tracking-tight">
              Platform Admin Only
            </h3>
            <p className="text-stone-500 text-xs leading-relaxed">
              {"Your account doesn't have platform admin access."}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full bg-stone-950 hover:bg-stone-800 text-white font-bold text-xs py-2.5 transition-colors cursor-pointer uppercase tracking-wider"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#fafaf9] font-sans">
      <AdminSidebar
        activeSection={activeSection}
        setSection={handleSection}
        session={session}
      />
      <main className="flex-1 overflow-y-auto h-full bg-[#fafaf9]">
        {renderSection()}
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-[#fafaf9]">
          <Loader className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      }
    >
      <AdminPageInner />
    </Suspense>
  );
}
