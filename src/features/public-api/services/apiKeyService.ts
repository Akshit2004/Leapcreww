/**
 * apiKeyService.ts — Issue and verify Project API keys (T-08).
 *
 * The plaintext key is shown ONCE at creation; only its SHA-256 hash is stored.
 * Format: wf_live_<random>. The non-secret prefix is kept for display.
 */
import * as crypto from "crypto";
import { ApiError } from "@/shared/lib/api";
import * as repo from "../repositories/apiKeyRepo";
import type { ApiKeyContext, CreateApiKeyInput } from "../types";

const hash = (key: string) => crypto.createHash("sha256").update(key).digest("hex");

/**
 * Closed set of grantable scopes. Keys may only ever hold scopes from this list,
 * so a typo or an unknown/over-broad scope passed in the issue request is
 * rejected (400) rather than silently persisted onto the key.
 */
export const VALID_SCOPES = [
  "messages:send",
  "contacts:read",
  "contacts:write",
  "templates:read",
  "leads:write",
] as const;

const DEFAULT_SCOPES = ["messages:send", "contacts:read", "contacts:write", "templates:read"];

export async function issueKey(input: CreateApiKeyInput) {
  const scopes = input.scopes ?? DEFAULT_SCOPES;
  const unknown = scopes.filter((s) => !(VALID_SCOPES as readonly string[]).includes(s));
  if (unknown.length) {
    throw new ApiError(`Unknown scope(s): ${unknown.join(", ")}`, 400);
  }

  const prefix_str = input.isSandbox ? "wf_test_" : "wf_live_";
  const secret = `${prefix_str}${crypto.randomBytes(24).toString("hex")}`;
  const prefix = secret.slice(0, 12);
  const record = await repo.createKey({
    name: input.name,
    hashedKey: hash(secret),
    prefix,
    scopes,
    organizationId: input.organizationId,
    isSandbox: input.isSandbox ?? false,
  });
  // Return the plaintext exactly once.
  return { id: record.id, name: record.name, prefix, key: secret, isSandbox: record.isSandbox };
}

export function listKeys(organizationId: string) {
  return repo.listKeys(organizationId);
}

export async function revokeKey(organizationId: string, id: string) {
  const key = await repo.findById(id, organizationId);
  if (!key) throw new ApiError("Not found", 404);
  if (key.revokedAt) return key;
  return repo.revoke(id);
}

/**
 * Verify a bearer token from a /v1 request → org + scopes context, or throw 401.
 * Usage in a v1 route: const ctx = await authenticateApiKey(req);
 */
export async function authenticateApiKey(req: Request): Promise<ApiKeyContext> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new ApiError("Missing API key", 401);

  const record = await repo.findByHash(hash(token));
  if (!record || record.revokedAt) throw new ApiError("Invalid or revoked API key", 401);

  void repo.touch(record.id);
  return { organizationId: record.organizationId, scopes: record.scopes, isSandbox: record.isSandbox ?? false };
}

export function requireScope(ctx: ApiKeyContext, scope: string) {
  if (!ctx.scopes.includes(scope)) throw new ApiError(`Missing scope: ${scope}`, 403);
}
