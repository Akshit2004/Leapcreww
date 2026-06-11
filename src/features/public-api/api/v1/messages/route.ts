import { z } from "zod";
import { route, ok } from "@/shared/lib/api";
import { parseBody } from "@/shared/lib/validation";
import { authenticateApiKey, requireScope } from "../../../services/apiKeyService";
import { sendV1Message, withIdempotency } from "../../../services/v1Service";

const SendMessageSchema = z
  .object({
    to: z.string().trim().min(5, "A destination phone number is required").max(20),
    text: z.string().max(4096).optional(),
    // Either the shorthand "template": "name" or the full object form.
    template: z
      .union([
        z.string().max(512),
        z.object({
          name: z.string().max(512),
          language: z.string().max(15).optional(),
          variables: z.array(z.string().max(1024)).max(20).optional(),
        }),
      ])
      .optional(),
    media: z
      .object({
        type: z.enum(["image", "video", "document"]),
        url: z.string().url().max(2048),
        caption: z.string().max(1024).optional(),
      })
      .optional(),
  })
  .refine((d) => Boolean(d.text) || Boolean(d.template) || Boolean(d.media), {
    message: "Provide `text`, `template`, or `media`",
  });

/**
 * POST /v1/messages — send a WhatsApp message with a Project API key (T-08).
 * Supports template variables/language, media, billing, and Idempotency-Key.
 */
export const POST = route(async (req) => {
  const ctx = await authenticateApiKey(req);
  requireScope(ctx, "messages:send");

  const payload = await parseBody(req, SendMessageSchema);
  const template =
    typeof payload.template === "string" ? { name: payload.template } : payload.template;

  const idempotencyKey = req.headers.get("idempotency-key");
  const { response, replayed } = await withIdempotency(ctx.organizationId, idempotencyKey, () =>
    sendV1Message(ctx.organizationId, { ...payload, template }, ctx.isSandbox)
  );

  return ok(response, { headers: replayed ? { "Idempotency-Replayed": "true" } : undefined });
});
