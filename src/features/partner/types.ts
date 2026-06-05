/** Partner feature types (T-09 — white-label / agency). */

export interface PartnerInput {
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  customDomain?: string;
  pricingMarkup?: number; // multiplier added over base conversation cost
}

export interface PartnerBranding {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
}
