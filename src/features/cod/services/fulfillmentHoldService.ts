/**
 * fulfillmentHoldService.ts — Manages Shopify fulfillment holds for high-risk COD orders.
 *
 * placeHoldIfEnabled: called at order creation when risk score is high.
 * releaseHold: called when a COD order is confirmed via WhatsApp.
 * autoReleaseExpiredHolds: called by the hourly cron — releases holds older than 4h
 *   where no WhatsApp reply was received (cod_status still "pending").
 */
import { prisma } from "@/shared/lib/prisma";
import {
  getShopifyCredentials,
  placeFulfillmentHold,
  releaseFulfillmentHold,
  tagShopifyOrder,
} from "@/features/integrations/connectors/shopifyAdmin";
import { setOrderFulfillmentHold, clearOrderFulfillmentHold } from "../repositories/codRepo";

/**
 * Place a Shopify fulfillment hold if the org has opted in.
 * Also tags the order as "WF-High-Risk" in Shopify dashboard.
 * Safe to call fire-and-forget — catches all errors internally.
 */
export async function placeHoldIfEnabled(
  orgId: string,
  shopifyNumericId: string,
  internalOrderId: string,
  reasonNotes: string,
): Promise<void> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { fulfillmentHoldEnabled: true },
    });
    if (!org?.fulfillmentHoldEnabled) return;

    const creds = await getShopifyCredentials(orgId);
    if (!creds) return;

    const [foId] = await Promise.all([
      placeFulfillmentHold(creds, shopifyNumericId, reasonNotes),
      tagShopifyOrder(creds, shopifyNumericId, ["WF-High-Risk"]),
    ]);

    if (foId) {
      await prisma.order.update({
        where: { id: internalOrderId },
        data: { fulfillmentHoldId: foId, fulfillmentHeldAt: new Date() },
      });
    }
  } catch (err) {
    console.warn("[FulfillmentHold] placeHoldIfEnabled error:", err);
  }
}

/**
 * Release the fulfillment hold on an order (by internal Order.id UUID).
 * Called when a customer confirms their COD order via WhatsApp.
 * Safe to call fire-and-forget.
 */
export async function releaseHold(orgId: string, internalOrderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: internalOrderId },
      select: { fulfillmentHoldId: true, shopifyNumericId: true },
    });
    if (!order?.fulfillmentHoldId) return;

    const creds = await getShopifyCredentials(orgId);
    if (!creds) return;

    await releaseFulfillmentHold(creds, order.fulfillmentHoldId);
    await prisma.order.update({
      where: { id: internalOrderId },
      data: { fulfillmentHoldId: null, fulfillmentHeldAt: null },
    });
  } catch (err) {
    console.warn("[FulfillmentHold] releaseHold error:", err);
  }
}

/**
 * Find all orders with holds older than 4h that never received a WhatsApp reply
 * (cod_status still "pending"), and release each one via Shopify.
 *
 * Called by the hourly cron at /api/cron/fulfillment-hold-release.
 */
export async function autoReleaseExpiredHolds(): Promise<{ released: number }> {
  const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000);

  const expiredOrders = await prisma.order.findMany({
    where: {
      fulfillmentHeldAt: { lt: cutoff },
      fulfillmentHoldId: { not: null },
      codStatus: "pending",
    },
    select: { id: true, orderId: true, fulfillmentHoldId: true, organizationId: true },
  });

  let released = 0;

  for (const order of expiredOrders) {
    try {
      const creds = await getShopifyCredentials(order.organizationId);
      if (!creds || !order.fulfillmentHoldId) continue;

      await releaseFulfillmentHold(creds, order.fulfillmentHoldId);
      await clearOrderFulfillmentHold(order.orderId, order.organizationId);
      released++;
    } catch (err) {
      console.warn(`[FulfillmentHold] autoRelease failed for order ${order.orderId}:`, err);
    }
  }

  return { released };
}
