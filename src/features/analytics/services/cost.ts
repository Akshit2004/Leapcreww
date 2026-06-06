/**
 * cost.ts — Centralized send-cost estimate for the conversion-first ledgers (D-04).
 *
 * Replaces the hardcoded ₹0.72/msg magic number that was scattered across the
 * ROI ledger and analytics narrator. Cost is "simulated" (derived from the
 * published per-category pricing table) rather than metered from real
 * UsageEvent rows — see plan "Out of Scope". Returned value is in minor units
 * (paise) so it lines up with Order.total / UsageEvent.costMinor.
 */
import { priceFor } from "@/features/billing/services/waPricing";
import type { MessageCategory } from "@/features/billing/types";

export function estimateSendCostMinor(
  category: MessageCategory = "marketing",
  units = 1,
  country = "IN"
): number {
  return priceFor(country, category, Math.max(0, units));
}
