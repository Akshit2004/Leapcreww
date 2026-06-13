/**
 * partnerService.ts — White-label / agency reseller logic (T-09).
 *
 * Branding is resolved by custom domain or slug and applied to the UI shell.
 * Pricing markup is consumed by billingService (T-06).
 */
import * as repo from "../repositories/partnerRepo";
import type { PartnerBranding, PartnerInput } from "../types";

export function createPartner(input: PartnerInput) {
  return repo.createPartner({
    name: input.name,
    slug: input.slug,
    logoUrl: input.logoUrl,
    primaryColor: input.primaryColor,
    customDomain: input.customDomain,
    pricingMarkup: input.pricingMarkup ?? 0,
  });
}

export function listClientOrgs(partnerId: string) {
  return repo.listClientOrgs(partnerId);
}

/** Resolve branding for a request host (custom domain) or slug; null = default LeapCreww brand. */
export async function resolveBranding(opts: { host?: string; slug?: string }): Promise<PartnerBranding | null> {
  const partner = opts.host
    ? await repo.findByDomain(opts.host)
    : opts.slug
      ? await repo.findBySlug(opts.slug)
      : null;
  if (!partner) return null;
  return { name: partner.name, logoUrl: partner.logoUrl, primaryColor: partner.primaryColor };
}
