import { prisma } from "@/shared/lib/prisma";

export function findRazorpayIntegration(organizationId: string) {
  return prisma.integration.findUnique({
    where: { id_organizationId: { id: "razorpay", organizationId } },
  });
}

export function setMarketplaceBotEnabled(organizationId: string, enabled: boolean) {
  return prisma.organization.update({
    where: { id: organizationId },
    data: { marketplaceBotEnabled: enabled },
    select: { id: true, marketplaceBotEnabled: true },
  });
}
