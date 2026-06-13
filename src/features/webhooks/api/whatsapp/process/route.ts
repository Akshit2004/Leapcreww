import { route, ok, fail, body, requireFields } from "@/shared/lib/api";
import { simulateInboundMessage } from "../../../services/whatsappInboundService";

export const POST = route(async (req) => {
  // Only usable in development — prevents accidental sandbox calls in production
  if (process.env.NODE_ENV === "production") {
    return fail("Sandbox simulation endpoint is disabled in production.", 403);
  }

  const payload = await body<{ from?: string; text?: string }>(req);
  requireFields(payload, ["from", "text"]);

  try {
    const result = await simulateInboundMessage(payload.from!, payload.text!);
    return ok({ status: "ok", ...result }, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message === "No organization found") {
      return fail("No organization found", 404);
    }
    throw err;
  }
});
