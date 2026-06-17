/**
 * sizeShadeRepo.ts — Prisma access for the size/shade finder feature.
 *
 * This is the ONLY place @/shared/lib/prisma may be imported within the
 * size-shade-finder feature.
 */
import { prisma } from "@/shared/lib/prisma";

/** Fetch a contact's stored attributes JSON (empty object if none). */
export async function getContactAttributes(contactId: string): Promise<Record<string, any>> {
  const c = await prisma.contact.findUnique({ where: { id: contactId }, select: { attributes: true } });
  return (c?.attributes as Record<string, any>) ?? {};
}

/** Overwrite a contact's attributes JSON. */
export function updateContactAttributes(contactId: string, attributes: Record<string, any>) {
  return prisma.contact.update({
    where: { id: contactId },
    data: { attributes },
  });
}

export interface BrandVoice {
  brandName: string;
  /** Free-form tone descriptor distilled from brandProfile / aiPersona. */
  tone: string;
  vertical: string;
}

/**
 * Distil the org's brand identity into a compact voice descriptor that the
 * finders feed to Groq, so recommendations sound like the brand's own
 * stylist/beauty-advisor rather than a generic bot.
 */
export async function getOrgBrandVoice(organizationId: string): Promise<BrandVoice> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, businessVertical: true, brandProfile: true, aiPersona: true },
  });

  const profile = (org?.brandProfile as Record<string, any> | null) ?? {};
  const toneParts = [
    profile.toneOfVoice,
    profile.tone,
    org?.aiPersona,
    profile.industry,
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);

  return {
    brandName: (profile.name as string) || org?.name || "our store",
    tone: toneParts.join(" · ") || "warm, friendly and genuinely helpful — like a favourite store associate",
    vertical: org?.businessVertical || "GENERAL",
  };
}

/** First dialable WhatsApp number for the org (for wa.me deep links). */
export async function getOrgDialableNumber(organizationId: string): Promise<string | null> {
  const pn = await prisma.phoneNumber.findFirst({
    where: { organizationId },
    select: { phoneNumber: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (pn?.phoneNumber) return pn.phoneNumber.replace(/\D/g, "");
  const widget = await prisma.widgetConfig.findUnique({
    where: { organizationId },
    select: { phoneNumber: true },
  });
  return widget?.phoneNumber ? widget.phoneNumber.replace(/\D/g, "") : null;
}
