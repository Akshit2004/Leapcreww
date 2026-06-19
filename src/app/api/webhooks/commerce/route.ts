/**
 * POST /api/webhooks/commerce
 *
 * Platform-agnostic commerce event webhook. Any store (WooCommerce, custom,
 * Dukaan, etc.) can POST a normalized CommerceEvent here using an org API key.
 * The same COD confirmation flows and sequence triggers that Shopify uses fire
 * identically — the platform is irrelevant above this layer.
 *
 * Auth: Authorization: Bearer wf_live_<key>
 *
 * Supported events:
 *   order.cod_pending    — COD order placed; fires cod_order_placed sequence
 *   order.placed         — Prepaid order placed; fires order_placed sequence
 *   cart.abandoned       — Cart left unpaid; fires cart_abandoned sequence
 *   inventory.restocked  — SKU back in stock; notifies registered watchers
 */
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/features/public-api/services/apiKeyService";
import { ApiError } from "@/shared/lib/api";
import { CommerceEventSchema, handleCommerceEvent } from "@/features/webhooks/services/commerceWebhookService";

export async function POST(req: NextRequest) {
  try {
    // Authenticate via existing API key infrastructure
    const ctx = await authenticateApiKey(req);
    const orgId = ctx.organizationId;

    const rawBody = await req.json();
    const parsed = CommerceEventSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await handleCommerceEvent(orgId, parsed.data);

    if ("skipped" in result) {
      return NextResponse.json({ success: true, ...result });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[Commerce webhook]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
