import crypto from "crypto";

// ── HMAC verification (install request + webhook payloads) ────────────────
// Shopify signs install redirects by computing HMAC-SHA256 over all query
// params EXCEPT `hmac` (sorted, URL-encoded, joined with "&").
export function verifyShopifyInstallHmac(
  searchParams: URLSearchParams,
  secret: string
): boolean {
  const provided = searchParams.get("hmac");
  if (!provided) return false;

  const pairs: string[] = [];
  searchParams.forEach((value, key) => {
    if (key === "hmac") return;
    // Percent-encode per Shopify spec: & → %26, % → %25
    const k = key.replace(/%/g, "%25").replace(/&/g, "%26");
    const v = value.replace(/%/g, "%25").replace(/&/g, "%26");
    pairs.push(`${k}=${v}`);
  });
  pairs.sort();
  const msg = pairs.join("&");

  const digest = crypto.createHmac("sha256", secret).update(msg).digest("hex");
  const a = Buffer.from(digest, "hex");
  const b = Buffer.from(provided, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── Signed state ─────────────────────────────────────────────────────────
// Encodes orgId + timestamp into a tamper-evident state token so we can
// verify it in the callback without a database round-trip.
// Format: `<orgId>.<ts>.<sig>` where sig = HMAC-SHA256("<orgId>.<ts>", secret)
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function buildSignedState(orgId: string, secret: string): string {
  const ts = Date.now().toString();
  const payload = `${orgId}.${ts}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function parseSignedState(
  state: string,
  secret: string
): { orgId: string } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length < 3) return null;
    const sig = parts[parts.length - 1];
    const orgId = parts[0];
    const ts = parts[1];
    const payload = `${orgId}.${ts}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(sig, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    if (Date.now() - parseInt(ts, 10) > STATE_TTL_MS) return null;
    return { orgId };
  } catch {
    return null;
  }
}

// ── Token encryption ─────────────────────────────────────────────────────
// AES-256-GCM with a 32-byte key from SHOPIFY_TOKEN_KEY env var.
// Falls back to plaintext storage when key is absent (dev only).
const ALGO = "aes-256-gcm";

export function encryptToken(plaintext: string): string {
  const keyHex = process.env.SHOPIFY_TOKEN_KEY;
  if (!keyHex) return plaintext; // dev fallback — warn in prod via health check
  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptToken(stored: string): string {
  if (!stored.startsWith("enc:")) return stored; // plaintext / dev mode
  const keyHex = process.env.SHOPIFY_TOKEN_KEY;
  if (!keyHex) throw new Error("SHOPIFY_TOKEN_KEY not set — cannot decrypt access token");
  const [, ivHex, tagHex, encHex] = stored.split(":");
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc).toString("utf8") + decipher.final("utf8");
}

// ── Webhook HMAC (raw body) ──────────────────────────────────────────────
export function verifyShopifyWebhookHmac(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(header);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
