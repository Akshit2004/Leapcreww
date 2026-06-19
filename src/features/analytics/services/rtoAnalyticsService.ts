/**
 * rtoAnalyticsService.ts — business logic for the RTO / NDR analytics surface.
 *
 * Aggregates:
 *  - NDR events: rescue rate, pending/cancelled counts, average delivery attempt.
 *  - COD orders: confirmation rate, COD→Prepaid conversion, RTO loss value.
 *  - High-risk contact count (tagged "COD-High-Risk" by the COD risk scorer).
 *  - Token prepay outcomes (₹99 engine): sent / paid / expired.
 *  - Fulfillment holds: active / auto-released.
 *  - Success fees this month: cod rescues, prepaid conversions, NDR rescues.
 *  - Network signals: unique fraud phones flagged by this brand.
 *  - Missing RTO templates check.
 *
 * All data access is delegated to analyticsRepo. No prisma here.
 */
import * as analyticsRepo from "../repositories/analyticsRepo";

export interface NdrStats {
  total: number;
  rescued: number;
  pending: number;
  cancelled: number;
  rescueRate: number;
  avgAttempt: number;
}

export interface CodStats {
  total: number;
  confirmed: number;
  cancelled: number;
  /** COD→Prepaid conversions: confirmed orders with a completed Razorpay payment. */
  converted: number;
  confirmRate: number;
  conversionRate: number;
  /** Sum of cancelled COD order totals (paise) — proxy for RTO loss value. */
  rtoLossPaise: number;
  highRiskFlagged: number;
}

export interface TokenPrepayStats {
  sent: number;
  paid: number;
  expired: number;
  payRate: number; // % of sent that were paid
}

export interface FulfillmentHoldStats {
  activeHolds: number;
  autoReleased: number;
  totalHeld: number;
}

export interface SuccessFeeStats {
  codRescues: number;
  prepaidConversions: number;
  ndrRescues: number;
  estimatedFeePaise: number;
}

export interface NetworkStats {
  totalSignals: number;
  uniquePhones: number;
}

export interface RtoAnalytics {
  ndr: NdrStats;
  cod: CodStats;
  tokenPrepay: TokenPrepayStats;
  fulfillmentHold: FulfillmentHoldStats;
  successFee: SuccessFeeStats;
  network: NetworkStats;
  missingTemplates: string[];
}

const NDR_RESCUED_STATUSES = new Set(["confirmed", "rescheduled", "address_updated"]);

export async function getRtoAnalytics(organizationId: string): Promise<RtoAnalytics> {
  const [ndrEvents, codOrders, highRiskCount, tokenStats, holdStats, feeStats, networkStats, missingTemplates] =
    await Promise.all([
      analyticsRepo.findNdrEvents(organizationId),
      analyticsRepo.findCodOrders(organizationId),
      analyticsRepo.countHighRiskCodContacts(organizationId),
      analyticsRepo.getTokenPrepayStats(organizationId),
      analyticsRepo.getFulfillmentHoldStats(organizationId),
      analyticsRepo.getSuccessFeeStats(organizationId),
      analyticsRepo.getNetworkSignalStats(organizationId),
      analyticsRepo.getMissingRtoTemplates(organizationId),
    ]);

  // ── NDR aggregation ──────────────────────────────────────────────────────────
  const ndrTotal = ndrEvents.length;
  const ndrRescued = ndrEvents.filter((e) => NDR_RESCUED_STATUSES.has(e.status)).length;
  const ndrCancelled = ndrEvents.filter((e) => e.status === "cancelled").length;
  const ndrPending = ndrEvents.filter((e) => e.status === "pending").length;
  const ndrRescueRate =
    ndrTotal > 0 ? Number(((ndrRescued / ndrTotal) * 100).toFixed(1)) : 0;
  const avgAttempt =
    ndrEvents.length > 0
      ? Number(
          (
            ndrEvents.reduce((s, e) => s + (e.attempt ?? 1), 0) / ndrEvents.length
          ).toFixed(1)
        )
      : 0;

  // ── COD aggregation ──────────────────────────────────────────────────────────
  const codTotal = codOrders.length;
  const codConfirmed = codOrders.filter((o) => o.codStatus === "confirmed").length;
  const codCancelled = codOrders.filter((o) => o.codStatus === "cancelled").length;
  // COD→Prepaid: confirmed COD orders where Razorpay payment completed
  const codConverted = codOrders.filter(
    (o) =>
      o.codStatus === "confirmed" &&
      o.paymentStatus === "paid" &&
      o.razorpayOrderId
  ).length;
  const codConfirmRate =
    codTotal > 0 ? Number(((codConfirmed / codTotal) * 100).toFixed(1)) : 0;
  const codConversionRate =
    codConfirmed > 0 ? Number(((codConverted / codConfirmed) * 100).toFixed(1)) : 0;
  const rtoLossPaise = codOrders
    .filter((o) => o.codStatus === "cancelled")
    .reduce((s, o) => s + o.total, 0);

  return {
    ndr: {
      total: ndrTotal,
      rescued: ndrRescued,
      pending: ndrPending,
      cancelled: ndrCancelled,
      rescueRate: ndrRescueRate,
      avgAttempt,
    },
    cod: {
      total: codTotal,
      confirmed: codConfirmed,
      cancelled: codCancelled,
      converted: codConverted,
      confirmRate: codConfirmRate,
      conversionRate: codConversionRate,
      rtoLossPaise,
      highRiskFlagged: highRiskCount,
    },
    tokenPrepay: {
      sent: tokenStats.sent,
      paid: tokenStats.paid,
      expired: tokenStats.expired,
      payRate: tokenStats.sent > 0 ? Number(((tokenStats.paid / tokenStats.sent) * 100).toFixed(1)) : 0,
    },
    fulfillmentHold: holdStats,
    successFee: feeStats,
    network: networkStats,
    missingTemplates,
  };
}
