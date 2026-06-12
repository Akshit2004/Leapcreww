/**
 * POST /api/webhooks/ndr
 *
 * Courier-agnostic NDR (Non-Delivery Report) inbound webhook.
 * Accepts a normalized payload or a Shiprocket-style payload and calls
 * handleNdrWebhook() to create the NdrEvent, stamp the contact, and fire the
 * drip sequence.
 *
 * Auth: Authorization: Bearer wf_live_<key>  (same API key infra as /api/webhooks/commerce)
 *
 * Normalized payload:
 *   {
 *     awb: string;             // Airway Bill number
 *     order_id?: string;       // merchant order ID
 *     courier?: string;        // e.g. "Delhivery"
 *     attempt?: number;        // delivery attempt number, default 1
 *     reason?: string;         // NDR reason from courier
 *     customer_phone: string;  // customer phone (any format)
 *     customer_name?: string;  // customer display name
 *   }
 *
 * Shiprocket-style additions (normalized transparently before dispatch):
 *   shipment_id  → awb
 *   phone        → customer_phone
 */
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/features/public-api/services/apiKeyService";
import { handleNdrWebhook } from "@/features/ndr/services/ndrService";
import { ApiError } from "@/shared/lib/api";

export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticateApiKey(req);
    const orgId = ctx.organizationId;

    const raw = await req.json();

    // ── Normalize Shiprocket-style keys to the canonical shape ───────────
    // Shiprocket sends `shipment_id` as the AWB and `phone` as the customer
    // phone. Map them to our canonical field names before validation so both
    // integrations share one code path.
    const body: Record<string, unknown> = { ...raw };
    if (!body.awb && body.shipment_id) {
      body.awb = body.shipment_id;
    }
    if (!body.customer_phone && body.phone) {
      body.customer_phone = body.phone;
    }

    const awb = typeof body.awb === "string" ? body.awb.trim() : "";
    const customerPhone =
      typeof body.customer_phone === "string" ? body.customer_phone.trim() : "";

    if (!awb) {
      return NextResponse.json(
        { error: "awb (or shipment_id) is required" },
        { status: 400 }
      );
    }
    if (!customerPhone) {
      return NextResponse.json(
        { error: "customer_phone (or phone) is required" },
        { status: 400 }
      );
    }

    const { ndrEventId, contactId } = await handleNdrWebhook(orgId, {
      awb,
      orderId: typeof body.order_id === "string" ? body.order_id : undefined,
      courier: typeof body.courier === "string" ? body.courier : undefined,
      attempt:
        typeof body.attempt === "number"
          ? body.attempt
          : typeof body.attempt === "string"
          ? parseInt(body.attempt, 10) || 1
          : 1,
      reason: typeof body.reason === "string" ? body.reason : undefined,
      customerPhone,
      customerName:
        typeof body.customer_name === "string" ? body.customer_name : undefined,
    });

    return NextResponse.json({ success: true, ndrEventId, contactId });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[NDR webhook]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
