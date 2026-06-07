/**
 * proxy.ts — Edge rate limiting for /api/* (Constitution, Article III).
 *
 * (Next.js 16 renamed the "middleware" file convention to "proxy".)
 *
 * Applies per-customer limits before a request reaches a route handler:
 *   /api/ai/*   → "ai" tier      (low ceiling; AI routes call paid LLM APIs)
 *   /api/v1/*   → "publicApi"    (keyed by Project API key)
 *   /api/*      → "standard"     (keyed by NextAuth user id, IP fallback)
 *
 * Identity comes from the NextAuth JWT (session strategy is "jwt", so the token
 * is readable at the edge). Unauthenticated callers fall back to client IP.
 *
 * Excluded: NextAuth's own routes, signature-verified webhooks, cron, and
 * Uploadthing callbacks — these are either pre-auth or burst by design.
 *
 * When Upstash isn't configured, `checkRateLimit` returns null and every
 * request is allowed through (see shared/lib/ratelimit.ts).
 */
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit, type RateLimitTier } from "@/shared/lib/ratelimit";

/** Path prefixes that must never be throttled here. */
const EXCLUDED_PREFIXES = [
  "/api/auth/", // NextAuth sign-in/callback/session (pre-session)
  "/api/webhooks/", // Meta / Razorpay / Shopify — HMAC verified, can burst
  "/api/cron/", // Vercel cron — guarded by CRON_SECRET
  "/api/uploadthing", // Upload lifecycle callbacks
];

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "127.0.0.1";
}

/** SHA-256 the API key so the raw secret never lands in the Redis keyspace. */
async function hashKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function tierFor(pathname: string): RateLimitTier {
  if (pathname.startsWith("/api/ai/")) return "ai";
  if (pathname.startsWith("/api/v1/")) return "publicApi";
  return "standard";
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const tier = tierFor(pathname);

  // Resolve the rate-limit identity for this tier.
  let identifier: string;
  if (tier === "publicApi") {
    const auth = req.headers.get("authorization");
    const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
    identifier = bearer ? `key:${await hashKey(bearer)}` : `ip:${clientIp(req)}`;
  } else {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = typeof token?.id === "string" ? token.id : null;
    identifier = userId ? `user:${userId}` : `ip:${clientIp(req)}`;
  }

  const result = await checkRateLimit(tier, identifier);

  // Disabled (no Upstash configured) → allow through untouched.
  if (!result) return NextResponse.next();

  if (!result.success) {
    const retryAfter = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too Many Requests. Please slow down and try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "RateLimit-Limit": String(result.limit),
          "RateLimit-Remaining": String(result.remaining),
          "RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
        },
      }
    );
  }

  const res = NextResponse.next();
  res.headers.set("RateLimit-Limit", String(result.limit));
  res.headers.set("RateLimit-Remaining", String(result.remaining));
  res.headers.set("RateLimit-Reset", String(Math.ceil(result.reset / 1000)));
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
