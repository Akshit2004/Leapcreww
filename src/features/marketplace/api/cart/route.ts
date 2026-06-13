import { ok, route, body, requireFields } from "@/shared/lib/api";
import { createOrderFromCart } from "../../services/orderService";

/**
 * POST /api/marketplace/cart — create a Razorpay order from a contact's cart.
 *
 * Customer-facing checkout invoked via the WhatsApp bot flow; the trust
 * boundary for payment confirmation is the Razorpay signature, not session auth.
 */
export const POST = route(async (req) => {
  const input = await body<{ contactId: string; orgId: string; address?: string }>(req);
  requireFields(input, ["contactId", "orgId"]);

  const result = await createOrderFromCart(input.contactId, input.orgId, input.address);
  return ok(result);
});
