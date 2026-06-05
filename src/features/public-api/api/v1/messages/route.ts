import { route, ok, requireFields, body } from "@/shared/lib/api";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import { authenticateApiKey, requireScope } from "../../../services/apiKeyService";

/** POST /v1/messages — send a WhatsApp message using a Project API key (T-08). */
export const POST = route(async (req) => {
  const ctx = await authenticateApiKey(req);
  requireScope(ctx, "messages:send");

  const payload = await body<{ to: string; text?: string; template?: string }>(req);
  requireFields(payload, ["to"]);

  const message = payload.template
    ? { to: formatPhoneNumber(payload.to), template: { name: payload.template, language: { code: "en_US" } } }
    : { to: formatPhoneNumber(payload.to), text: payload.text || "" };

  const result = await sendWhatsAppMessage(message, ctx.organizationId);
  return ok({ ok: result.ok, waMessageId: result.data?.messages?.[0]?.id ?? null, error: result.error });
});
