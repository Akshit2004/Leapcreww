/**
 * api.ts — Thin-route helpers.
 *
 * Keeps Next.js route handlers small and uniform: parse → guard → call a
 * service → respond. Business logic lives in feature `services/`, data access
 * in feature `repositories/`. Routes should read like a table of contents.
 */
import { NextResponse } from "next/server";
import { getAppSession, hasOrgRole, isPlatformAdmin, type AppSession, type Role } from "./authz";

/** Standard success envelope. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data as unknown as Record<string, unknown>, init);
}

/** Standard error envelope. */
export function fail(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** Thrown by guards; caught by `route()` and turned into an HTTP response. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Wrap a handler so thrown ApiErrors become clean responses and unexpected
 * errors become a logged 500. Usage:
 *   export const POST = route(async (req) => { ... return ok(...) });
 */
export function route(
  handler: (req: Request, ctx: { params?: Record<string, string> }) => Promise<NextResponse>
) {
  return async (req: Request, ctx: { params?: Promise<Record<string, string>> | Record<string, string> }) => {
    try {
      const params = ctx?.params ? await ctx.params : undefined;
      return await handler(req, { params });
    } catch (err) {
      if (err instanceof ApiError) return fail(err.message, err.status);
      // Never leak internal error details to the client; log them server-side.
      console.error("[api] Unhandled route error:", err);
      return fail("Internal error", 500);
    }
  };
}

/** Require an authenticated session or throw 401. */
export async function requireSession(): Promise<AppSession> {
  const session = await getAppSession();
  if (!session) throw new ApiError("Unauthorized", 401);
  return session;
}

/** Require membership in `orgId` with at least `minRole`, returning the session. */
export async function requireOrg(orgId: string, minRole: Role = "AGENT"): Promise<AppSession> {
  const session = await requireSession();
  if (!hasOrgRole(session, orgId, minRole)) {
    throw new ApiError("Forbidden: insufficient access to this workspace", 403);
  }
  return session;
}

/** Require a platform-admin (cross-tenant) session or throw 403. */
export async function requirePlatformAdmin(): Promise<AppSession> {
  const session = await requireSession();
  if (!isPlatformAdmin(session)) {
    throw new ApiError("Forbidden: platform admin only", 403);
  }
  return session;
}

/** Parse JSON body, throwing a 400 on malformed input. */
export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError("Invalid JSON body", 400);
  }
}

/** Assert required fields are present on a payload, or throw 400. */
export function requireFields<T extends object>(payload: T, keys: (keyof T)[]): void {
  const missing = keys.filter((k) => {
    const v = (payload as Record<string, unknown>)[k as string];
    return v === undefined || v === null || v === "";
  });
  if (missing.length) {
    throw new ApiError(`Missing required fields: ${missing.map(String).join(", ")}`, 400);
  }
}
