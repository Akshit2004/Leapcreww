import { z } from "zod";
import { route, ok } from "@/shared/lib/api";
import { parseBody } from "@/shared/lib/validation";
import { authenticateApiKey, requireScope } from "@/features/public-api/services/apiKeyService";
import { withIdempotency } from "@/features/public-api/services/v1Service";
import { withCors, corsPreflight } from "@/features/public-api/lib/cors";
import { createLead } from "../../../services/leadCaptureService";

const LeadSchema = z.object({
  phone: z.string().trim().min(5).max(20),
  name: z.string().trim().max(255).optional(),
  source: z.string().trim().min(1).max(100),
  result: z.string().trim().min(1).max(4096),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

/**
 * POST /v1/leads — capture a lead and deliver its pre-compiled result over
 * WhatsApp (T-08 surface). Requires scope `leads:write`. Honours Idempotency-Key
 * so a retried capture won't double-send the template.
 */
export const POST = withCors(
  route(async (req) => {
    const ctx = await authenticateApiKey(req);
    requireScope(ctx, "leads:write");

    const payload = await parseBody(req, LeadSchema);

    const idempotencyKey = req.headers.get("idempotency-key");
    const { response, replayed } = await withIdempotency(ctx.organizationId, idempotencyKey, () =>
      createLead(ctx.organizationId, payload, ctx.isSandbox)
    );

    return ok(
      { ok: true, ...response },
      { status: 201, headers: replayed ? { "Idempotency-Replayed": "true" } : undefined }
    );
  })
);

/** Preflight for browser callers (the lead capture form posts cross-origin). */
export const OPTIONS = corsPreflight;
