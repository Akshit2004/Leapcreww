import { z } from "zod";
import { route, ok } from "@/shared/lib/api";
import { parseBody } from "@/shared/lib/validation";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import { authenticateApiKey, requireScope } from "../../../services/apiKeyService";

const SendMessageSchema = z
  .object({
    to: z.string().trim().min(5, "A destination phone number is required").max(20),
    text: z.string().max(4096).optional(),
    template: z.string().max(512).optional(),
  })
  .refine((d) => Boolean(d.text) || Boolean(d.template), {
    message: "Provide either `text` or a `template` name",
  });

/** POST /v1/messages — send a WhatsApp message using a Project API key (T-08). */
export const POST = route(async (req) => {
  const ctx = await authenticateApiKey(req);
  requireScope(ctx, "messages:send");

  const payload = await parseBody(req, SendMessageSchema);

  const message = payload.template
    ? { to: formatPhoneNumber(payload.to), template: { name: payload.template, language: { code: "en_US" } } }
    : { to: formatPhoneNumber(payload.to), text: payload.text || "" };

  const result = await sendWhatsAppMessage(message, ctx.organizationId);
  return ok({ ok: result.ok, waMessageId: result.data?.messages?.[0]?.id ?? null, error: result.error });
});
