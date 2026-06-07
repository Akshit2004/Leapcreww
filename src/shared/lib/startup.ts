/**
 * startup.ts — Production environment sanity checks.
 *
 * Run once at server boot (via src/instrumentation.ts). Warns loudly when a
 * mandatory webhook/secret env is missing or left at a known-insecure default
 * in production. Never throws — a missing optional dependency must not crash the
 * process (Constitution, Article VII); the relevant routes already fail closed.
 */

/** Secrets that MUST be set (and unique) in production for security to hold. */
const MANDATORY_PROD_SECRETS = [
  "WHATSAPP_APP_SECRET", // WhatsApp webhook HMAC — routes reject all traffic if unset
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN", // Meta GET verification handshake
  "SHOPIFY_CLIENT_SECRET", // Shopify webhook HMAC
  "RAZORPAY_WEBHOOK_SECRET", // Razorpay webhook HMAC
  "NEXTAUTH_SECRET", // session/JWT signing
] as const;

/** Values that are insecure if they ever reach production (committed defaults). */
const INSECURE_DEFAULTS: Record<string, string> = {
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "wappflow_verify_2026",
};

export function assertProdSecrets(): void {
  if (process.env.NODE_ENV !== "production") return;

  const missing = MANDATORY_PROD_SECRETS.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(
      `[startup] ⚠️ Missing mandatory production secrets: ${missing.join(", ")}. ` +
        `Affected webhook/auth routes will reject traffic or fail closed until these are set.`
    );
  }

  for (const [key, insecure] of Object.entries(INSECURE_DEFAULTS)) {
    if (process.env[key] === insecure) {
      console.error(
        `[startup] ⚠️ ${key} is set to the committed default value. ` +
          `Set a unique, secret value per environment.`
      );
    }
  }
}
