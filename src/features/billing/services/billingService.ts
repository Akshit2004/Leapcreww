/**
 * billingService.ts — Meter WhatsApp usage and debit the wallet (T-06).
 *
 * Call recordUsage() on every billable send (wire into shared/lib/whatsapp.ts
 * success path). Applies partner markup (T-09) when the org belongs to a partner.
 */
import * as repo from "../repositories/billingRepo";
import { priceFor } from "./waPricing";
import type { RecordUsageInput } from "../types";

export async function recordUsage(input: RecordUsageInput) {
  const units = input.units ?? 1;
  const category = input.category ?? "service";
  let costMinor = priceFor(input.country ?? "IN", category, units);

  // Apply partner markup if applicable.
  const wallet = await repo.getWalletBalance(input.organizationId);
  if (wallet?.partnerId) {
    const markup = await repo.getPartnerMarkup(wallet.partnerId);
    costMinor = Math.round(costMinor * (1 + markup));
  }

  const costMajor = costMinor / 100;
  await repo.recordUsageAndDebit(
    {
      type: input.type,
      category,
      units,
      costMinor,
      campaignId: input.campaignId,
      organizationId: input.organizationId,
    },
    costMajor
  );
  return { costMinor };
}

export async function getUsageLedger(organizationId: string) {
  const [events, totals, wallet] = await Promise.all([
    repo.listUsage(organizationId),
    repo.sumUsageCost(organizationId),
    repo.getWalletBalance(organizationId),
  ]);
  return {
    events,
    totalSpentMinor: totals._sum.costMinor ?? 0,
    walletBalance: wallet?.walletBalance ?? 0,
  };
}

/** True when the org can afford a send of the given category (pre-send guard). */
export async function canAfford(organizationId: string, category: RecordUsageInput["category"], country = "IN") {
  const wallet = await repo.getWalletBalance(organizationId);
  const cost = priceFor(country, category ?? "service") / 100;
  return (wallet?.walletBalance ?? 0) >= cost;
}
