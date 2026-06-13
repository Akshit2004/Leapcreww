/**
 * GET /api/v1/events — Polling endpoint backed by the append-only Event table.
 *
 * Designed as a Zapier trigger source: poll every 5–15 minutes, pass the
 * `nextAfter` value back as `after` on the next request. Requires scope
 * `contacts:read`.
 */
import { route, ok, ApiError } from "@/shared/lib/api";
import { authenticateApiKey, requireScope } from "../../../services/apiKeyService";
import { listV1Events, EVENT_TYPES, type EventType } from "../../../services/v1Service";

export const GET = route(async (req) => {
  const ctx = await authenticateApiKey(req);
  requireScope(ctx, "contacts:read");

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as EventType | null;
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const afterParam = searchParams.get("after");
  const after = afterParam ? new Date(afterParam) : new Date(Date.now() - 60 * 60 * 1000);

  if (type && !EVENT_TYPES.includes(type)) {
    throw new ApiError(`Invalid type. Must be one of: ${EVENT_TYPES.join(", ")}`, 400);
  }

  const result = await listV1Events(ctx.organizationId, { type, limit, after });
  return ok(result);
});
