/**
 * cors.ts — CORS support for the public `/v1` API.
 *
 * These endpoints are authenticated by an API key in the `Authorization` header
 * (not cookies), so they're safe to expose to any origin: the wildcard origin is
 * fine because no ambient credentials ride along. Browser callers (e.g. a lead
 * capture form on a customer site) send a preflight `OPTIONS` first — export the
 * `corsPreflight` handler as `OPTIONS` and wrap real handlers with `withCors`.
 */
import { NextResponse } from "next/server";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key",
  "Access-Control-Max-Age": "86400",
};

/** Copy CORS headers onto an existing response. */
export function withCorsHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) res.headers.set(key, value);
  return res;
}

/** Preflight handler — export directly as `OPTIONS` from a v1 route. */
export function corsPreflight(): NextResponse {
  return withCorsHeaders(new NextResponse(null, { status: 204 }));
}

/**
 * Wrap a route handler so every response it returns — success or error — carries
 * the CORS headers the browser needs to read it.
 */
export function withCors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => withCorsHeaders(await handler(...args));
}
