/**
 * GET /api/cron/cod-token-expire
 *
 * Runs every 30 minutes. Finds high-risk COD orders where the ₹99 token
 * payment link was sent but not paid within 2 hours, then auto-cancels and
 * releases the Shopify fulfillment hold.
 *
 * Secured via Authorization: Bearer <CRON_SECRET>.
 */
import { NextRequest, NextResponse } from "next/server";
import { autoExpireUnpaidTokenOrders } from "@/features/cod/services/tokenPrepayService";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { expired } = await autoExpireUnpaidTokenOrders();
    return NextResponse.json({ success: true, expired });
  } catch (err) {
    console.error("[cron/cod-token-expire]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
