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

export async function issueKey(input: CreateApiKeyInput) {
  const secret = `wf_live_${crypto.randomBytes(24).toString("hex")}`;
  const prefix = secret.slice(0, 12);
  const record = await repo.createKey({
    name: input.name,
    hashedKey: hash(secret),
    prefix,
    scopes: input.scopes ?? ["messages:send"],
    organizationId: input.organizationId,
  });
  // Return the plaintext exactly once.
  return { id: record.id, name: record.name, prefix, key: secret };
}

export function listKeys(organizationId: string) {
  return repo.listKeys(organizationId);
}

export function revokeKey(id: string) {
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
  return { organizationId: record.organizationId, scopes: record.scopes };
}

export function requireScope(ctx: ApiKeyContext, scope: string) {
  if (!ctx.scopes.includes(scope)) throw new ApiError(`Missing scope: ${scope}`, 403);
}
