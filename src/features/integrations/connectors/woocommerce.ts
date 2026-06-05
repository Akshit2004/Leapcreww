/**
 * WooCommerce connector (T-07) — scaffold.
 *
 * Mirrors the existing Shopify flow: REST API key auth + order / abandoned-cart
 * webhooks that create contacts and trigger sequences (cart_abandoned).
 */
import type { Connector, ConnectorContext, InboundLead } from "./types";

export const woocommerceConnector: Connector = {
  id: "woocommerce",
  name: "WooCommerce",
  description: "Sync WooCommerce orders & abandoned carts into WappFlow.",

  async connect(ctx: ConnectorContext) {
    if (!ctx.apiKey) return { ok: false, error: "WooCommerce consumer key/secret required" };
    // TODO(T-07): validate against GET /wp-json/wc/v3/system_status.
    return { ok: true };
  },

  parseWebhook(payload: unknown): InboundLead[] {
    // TODO(T-07): map WooCommerce order/customer payloads to leads.
    const order = payload as { billing?: { phone?: string; email?: string; first_name?: string } };
    const phone = order?.billing?.phone;
    if (!phone) return [];
    return [
      {
        phone,
        email: order.billing?.email,
        name: order.billing?.first_name,
        source: "WooCommerce",
        tags: ["woocommerce"],
      },
    ];
  },
};
