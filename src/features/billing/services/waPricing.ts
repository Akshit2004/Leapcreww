/**
 * waPricing.ts — WhatsApp conversation pricing table (T-06).
 *
 * Costs are in minor currency units (paise). These are illustrative defaults;
 * keep them in sync with Meta's published per-category rates per country.
 * Partner markup (T-09) is applied on top in billingService.
 */
import type { MessageCategory } from "../types";

type CategoryRates = Record<MessageCategory, number>;

// minor units (paise) per message, by country → category.
const PRICING: Record<string, CategoryRates> = {
  IN: { marketing: 88, utility: 16, authentication: 13, service: 0 },
  US: { marketing: 2500, utility: 800, authentication: 700, service: 0 },
  DEFAULT: { marketing: 100, utility: 30, authentication: 25, service: 0 },
};

export function priceFor(country: string, category: MessageCategory, units = 1): number {
  const table = PRICING[country?.toUpperCase()] ?? PRICING.DEFAULT;
  return table[category] * units;
}
