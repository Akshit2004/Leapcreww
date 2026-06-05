import { prisma } from "./prisma";
import * as crypto from "crypto";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WhatsAppMessage {
  to: string;
  text?: string;
  template?: { name: string; language: { code: string }; components?: Record<string, unknown>[] };
  image?: { link?: string; id?: string };
  video?: { link?: string; id?: string };
  document?: { link?: string; id?: string; filename?: string };
  buttons?: { type: "reply"; reply: { id: string; title: string } }[];
  list?: {
    buttonText: string;
    title: string;
    description: string;
    sections: {
      title: string;
      rows: { id: string; title: string; description?: string }[];
    }[];
  };
  catalogList?: {
    headerText: string;
    bodyText: string;
    catalogId: string;
    sections: {
      title: string;
      productItems: { product_retailer_id: string }[];
    }[];
  };
  product?: {
    bodyText: string;
    catalogId: string;
    productRetailerId: string;
  };
}

export interface WhatsAppWebhookPayload {
  object: "whatsapp_business_account";
  entry: {
    id: string;
    changes: {
      value: {
        messaging_product: "whatsapp";
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: { profile: { name: string }; wa_id: string }[];
        messages?: {
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          type: string;
          image?: { id: string; mime_type: string };
          button?: { payload: string; text: string };
          interactive?: {
            button_reply?: { id: string; title: string };
            list_reply?: { id: string; title: string; description?: string };
          };
          referral?: {
            source_url: string;
            source_id: string;
            headline: string;
            body: string;
          };
          order?: {
            catalog_id: string;
            text?: string;
            product_items: {
              product_retailer_id: string;
              quantity: string;
              item_price: string;
              currency: string;
            }[];
          };
        }[];
        statuses?: {
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
          conversation?: { id: string };
          errors?: { code: number; title: string; message?: string; error_data?: any }[];
        }[];
      };
      field: "messages";
    }[];
  }[];
}

export interface WhatsAppResponseData {
  messages?: Array<{ id: string }>;
}

// ─── Config ─────────────────────────────────────────────────────────────────

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

/**
 * Get WhatsApp configuration for an organization.
 * Uses the platform-level System User Token (from env) combined with
 * the tenant's WABA ID and Phone Number ID (from database).
 */
export async function getWhatsAppConfig(orgId: string): Promise<{
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
  apiVersion: string;
  verifyToken: string;
  appSecret: string;
} | null> {
  const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  if (!systemToken) {
    console.warn("[WhatsApp] WHATSAPP_SYSTEM_USER_TOKEN not configured");
    return null;
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      whatsappBusinessAccountId: true,
      whatsappPhoneNumberId: true,
      whatsappConnected: true,
    },
  });

  if (!org || !org.whatsappConnected || !org.whatsappBusinessAccountId || !org.whatsappPhoneNumberId) {
    return null;
  }

  return {
    phoneNumberId: org.whatsappPhoneNumberId,
    accessToken: systemToken,
    businessAccountId: org.whatsappBusinessAccountId,
    apiVersion: WHATSAPP_API_VERSION,
    verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "",
    appSecret: process.env.WHATSAPP_APP_SECRET || "",
  };
}

// ─── Send Message ───────────────────────────────────────────────────────────

/**
 * Send a WhatsApp message using the platform System User Token.
 * Routes to the correct phone number via the org's stored phoneNumberId.
 */
export async function sendWhatsAppMessage(
  message: WhatsAppMessage,
  orgId: string
): Promise<{ ok: boolean; data?: WhatsAppResponseData; error?: string }> {
  const config = await getWhatsAppConfig(orgId);

  if (!config) {
    return {
      ok: false,
      error: "WhatsApp not configured for this organization. Complete Embedded Signup first.",
    };
  }

  const { phoneNumberId, accessToken, apiVersion } = config;
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  // Build the request body based on message type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = {
    messaging_product: "whatsapp",
    to: message.to,
  };

  if (message.template) {
    // Template message
    body.type = "template";
    body.template = message.template;
  } else if (message.image) {
    // Image message
    body.type = "image";
    body.image = message.image;
  } else if (message.video) {
    // Video message
    body.type = "video";
    body.video = message.video;
  } else if (message.document) {
    // Document message
    body.type = "document";
    body.document = message.document;
  } else if (message.buttons && message.buttons.length > 0) {
    // Interactive button message
    body.type = "interactive";
    body.interactive = {
      type: "button",
      body: { text: message.text || "" },
      action: {
        buttons: message.buttons.map((btn) => ({
          type: btn.type,
          reply: btn.reply,
        })),
      },
    };
  } else if (message.list) {
    // Interactive list message
    body.type = "interactive";
    body.interactive = {
      type: "list",
      header: { type: "text", text: message.list.title },
      body: { text: message.list.description },
      action: {
        button: message.list.buttonText,
        sections: message.list.sections,
      },
    };
  } else if (message.catalogList) {
    // Native WhatsApp Product List
    body.type = "interactive";
    body.interactive = {
      type: "product_list",
      header: { type: "text", text: message.catalogList.headerText },
      body: { text: message.catalogList.bodyText },
      action: {
        catalog_id: message.catalogList.catalogId,
        sections: message.catalogList.sections.map((sec) => ({
          title: sec.title,
          product_items: sec.productItems,
        })),
      },
    };
  } else if (message.product) {
    // Native WhatsApp Single Product
    body.type = "interactive";
    body.interactive = {
      type: "product",
      body: { text: message.product.bodyText },
      action: {
        catalog_id: message.product.catalogId,
        product_retailer_id: message.product.productRetailerId,
      },
    };
  } else {
    // Plain text message
    body.type = "text";
    body.text = { body: message.text || "" };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || `HTTP ${response.status}`;
      console.error(`[WhatsApp API Error] ${errorMsg}`, data.error);
      return { ok: false, error: errorMsg };
    }

    return { ok: true, data };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[WhatsApp API Exception]", errorMsg);
    return { ok: false, error: errorMsg };
  }
}

// ─── Webhook Verification ───────────────────────────────────────────────────

export function verifyWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null
): { verified: boolean; challenge?: string } {
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!expectedToken) {
    console.error("WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured");
    return { verified: false };
  }

  if (mode === "subscribe" && token === expectedToken && challenge) {
    return { verified: true, challenge };
  }
  return { verified: false };
}

export function validateWebhookSignature(signature: string | null, body: string): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(body)
    .digest("hex");

  const received = signature.replace("sha256=", "");
  if (received.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export function formatPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}
