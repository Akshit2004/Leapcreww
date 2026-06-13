/** Wallet feature types (topup via platform Razorpay account). */

export interface CreateTopupInput {
  organizationId: string;
  /** Amount in INR (major units) requested by the org admin. */
  amount: number;
}

export interface CreateTopupResult {
  topupId: string;
  razorpayOrderId: string;
  amount: number;
  currency: "INR";
  /** Public Razorpay key id — safe to expose to the client for checkout. */
  keyId: string;
}
