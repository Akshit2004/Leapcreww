/**
 * codRiskScorer.ts — Heuristic risk scoring for COD orders.
 *
 * Runs synchronously (no external API calls) at order creation. A score >= 7
 * triggers the `cod_risk_verify` template so a suspicious order is verified
 * before the merchant packs and ships it.
 *
 * Scoring factors (max 10):
 *   +4  First-time buyer (no prior confirmed orders with this org)
 *   +3  Large COD order (> ₹1500) — most fake orders are high-value
 *   +2  Very large order (> ₹3000, cumulative with the above)
 *   +3  Many distinct SKUs (>= 5 line items) — bulk fake orders spread across SKUs
 *   +2  High per-SKU quantity (any single line item quantity >= 10)
 *   +1  Incomplete/suspicious name (numbers, very short, placeholder text)
 *   +3  Prior RTO/cancel with THIS brand (own history)
 *   +4  Flagged by 2+ OTHER stores in the shared network / +2 by one
 *
 * Threshold: score >= 7 = HIGH RISK → trigger verification.
 */

export interface CodRiskItem {
  /** Display name or SKU label for the line item. */
  name: string;
  /** Units ordered for this line item. */
  quantity: number;
}

export interface CodRiskResult {
  score: number;
  highRisk: boolean;
  reasons: string[];
}

const HIGH_RISK_THRESHOLD = 7;
const SUSPICIOUS_NAME_RE = /^\d+$|^[a-z]{1,2}$/i;
const PLACEHOLDER_NAMES = new Set(["test", "customer", "user", "abc", "xyz", "na", "n/a"]);

// Thresholds for size-bracketing and bulk-SKU rules.
const BULK_SKU_COUNT_THRESHOLD = 5;    // distinct line items
const BULK_SKU_QTY_THRESHOLD = 10;     // units of a single SKU

export function scoreCodOrder(params: {
  orderCount: number;    // prior confirmed orders for this contact in this org
  totalPaise: number;    // order total in paise
  customerName: string;
  /** Optional line-item breakdown for size-bracketing and bulk-SKU detection. */
  items?: CodRiskItem[];
  /** Prior RTO/cancel signals THIS brand reported for the phone (own history). */
  ownRtoCount?: number;
  /** Prior signals OTHER brands reported for the phone (shared network moat). */
  networkRtoCount?: number;
}): CodRiskResult {
  const {
    orderCount,
    totalPaise,
    customerName,
    items = [],
    ownRtoCount = 0,
    networkRtoCount = 0,
  } = params;
  const totalRupees = totalPaise / 100;
  let score = 0;
  const reasons: string[] = [];

  if (orderCount === 0) {
    score += 4;
    reasons.push("first-time buyer");
  }

  if (totalRupees > 3000) {
    score += 5; // +3 for >1500 + +2 for >3000
    reasons.push(`large order ₹${totalRupees.toFixed(0)}`);
  } else if (totalRupees > 1500) {
    score += 3;
    reasons.push(`medium-large order ₹${totalRupees.toFixed(0)}`);
  }

  // Size-bracketing: many distinct SKUs on a single COD order is a strong fake-order signal.
  if (items.length >= BULK_SKU_COUNT_THRESHOLD) {
    score += 3;
    reasons.push(`${items.length} distinct SKUs`);
  }

  // Bulk-SKU: a single line item with an abnormally high quantity.
  const maxQty = items.reduce((max, item) => Math.max(max, item.quantity), 0);
  if (maxQty >= BULK_SKU_QTY_THRESHOLD) {
    score += 2;
    reasons.push(`bulk quantity (${maxQty} units of one SKU)`);
  }

  const nameLower = customerName.trim().toLowerCase();
  if (SUSPICIOUS_NAME_RE.test(nameLower) || PLACEHOLDER_NAMES.has(nameLower)) {
    score += 1;
    reasons.push("suspicious customer name");
  }

  // Own history: this customer already RTO'd / cancelled COD with this brand.
  if (ownRtoCount >= 1) {
    score += 3;
    reasons.push(`prior RTO with this brand (${ownRtoCount})`);
  }

  // Shared network: flagged by other stores. The cross-merchant moat — a
  // serial offender carries their reputation into every store on the network.
  if (networkRtoCount >= 2) {
    score += 4;
    reasons.push(`flagged by ${networkRtoCount} other stores`);
  } else if (networkRtoCount === 1) {
    score += 2;
    reasons.push("flagged by another store");
  }

  return {
    score: Math.min(score, 10),
    highRisk: score >= HIGH_RISK_THRESHOLD,
    reasons,
  };
}
