/**
 * ratelimit.ts — Customer-level rate limiting (infra).
 *
 * Backed by Upstash Redis over its REST API so it runs in the Edge runtime
 * (middleware). Limits are keyed per-identifier (NextAuth user id, API key, or
 * IP) rather than globally, so one noisy tenant cannot exhaust everyone else.
 *
 * Degrades gracefully: when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 * are absent (e.g. local dev before provisioning), `checkRateLimit` returns
 * `null` and the caller should allow the request through. This mirrors the
 * GROQ_API_KEY pattern in shared/lib/groq.ts — a missing optional dependency
 * never crashes a request path (Constitution, Article VII).
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/** Tiers map to the protection level of an endpoint group. */
export type RateLimitTier = "ai" | "publicApi" | "standard" | "otp";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix epoch (ms) when the window resets. */
  reset: number;
}

/** Window definitions per tier. Tuned to throttle abuse, not normal usage. */
const TIERS: Record<RateLimitTier, { tokens: number; window: Parameters<typeof Ratelimit.slidingWindow>[1] }> = {
  // AI routes call paid LLM APIs — keep the ceiling low to cap spend per user.
  ai: { tokens: 500, window: "1 d" },
  // Public Project-API key traffic (/api/v1/*): generous but bounded per key.
  publicApi: { tokens: 240, window: "1 m" },
  // Everything else under /api/*: normal operational headroom per user.
  standard: { tokens: 100, window: "10 s" },
  // WhatsApp OTP sends — keyed by normalized phone to prevent OTP bombing.
  otp: { tokens: 3, window: "15 m" },
};

let redis: Redis | null = null;
const limiters = new Map<RateLimitTier, Ratelimit>();

/** Lazily build the Redis client, or null when Upstash isn't configured. */
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

/** Lazily build (and cache) the limiter for a tier, or null when disabled. */
function getLimiter(tier: RateLimitTier): Ratelimit | null {
  const cached = limiters.get(tier);
  if (cached) return cached;
  const client = getRedis();
  if (!client) return null;
  const { tokens, window } = TIERS[tier];
  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix: `leapcreww:rl:${tier}`,
    analytics: false,
  });
  limiters.set(tier, limiter);
  return limiter;
}

/** True when Upstash credentials are present and limiting is active. */
export function isRateLimitingEnabled(): boolean {
  return getRedis() !== null;
}

/**
 * Check (and consume) one token for `identifier` against a tier's window.
 * Returns `null` when rate limiting is disabled so the caller allows through.
 */
export async function checkRateLimit(
  tier: RateLimitTier,
  identifier: string
): Promise<RateLimitResult | null> {
  const limiter = getLimiter(tier);
  if (!limiter) return null;
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  return { success, limit, remaining, reset };
}
