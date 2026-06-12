import { prisma } from "@/shared/lib/prisma";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";

export interface RegisterAlertInput {
  orgId: string;
  phone: string;
  productTitle: string;
  shopifyInventoryItemId?: string;
  sku?: string;
  productUrl?: string;
}

export async function registerStockAlert(input: RegisterAlertInput) {
  const { orgId, phone, productTitle, shopifyInventoryItemId, sku, productUrl } = input;
  const normalized = normalizePhone(phone);

  // Re-register if a previously-notified alert exists for the same phone + product
  const existing = await prisma.stockAlert.findFirst({
    where: {
      organizationId: orgId,
      phone: normalized,
      ...(shopifyInventoryItemId ? { shopifyInventoryItemId } : sku ? { sku } : {}),
    },
  });

  if (existing) {
    if (!existing.isNotified) return existing; // already waiting, no-op
    return prisma.stockAlert.update({
      where: { id: existing.id },
      data: { isNotified: false, notifiedAt: null, productTitle, productUrl: productUrl ?? existing.productUrl },
    });
  }

  const contact = await prisma.contact.findFirst({
    where: { phone: normalized, organizationId: orgId },
  });

  return prisma.stockAlert.create({
    data: {
      organizationId: orgId,
      phone: normalized,
      contactId: contact?.id ?? null,
      productTitle,
      shopifyInventoryItemId: shopifyInventoryItemId ?? null,
      sku: sku ?? null,
      productUrl: productUrl ?? null,
    },
  });
}

export interface NotifyInput {
  orgId: string;
  shopifyInventoryItemId?: string;
  sku?: string;
  productTitle?: string;
  productUrl?: string;
}

export async function notifyStockWatchers(input: NotifyInput): Promise<{ notified: number }> {
  const { orgId, shopifyInventoryItemId, sku, productTitle, productUrl } = input;

  const alerts = await prisma.stockAlert.findMany({
    where: {
      organizationId: orgId,
      isNotified: false,
      ...(shopifyInventoryItemId
        ? { shopifyInventoryItemId }
        : sku
        ? { sku }
        : {}),
    },
  });

  if (alerts.length === 0) return { notified: 0 };

  let notified = 0;
  for (const alert of alerts) {
    const title = productTitle || alert.productTitle;
    const url = productUrl || alert.productUrl;

    const message =
      `🎉 *Back in Stock!*\n\n` +
      `*${title}* is available again!\n\n` +
      (url ? `Shop now before it sells out:\n${url}` : `Visit our store to grab it before it sells out again!`);

    try {
      await sendWhatsAppMessage(
        { to: formatPhoneNumber(alert.phone), text: message },
        orgId
      );

      await prisma.stockAlert.update({
        where: { id: alert.id },
        data: { isNotified: true, notifiedAt: new Date() },
      });

      notified++;
    } catch (err) {
      console.warn(`[StockAlert] Failed to notify ${alert.phone}:`, err);
    }
  }

  if (notified > 0) {
    const title = productTitle || alerts[0]?.productTitle || "product";
    await prisma.systemLog.create({
      data: {
        type: "integration",
        message: `Back-in-stock: notified ${notified} customer(s) about "${title}".`,
        organizationId: orgId,
      },
    });
  }

  return { notified };
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  return `+${digits}`;
}
