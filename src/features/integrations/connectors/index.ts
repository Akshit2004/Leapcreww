/**
 * Connector registry (T-07).
 *
 * Add new connectors here. Priority order from the roadmap:
 *   Zapier/Make → Google Sheets → WooCommerce → HubSpot/Salesforce.
 * Shopify already ships as a first-class integration (see features/integrations).
 */
import type { Connector } from "./types";
import { woocommerceConnector } from "./woocommerce";
import { shiprocketConnector } from "./shiprocket";

export const connectors: Record<string, Connector> = {
  [woocommerceConnector.id]: woocommerceConnector,
  [shiprocketConnector.id]: shiprocketConnector,
  // [zapierConnector.id]: zapierConnector,        // TODO(T-07)
  // [googleSheetsConnector.id]: googleSheetsConnector, // TODO(T-07)
  // [hubspotConnector.id]: hubspotConnector,      // TODO(T-07)
};

export function getConnector(id: string): Connector | undefined {
  return connectors[id];
}
