import { route, ok, requireOrg, body } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);

  const [org, integrations] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        whatsappConnected: true,
        fulfillmentHoldEnabled: true,
        cartRecoveryDiscountCode: true,
      },
    }),
    prisma.integration.findMany({
      where: { organizationId: orgId },
      select: { id: true, status: true },
    }),
  ]);

  const shopify = integrations.find((i) => i.id === "shopify");
  const razorpay = integrations.find((i) => i.id === "razorpay");

  return ok({
    whatsappConnected: org?.whatsappConnected ?? false,
    fulfillmentHoldEnabled: org?.fulfillmentHoldEnabled ?? false,
    cartRecoveryDiscountCode: org?.cartRecoveryDiscountCode ?? "",
    shopifyConnected: shopify?.status === "connected",
    razorpayConnected: razorpay?.status === "connected",
  });
});

export const PATCH = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);

  const payload = await body<{
    fulfillmentHoldEnabled?: boolean;
    cartRecoveryDiscountCode?: string;
  }>(req);

  const data: Record<string, unknown> = {};
  if (payload.fulfillmentHoldEnabled !== undefined) data.fulfillmentHoldEnabled = payload.fulfillmentHoldEnabled;
  if (payload.cartRecoveryDiscountCode !== undefined) data.cartRecoveryDiscountCode = payload.cartRecoveryDiscountCode;

  const org = await prisma.organization.update({ where: { id: orgId }, data });

  return ok({
    fulfillmentHoldEnabled: org.fulfillmentHoldEnabled,
    cartRecoveryDiscountCode: org.cartRecoveryDiscountCode,
  });
});
