/** types.ts — Integrations feature DTOs. */

export interface ShopifyCredentials {
  shopDomain: string;
  accessToken: string;
}

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

export interface ShiprocketCredentials {
  email: string;
  token: string;
}

export interface ConnectShopifyInput {
  shopDomain: string;
  accessToken: string;
}

export interface ConnectRazorpayInput {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

export interface ConnectShiprocketInput {
  email: string;
  password: string;
}

export interface ConnectResult {
  success: true;
  shopName?: string;
  shopDomain?: string;
  webhooksRegistered?: string[];
  webhookWarning?: string;
  webhookUrl?: string;
}
