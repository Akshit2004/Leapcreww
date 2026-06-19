/**
 * cartDiscountService.ts
 *
 * Resolves a *real* discount code for T3 (last-resort incentive) cart recovery
 * sends. We never invent a code on the fly: a code that doesn't exist in Shopify
 * applies no discount, which makes the "here's a little something" message a lie.
 *
 * Priority:
 *   1. Already assigned to this contact (idempotent — same code on retry)
 *   2. Org-configured code the merchant pre-created in Shopify
 *      (organization.attributes.cart_recovery_discount_code)
 *
 * If neither exists, we return code: null and the caller falls back to a
 * no-incentive template instead of promising a discount we can't honour.
 *
 * The resolved code is stamped on contact.attributes.cart_discount_code so the
 * merchant can look it up in the CRM and the pipeline stays idempotent.
 */

import type { Contact } from "@prisma/client";

export interface CartDiscountResolution {
  /** Checkout URL with `?discount=CODE` appended only when a real code exists. */
  url: string;
  /** The resolved code, or null when no merchant-backed code is configured. */
  code: string | null;
}

/**
 * Resolve the merchant-backed discount for a contact's recovery checkout.
 * Returns the (possibly discount-appended) URL and the code, or code: null
 * when no real code is available.
 */
export async function resolveCartDiscount(
  contact: Contact,
  orgId: string,
  checkoutUrl: string,
): Promise<CartDiscountResolution> {
  const { prisma } = await import("@/shared/lib/prisma");
  const attrs = (contact.attributes as Record<string, unknown>) || {};

  // 1. Already assigned — reuse the same code (idempotent)
  if (typeof attrs.cart_discount_code === "string" && attrs.cart_discount_code.trim()) {
    const code = attrs.cart_discount_code.trim();
    return { url: appendDiscount(checkoutUrl, code), code };
  }

  // 2. Org-level code the merchant pre-created in Shopify
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { cartRecoveryDiscountCode: true },
  });
  const orgCode = org?.cartRecoveryDiscountCode;
  if (typeof orgCode === "string" && orgCode.trim()) {
    const code = orgCode.trim();
    await stampCode(prisma, contact.id, attrs, code);
    return { url: appendDiscount(checkoutUrl, code), code };
  }

  // 3. No merchant-backed code → no incentive. We do NOT mint a code Shopify
  //    would reject. The caller sends a non-incentive template instead.
  return { url: checkoutUrl, code: null };
}

function appendDiscount(url: string, code: string): string {
  if (!url) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}discount=${encodeURIComponent(code)}`;
}

async function stampCode(
  prisma: import("@prisma/client").PrismaClient,
  contactId: string,
  attrs: Record<string, unknown>,
  code: string,
) {
  await prisma.contact.update({
    where: { id: contactId },
    data: { attributes: { ...attrs, cart_discount_code: code } },
  });
}
