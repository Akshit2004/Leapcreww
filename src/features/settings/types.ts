/** types.ts — DTOs shared between settings services and routes. */

export interface WabaPortfolio {
  wabaId: string;
  name: string;
  phoneNumbers: {
    id: string;
    display_phone_number: string;
    verified_name?: string;
    quality_rating?: string;
  }[];
}

export interface ConnectResult {
  status: "connected" | "selection_required";
  wabaId?: string;
  wabaName?: string;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  businessId: string | null;
  metaCatalogId: string | null;
  portfolios?: WabaPortfolio[];
}

export interface PortfolioPhoneNumber {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
}

export interface PortfolioResult {
  activeWabaId: string | null;
  activePhoneNumberId: string | null;
  portfolios: { wabaId: string; name: string; phoneNumbers: PortfolioPhoneNumber[] }[];
}

export interface SwitchPortfolioInput {
  wabaId: string;
  phoneNumberId: string;
  metaCatalogId?: string | null;
}

export interface StatusResult {
  connected: boolean;
  businessAccountId: string | null;
  phoneNumberId: string | null;
  businessId: string | null;
}

export interface CatalogSyncResult {
  success: true;
  catalogId: string;
  message: string;
}
