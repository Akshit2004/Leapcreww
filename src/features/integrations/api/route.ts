import { ok, route, requireOrg, body } from "@/shared/lib/api";
import * as integrationsService from "../services/integrationsService";

export const GET = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "AGENT");

  const integrations = await integrationsService.listIntegrations(orgId);
  const integration = integrations.find((i: any) => i.id === "shopify") || null;
  return ok({ integrations, integration });
});

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");

  const input = await body<any>(req);
  const { action, integrationId, shopDomain, accessToken, keyId, keySecret, webhookSecret, email, password } = input;
  const resolvedIntegrationId = integrationId || (shopDomain ? "shopify" : "razorpay");

  if (action === "disconnect") {
    await integrationsService.disconnect(orgId, resolvedIntegrationId);
    return ok({ success: true });
  }

  // Resolve origin for webhooks
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  if (resolvedIntegrationId === "shiprocket") {
    const result = await integrationsService.connectShiprocket(orgId, { email, password }, origin);
    return ok(result);
  }

  if (resolvedIntegrationId === "razorpay") {
    const result = await integrationsService.connectRazorpay(orgId, { keyId, keySecret, webhookSecret });
    return ok(result);
  }

  if (resolvedIntegrationId === "shopify") {
    const result = await integrationsService.connectShopify(orgId, { shopDomain, accessToken }, origin);
    return ok(result);
  }

  throw new Error("Invalid integration type");
});
