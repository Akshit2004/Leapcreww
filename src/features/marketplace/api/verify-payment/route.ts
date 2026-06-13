import { ok, route, body, requireFields } from "@/shared/lib/api";
import { verifyOrderPayment } from "../../services/orderService";

/**
 * POST /api/marketplace/verify-payment — verify a Razorpay payment signature.
 *
 * Customer-facing; the trust boundary is the Razorpay signature itself.
 */
export const POST = route(async (req) => {
  const input = await body<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }>(req);
  requireFields(input, ["razorpay_order_id", "razorpay_payment_id", "razorpay_signature"]);

  const result = await verifyOrderPayment(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature);
  return ok({ status: "verified", ...result });
});
