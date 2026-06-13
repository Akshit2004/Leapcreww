/** whatsappInboundService.ts — business logic for the inbound WhatsApp webhook:
 * status-update tracking, multi-tenant routing, template status sync, inbound
 * message processing (contacts, native orders, bot routing), and the
 * system-level WhatsApp login-code verification flow. */
import type { Prisma } from "@prisma/client";
import type { WhatsAppWebhookPayload } from "@/shared/lib/whatsapp";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import { createRazorpayPaymentLink } from "@/shared/lib/razorpay";
import { handleAutoResponder } from "@/shared/lib/autoresponder";
import { handleMarketplaceMessage } from "@/shared/lib/marketplace";
import { handleAppointmentMessage } from "@/shared/lib/appointment";
import { resolveAttribution } from "@/features/analytics/services/attribution";
import { enrollOnTrigger } from "@/features/sequences/services/sequenceService";
import { emitEvent } from "./webhookDeliveryService";
import { handleNfmReply } from "./webhookService";
import {
  resumeCampaignsAwaitingTemplate,
  failCampaignsAwaitingTemplate,
} from "@/features/campaigns/services/strategistActivation";
import { handleCodReply } from "@/features/cod/services/codService";
import { handleNdrReply } from "@/features/ndr/services/ndrService";
import { handleSizeFinderReply, handleShadeFinderReply } from "@/features/size-shade-finder/services/sizeShadeService";
import { handleReplenishmentReply } from "@/features/replenishment/services/replenishmentService";
import * as repo from "../repositories/whatsappWebhookRepo";

type WhatsAppStatus = NonNullable<WhatsAppWebhookPayload["entry"][number]["changes"][number]["value"]["statuses"]>[number];
type WhatsAppMessage = NonNullable<WhatsAppWebhookPayload["entry"][number]["changes"][number]["value"]["messages"]>[number];

// ─── Status updates (delivery/read/failed tracking) ────────────────────────

/** Process a single message status event from the `statuses` array. Best-effort: never throws. */
export async function processStatusUpdate(status: WhatsAppStatus) {
  console.log(`Message ${status.id} status: ${status.status}`);

  if (!status.id || !status.status) return;

  try {
    await repo.updateMessageStatusByWaId(status.id, status.status);

    // Outbound webhook: notify subscribers of the status change.
    const statusMsg = await repo.findMessageByWaIdForStatus(status.id);
    if (statusMsg) {
      await emitEvent(statusMsg.organizationId, "message.status", {
        waMessageId: status.id,
        status: status.status,
        to: statusMsg.contact?.phone ?? null,
        campaignId: statusMsg.campaignId ?? null,
      });
    }

    // If message failed to deliver, log the details
    if (status.status === "failed") {
      const errorDetail = status.errors?.[0];
      const code = errorDetail?.code || "unknown";
      const reason = errorDetail?.message || errorDetail?.title || "No error details provided by Meta";
      console.error(`[Webhook Status] Message ${status.id} delivery failed: Code ${code} - ${reason}`);

      // Find message to associate with campaign and organization
      const msg = await repo.findMessageByWaIdForFailureLog(status.id);

      if (msg) {
        await repo.createSystemLog({
          type: "campaign",
          message: `Delivery failed to ${msg.contact.name} (${msg.contact.phone}): ${reason} (Code ${code})`,
          organizationId: msg.organizationId,
          campaignId: msg.campaignId,
        });
      }
    }

    // Update campaign metrics for delivery tracking
    if (status.status === "delivered" || status.status === "read") {
      const msg = await repo.findMessageByWaIdForCampaign(status.id);
      if (msg?.campaignId) {
        const field = status.status === "delivered" ? "delivered" : "read";
        await repo.incrementCampaignMetric(msg.campaignId, field).catch(() => {}); // Ignore if already counted
      }
    }
  } catch {
    // Status update is best-effort, don't fail the webhook
  }
}

// ─── Multi-tenant routing ───────────────────────────────────────────────────

export type RoutingResult =
  | { matched: true; orgId: string }
  | { matched: false };

/**
 * Resolve the organization for an inbound message via strict
 * phone_number_id + WABA validation, with a phone_number_id-only fallback.
 */
export async function resolveOrgForInboundMessage(phoneNumberId: string, entryWabaId: string): Promise<RoutingResult> {
  // ─── Multi-Tenant Routing: Strict phone_number_id + WABA validation ───
  const org = await repo.findOrgByPhoneAndWaba(phoneNumberId, entryWabaId);

  if (org) {
    return { matched: true, orgId: org.id };
  }

  // Fallback: try phone_number_id only (for cases where WABA ID may differ)
  const orgFallback = await repo.findOrgByPhone(phoneNumberId);

  if (!orgFallback) {
    console.warn(`WhatsApp webhook: no org found for phone_number_id ${phoneNumberId} / WABA ${entryWabaId}`);
    return { matched: false };
  }

  // Log the WABA mismatch for investigation but proceed
  if (orgFallback.whatsappBusinessAccountId !== entryWabaId) {
    console.warn(
      `WhatsApp webhook: WABA mismatch for org ${orgFallback.id}. ` +
      `Expected: ${orgFallback.whatsappBusinessAccountId}, Got: ${entryWabaId}. ` +
      `Proceeding with phone_number_id match.`
    );
  }

  return { matched: true, orgId: orgFallback.id };
}

// ─── Message template status updates ───────────────────────────────────────

/**
 * Handle a message_template_status_update webhook: sync the template's local
 * metaStatus and drive any AI-strategist campaign parked on it forward
 * (launch on approval, cancel on rejection).
 */
export async function handleTemplateStatusUpdate(
  wabaId: string,
  value: { event?: string; message_template_name?: string; reason?: string | null }
) {
  const event = (value.event || "").toUpperCase();
  const templateName = value.message_template_name;
  if (!templateName) return;

  // Map Meta's verdict to a verdict we act on. FLAGGED / PAUSED / PENDING_DELETION
  // don't change launchability, so we ignore them here.
  const newStatus =
    event === "APPROVED"
      ? "approved"
      : event === "REJECTED" || event === "DISABLED"
      ? "rejected"
      : null;
  if (!newStatus) return;

  const org = await repo.findOrgByWaba(wabaId);
  if (!org) {
    console.warn(`[Template Status Webhook] No org found for WABA ${wabaId}`);
    return;
  }

  await repo.updateTemplateMetaStatus(org.id, templateName, newStatus);

  await repo.createSystemLog({
    type: "crm",
    message: `Template "${templateName}" is now ${newStatus.toUpperCase()}${value.reason ? ` — ${value.reason}` : ""}.`,
    organizationId: org.id,
  });

  if (newStatus === "approved") {
    await resumeCampaignsAwaitingTemplate(org.id, templateName);
  } else {
    await failCampaignsAwaitingTemplate(org.id, templateName, value.reason);
  }
}

// ─── Inbound message processing ─────────────────────────────────────────────

export async function processInboundMessage(
  orgId: string,
  waFrom: string,
  text: string,
  profileName: string,
  waMessageId?: string,
  orderData?: WhatsAppMessage["order"],
  referralData?: WhatsAppMessage["referral"],
  interactiveData?: WhatsAppMessage["interactive"]
) {
  // Dedup: Meta retries the same webhook on timeout. Skip if already processed.
  if (waMessageId) {
    const dup = await repo.findMessageByWaIdAndOrg(waMessageId, orgId);
    if (dup) return;
  }

  // Widget attribution: detect [ref:wfw_<key>] appended by widget.js and strip it.
  const widgetRefMatch = text.match(/\[ref:(wfw_[a-f0-9]+)\]/);
  const widgetKey = widgetRefMatch ? widgetRefMatch[1] : null;
  const cleanText = widgetKey ? text.replace(/\n?\[ref:[^\]]+\]/, "").trim() : text;

  const normalizedPhone = `+${waFrom.replace(/[^0-9]/g, "")}`;

  // Strict phone number lookup — exact match only, no suffix matching
  let contact = await repo.findContactByPhone(normalizedPhone, orgId);

  const d = new Date();
  const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  const isNewContact = !contact;

  if (contact) {
    const updateData: Prisma.ContactUpdateInput = {
      lastMessage: cleanText,
      lastMessageTime: timeStr,
      unreadCount: { increment: 1 },
      lastActiveAt: new Date(),
    };
    if (referralData?.source_id) {
      updateData.sourceAdId = referralData.source_id;
    }

    contact = await repo.updateContact(contact.id, updateData);
  } else {
    const baseTags = ["WhatsApp", "Inbound"];
    if (widgetKey) baseTags.push("widget");

    const baseAttrs: Prisma.JsonObject = {};
    if (widgetKey) {
      baseAttrs.source = "widget";
      baseAttrs.widget_key = widgetKey;
    }

    contact = await repo.createContact({
      name: profileName,
      phone: normalizedPhone,
      source: widgetKey ? "Widget" : "WhatsApp Inbound",
      tags: baseTags,
      status: "Active",
      lastMessage: cleanText,
      lastMessageTime: timeStr,
      unreadCount: 1,
      assignedAgent: "Bot",
      organizationId: orgId,
      sourceAdId: referralData?.source_id || null,
      lastActiveAt: new Date(),
      attributes: Object.keys(baseAttrs).length ? baseAttrs : undefined,
    });
  }

  // Sequence triggers (T-03): a first-ever message enrolls into "signup"
  // sequences; an ad referral (click-to-WhatsApp) enrolls into "ad_click"
  // sequences. enrollOnTrigger is idempotent per active enrollment, so a
  // repeat ad click won't double-enroll a contact mid-drip.
  if (isNewContact) {
    await enrollOnTrigger(orgId, "signup", contact.id);
  }
  if (referralData?.source_id) {
    await enrollOnTrigger(orgId, "ad_click", contact.id);
  }

  // Outbound webhook (T-08): notify subscribers of the inbound message.
  await emitEvent(orgId, "message.received", {
    contact: { id: contact.id, name: contact.name, phone: contact.phone, isNew: isNewContact },
    message: { text: cleanText, waMessageId: waMessageId ?? null },
    referral: referralData?.source_id ? { sourceAdId: referralData.source_id } : null,
    widget: widgetKey ? { key: widgetKey } : null,
  });

  await repo.createMessage({
    sender: "user",
    text: cleanText,
    contactId: contact.id,
    organizationId: orgId,
    waMessageId: waMessageId || null,
  });

  await repo.createSystemLog({
    type: "chat",
    message: `WhatsApp from ${contact.name}: "${text.slice(0, 60)}"`,
    organizationId: orgId,
  });

  // Handle Native Flow Reply
  if (interactiveData?.type === "nfm_reply" && interactiveData.nfm_reply) {
    await handleNfmReply(contact.id, orgId, {
      responseJson: interactiveData.nfm_reply.response_json,
    });
  }

  // Handle Native WhatsApp Order
  if (orderData) {
    console.log(`[Marketplace] Native order received from ${contact.phone} with ${orderData.product_items.length} items.`);
    let totalCents = 0;
    const orderItemsToCreate = [];

    for (const item of orderData.product_items) {
      // Find product by SKU or ID
      const product = await repo.findProductByRetailerId(orgId, item.product_retailer_id);
      if (product) {
        const qty = parseInt(item.quantity) || 1;
        totalCents += product.price * qty;
        orderItemsToCreate.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: qty,
        });
      }
    }

    if (orderItemsToCreate.length > 0) {
      const orderIdStr = `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const rzpLink = await createRazorpayPaymentLink(totalCents, orderIdStr, contact.phone, contact.name, orgId);

      const attribution = await resolveAttribution(orgId, contact);

      await repo.createOrder({
        orderId: orderIdStr,
        contactId: contact.id,
        total: totalCents,
        status: "pending",
        paymentStatus: "pending",
        razorpayOrderId: rzpLink.id,
        phone: contact.phone,
        organizationId: orgId,
        address: { address: "pending" },
        ...attribution,
        items: {
          create: orderItemsToCreate,
        },
      });

      // Sequence trigger: enroll into order_placed sequences.
      await enrollOnTrigger(orgId, "order_placed", contact.id);

      // Outbound webhook (T-08): notify subscribers of the new order.
      await emitEvent(orgId, "order.placed", {
        orderId: orderIdStr,
        total: totalCents,
        currency: "INR",
        source: "whatsapp_catalog",
        contact: { id: contact.id, name: contact.name, phone: contact.phone },
        items: orderItemsToCreate.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
      });

      // Tag + persist cart metadata so the abandoned-cart sweep (60-min) and the
      // unified E-Commerce CRM panels can track this WhatsApp marketplace cart.
      // The cart stays "abandoned" until the pending order is paid (cart_recovered).
      const cartItemsSummary = orderItemsToCreate
        .map((i) => `${i.name} (x${i.quantity})`)
        .join(", ");
      const existingAttrs = (contact.attributes as Record<string, unknown>) || {};
      const updatedCartTags = Array.from(new Set([...contact.tags, "WhatsApp-Cart"]));

      const CURRENCY_SYMBOL = "₹";
      const totalFormatted = `${CURRENCY_SYMBOL}${(totalCents / 100).toFixed(2)}`;
      let summaryText = `🧾 *Order Received!*\n\n━━━━━━━━━━━━━━━━━━━\n`;
      orderItemsToCreate.forEach((item) => {
        summaryText += `*${item.name}* x${item.quantity} — ${CURRENCY_SYMBOL}${(item.price * item.quantity / 100).toFixed(2)}\n`;
      });
      summaryText += `━━━━━━━━━━━━━━━━━━━\n*Total: ${totalFormatted}*\n*Order ID:* ${orderIdStr}\n\n💳 *Pay online:*\n${rzpLink.short_url}\n\nOr reply *CONFIRM* after payment to verify your order.`;

      await repo.updateContact(contact.id, {
        tags: updatedCartTags,
        lastMessage: summaryText.length > 35 ? summaryText.substring(0, 32) + "..." : summaryText,
        lastMessageTime: timeStr,
        attributes: {
          ...existingAttrs,
          cart_total: (totalCents / 100).toFixed(2),
          cart_items: cartItemsSummary,
          cart_checkout_url: rzpLink.short_url,
          cart_orderId: orderIdStr,
          cart_recovered: false,
          cart_recovery_enrolled: false,
        },
      });

      const result = await sendWhatsAppMessage({
        to: formatPhoneNumber(contact.phone),
        text: summaryText,
        buttons: [
          { type: "reply", reply: { id: "confirm_order", title: "✅ Paid" } },
          { type: "reply", reply: { id: "menu", title: "🏠 Menu" } },
        ],
      }, orgId);

      await repo.createMessage({
        sender: "agent",
        text: summaryText,
        contactId: contact.id,
        organizationId: orgId,
        waMessageId: result.data?.messages?.[0]?.id || null,
      });
    }
    return;
  }

  // COD confirmation intercept: takes priority over all other routing.
  // Returns true if the message was a YES/NO reply to a pending COD order.
  const codHandled = await handleCodReply(cleanText, contact, orgId);
  if (codHandled) return;

  // NDR reply intercept: handles customer responses to non-delivery prompts
  // (confirm / reschedule / address update / cancel). Returns true when consumed.
  const ndrHandled = await handleNdrReply(cleanText, contact, orgId);
  if (ndrHandled) return;

  // Size finder intercept: guides customer through gender → height → weight → size recommendation.
  const sizeHandled = await handleSizeFinderReply(cleanText, contact, orgId);
  if (sizeHandled) return;

  // Shade finder intercept: guides customer through skin tone → undertone → shade recommendation.
  const shadeHandled = await handleShadeFinderReply(cleanText, contact, orgId);
  if (shadeHandled) return;

  // Replenishment intercept: handles REORDER / STOP replies to the 30-day reminder.
  const replenishHandled = await handleReplenishmentReply(cleanText, contact, orgId);
  if (replenishHandled) return;

  if (contact.assignedAgent === "Bot") {
    const org = await repo.findOrgActiveUseCase(orgId);

    // Route to the active use-case agent; fall through to the AI autoresponder
    // when no agent owns the message (or none is active).
    let handled = false;
    if (org?.activeUseCase === "MARKETPLACE") {
      handled = await handleMarketplaceMessage(text, contact.phone, contact.id, orgId);
    } else if (org?.activeUseCase === "APPOINTMENT") {
      handled = await handleAppointmentMessage(text, contact.phone, contact.id, orgId);
    }

    if (!handled) {
      await handleAutoResponder(contact.id, orgId);
    }
  }
}

// ─── System-level WhatsApp auth (login-code verification) ──────────────────

/**
 * Handle system-level WhatsApp authentication attempts.
 * Extracts the WPF- code, resolves if user profile exists, and sends back verification check status.
 */
export async function handleSystemAuthWebhook(text: string, waFrom: string, phoneNumberId: string) {
  const match = text.match(/Verification Code:\s*(WPF-[A-Z0-9]+)/i);
  if (!match) {
    console.warn(`[System Webhook Auth] Pattern not matched in text: "${text}"`);
    return;
  }

  const code = match[1].toUpperCase();
  const normalizedPhone = `+${waFrom.replace(/[^0-9]/g, "")}`;

  console.log(`[System Webhook Auth] Processing code "${code}" from phone "${normalizedPhone}"`);

  const attempt = await repo.findLoginAttemptByCode(code);

  if (!attempt) {
    console.warn(`[System Webhook Auth] Active attempt session not found for code: "${code}"`);
    return;
  }

  if (attempt.status !== "PENDING") {
    console.log(`[System Webhook Auth] Session already resolved with status: ${attempt.status}`);
    return;
  }

  if (attempt.expiresAt < new Date()) {
    console.warn(`[System Webhook Auth] Code has expired for: "${code}"`);
    await repo.updateLoginAttempt(attempt.id, { status: "EXPIRED", phone: normalizedPhone });
    return;
  }

  const user = await repo.findUserByPhone(normalizedPhone);

  if (user) {
    // Existing user: mark as VERIFIED and link profile
    await repo.updateLoginAttempt(attempt.id, {
      status: "VERIFIED",
      phone: normalizedPhone,
      userId: user.id,
    });
    console.log(`[System Webhook Auth] Linked attempt ${attempt.id} to user ${user.id} (${normalizedPhone})`);
  } else {
    // New Prospect: mark as VERIFIED_NEW_USER for onboarding modal triggers
    await repo.updateLoginAttempt(attempt.id, {
      status: "VERIFIED_NEW_USER",
      phone: normalizedPhone,
    });
    console.log(`[System Webhook Auth] Set attempt ${attempt.id} status to VERIFIED_NEW_USER (${normalizedPhone})`);
  }

  // Reply back to user's phone confirming the verification
  const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

  if (systemToken && phoneNumberId) {
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedPhone,
      type: "text",
      text: { body: "✅ Verification successful! You can now continue in the app." },
    };

    try {
      await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${systemToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error("[System Webhook Auth Confirmation Reply Failed]", e);
    }
  }
}
