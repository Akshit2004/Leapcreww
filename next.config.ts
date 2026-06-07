import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy.
 *
 * Whitelist is derived from the integrations this app actually loads in the
 * browser:
 *   - Meta JS SDK:  https://connect.facebook.net  + login frames on facebook.com
 *     (see CampaignsTab.tsx / SettingsTab.tsx embedded-signup)
 *   - Razorpay:     checkout script + payment iframe + API
 *   - Supabase:     REST + realtime (wss) storage
 *   - Uploadthing:  utfs.io / *.ufs.sh upload endpoints
 *   - Unsplash:     marketing/demo imagery
 *   - Groq:         server-side only, listed under connect-src for completeness
 *
 * Fonts are self-hosted by next/font, so no external font origin is required.
 * Next.js + React inject inline bootstrap scripts, so 'unsafe-inline' is kept
 * for script/style; nonces would require per-request middleware and break
 * static optimization. 'unsafe-eval' is dev-only (React Fast Refresh).
 */
function contentSecurityPolicy(): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://connect.facebook.net",
      "https://checkout.razorpay.com",
      "https://*.razorpay.com",
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https:", // WhatsApp media, profile photos, product imagery — non-executable
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...(isDev ? ["ws://localhost:*", "http://localhost:*"] : []),
      "https://api.groq.com",
      "https://graph.facebook.com",
      "https://*.facebook.com",
      "https://api.razorpay.com",
      "https://*.razorpay.com",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://utfs.io",
      "https://*.ufs.sh",
      "https://*.uploadthing.com",
    ],
    "frame-src": [
      "'self'",
      "https://*.facebook.com",
      "https://checkout.razorpay.com",
      "https://api.razorpay.com",
      "https://*.razorpay.com",
    ],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "manifest-src": ["'self'"],
  };

  const policy = Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");

  // Force HTTPS for all subresources in production only (would break http://localhost).
  return isDev ? policy : `${policy}; upgrade-insecure-requests`;
}

/** OWASP-recommended security headers applied to every response. */
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
