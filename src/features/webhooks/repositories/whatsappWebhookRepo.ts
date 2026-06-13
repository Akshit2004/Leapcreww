/** whatsappWebhookRepo.ts — Prisma access for the inbound WhatsApp webhook (status updates, message processing, system auth). */
import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

// ─── Multi-tenant org lookup ───────────────────────────────────────────────

/** Strict phone_number_id + WABA cross-validation lookup. */
export function findOrgByPhoneAndWaba(phoneNumberId: string, wabaId: string) {
  return prisma.organization.findFirst({
    where: {
      whatsappPhoneNumberId: phoneNumberId,
      whatsappBusinessAccountId: wabaId, // Defense-in-depth: cross-validate WABA
      whatsappConnected: true,
    },
  });
}

/** Fallback: phone_number_id only (for cases where WABA ID may differ). */
export function findOrgByPhone(phoneNumberId: string) {
  return prisma.organization.findFirst({
    where: {
      whatsappPhoneNumberId: phoneNumberId,
      whatsappConnected: true,
    },
  });
}

export function findOrgByWaba(wabaId: string) {
  return prisma.organization.findFirst({
    where: { whatsappBusinessAccountId: wabaId },
    select: { id: true },
  });
}

export function findOrgActiveUseCase(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: { activeUseCase: true },
  });
}

// ─── Message status updates ────────────────────────────────────────────────

export function updateMessageStatusByWaId(waMessageId: string, status: string) {
  return prisma.message.updateMany({
    where: { waMessageId },
    data: { status },
  });
}

export function findMessageByWaIdForStatus(waMessageId: string) {
  return prisma.message.findFirst({
    where: { waMessageId },
    select: { organizationId: true, campaignId: true, contact: { select: { phone: true } } },
  });
}

export function findMessageByWaIdForFailureLog(waMessageId: string) {
  return prisma.message.findFirst({
    where: { waMessageId },
    select: {
      organizationId: true,
      campaignId: true,
      contact: { select: { name: true, phone: true } },
    },
  });
}

export function findMessageByWaIdForCampaign(waMessageId: string) {
  return prisma.message.findFirst({
    where: { waMessageId },
    select: { campaignId: true },
  });
}

export function createSystemLog(data: { type: string; message: string; organizationId: string; campaignId?: string | null }) {
  return prisma.systemLog.create({ data });
}

export function incrementCampaignMetric(campaignId: string, field: "delivered" | "read") {
  return prisma.campaign.update({
    where: { id: campaignId },
    data: { [field]: { increment: 1 } },
  });
}

// ─── Template status updates ───────────────────────────────────────────────

export function updateTemplateMetaStatus(organizationId: string, templateName: string, metaStatus: string) {
  return prisma.template.updateMany({
    where: { name: templateName, organizationId },
    data: { metaStatus },
  });
}

// ─── Inbound message processing: dedup, contact, message ──────────────────

export function findMessageByWaIdAndOrg(waMessageId: string, organizationId: string) {
  return prisma.message.findFirst({
    where: { waMessageId, organizationId },
    select: { id: true },
  });
}

/** Strict phone number lookup — exact match only, no suffix matching. */
export function findContactByPhone(phone: string, organizationId: string) {
  return prisma.contact.findFirst({
    where: { phone, organizationId },
  });
}

export function updateContact(contactId: string, data: Prisma.ContactUpdateInput) {
  return prisma.contact.update({ where: { id: contactId }, data });
}

export function createContact(data: Prisma.ContactUncheckedCreateInput) {
  return prisma.contact.create({ data });
}

export function createMessage(data: Prisma.MessageUncheckedCreateInput) {
  return prisma.message.create({ data });
}

// ─── Native WhatsApp order processing ──────────────────────────────────────

export function findProductByRetailerId(organizationId: string, productRetailerId: string) {
  return prisma.product.findFirst({
    where: {
      organizationId,
      OR: [{ sku: productRetailerId }, { id: productRetailerId }],
    },
  });
}

export function createOrder(data: Prisma.OrderUncheckedCreateInput) {
  return prisma.order.create({ data });
}

// ─── System auth webhook (WhatsApp login-code verification) ───────────────

export function findLoginAttemptByCode(code: string) {
  return prisma.whatsAppLoginAttempt.findUnique({ where: { code } });
}

export function updateLoginAttempt(id: string, data: Prisma.WhatsAppLoginAttemptUncheckedUpdateInput) {
  return prisma.whatsAppLoginAttempt.update({ where: { id }, data });
}

export function findUserByPhone(phone: string) {
  return prisma.user.findUnique({ where: { phone } });
}
