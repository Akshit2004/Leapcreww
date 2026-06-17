-- Merchant-configured Shopify discount code for the T3 cart-recovery incentive.
-- Nullable: when unset, the recovery pipeline sends a no-incentive template
-- instead of minting a fake code Shopify would reject.
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "cartRecoveryDiscountCode" TEXT;
