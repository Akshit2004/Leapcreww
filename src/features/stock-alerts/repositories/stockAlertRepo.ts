/**
 * stockAlertRepo.ts — Prisma access for the stock-alert (back-in-stock) feature.
 *
 * This is the ONLY place @/shared/lib/prisma may be imported within the
 * stock-alerts feature. Every query is scoped by organizationId (Article II).
 */
import { prisma } from "@/shared/lib/prisma";

/** Find an existing alert for the same phone + product (inventory item or SKU) within an org. */
export function findExistingAlert(
  organizationId: string,
  phone: string,
  shopifyInventoryItemId?: string,
  sku?: string
) {
  return prisma.stockAlert.findFirst({
    where: {
      organizationId,
      phone,
      ...(shopifyInventoryItemId ? { shopifyInventoryItemId } : sku ? { sku } : {}),
    },
  });
}

/** Re-arm a previously-notified alert with refreshed product details. */
export function reactivateAlert(
  id: string,
  data: { productTitle: string; productUrl: string | null }
) {
  return prisma.stockAlert.update({
    where: { id },
    data: { isNotified: false, notifiedAt: null, productTitle: data.productTitle, productUrl: data.productUrl },
  });
}

/** Look up a contact by phone within an org, for linking a new alert. */
export function findContactByPhone(organizationId: string, phone: string) {
  return prisma.contact.findFirst({
    where: { phone, organizationId },
  });
}

export interface CreateAlertData {
  organizationId: string;
  phone: string;
  contactId: string | null;
  productTitle: string;
  shopifyInventoryItemId: string | null;
  sku: string | null;
  productUrl: string | null;
}

export function createAlert(data: CreateAlertData) {
  return prisma.stockAlert.create({ data });
}

/** All not-yet-notified alerts for an org, optionally scoped to an inventory item or SKU. */
export function findUnnotifiedAlerts(
  organizationId: string,
  shopifyInventoryItemId?: string,
  sku?: string
) {
  return prisma.stockAlert.findMany({
    where: {
      organizationId,
      isNotified: false,
      ...(shopifyInventoryItemId
        ? { shopifyInventoryItemId }
        : sku
        ? { sku }
        : {}),
    },
  });
}

export function markAlertNotified(id: string) {
  return prisma.stockAlert.update({
    where: { id },
    data: { isNotified: true, notifiedAt: new Date() },
  });
}

export function createStockAlertSystemLog(organizationId: string, message: string) {
  return prisma.systemLog.create({
    data: { type: "integration", message, organizationId },
  });
}
