/**
 * GET /api/cron/fulfillment-hold-release
 *
 * Hourly cron: finds COD orders with a Shopify fulfillment hold placed > 4h ago
 * that never received a WhatsApp reply (cod_status still "pending"), and releases
 * each hold automatically so the merchant's warehouse is not blocked indefinitely.
 *
 * Secured via Authorization: Bearer <CRON_SECRET>.
 * Configure in Vercel (vercel.json crons) or any external scheduler.
 */
import { NextRequest, NextResponse } from "next/server";
import { autoReleaseExpiredHolds } from "@/features/cod/services/fulfillmentHoldService";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { released } = await autoReleaseExpiredHolds();
    return NextResponse.json({ success: true, released });
  } catch (err) {
    console.error("[cron/fulfillment-hold-release]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
