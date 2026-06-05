import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook, validateWebhookSignature, WhatsAppWebhookPayload } from "@/shared/lib/whatsapp";
import { prisma } from "@/shared/lib/prisma";
import { handleAutoResponder } from "@/shared/lib/autoresponder";
import { handleMarketplaceMessage } from "@/shared/lib/marketplace";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const result = verifyWebhook(mode, token, challenge);

  if (result.verified) {
    return new NextResponse(result.challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-hub-signature-256");
    const bodyText = await req.text();

    if (signature) {
      const isValid = validateWebhookSignature(signature, bodyText);
      if (!isValid) {
        console.warn("WhatsApp webhook: invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload: WhatsAppWebhookPayload = JSON.parse(bodyText);

    if (payload.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Invalid webhook object" }, { status: 400 });
    }

    for (const entry of payload.entry) {
      const entryWabaId = entry.id; // The WABA ID from the webhook payload

      for (const change of entry.changes) {
        const { value } = change;

        // ─── Status Updates ─────────────────────────────────────────
        if (value.statuses) {
          for (const status of value.statuses) {
            console.log(`Message ${status.id} status: ${status.status}`);

            // Update message delivery status in database
            if (status.id && status.status) {
              try {
                await prisma.message.updateMany({
                  where: { waMessageId: status.id },
                  data: { status: status.status },
                });

                // If message failed to deliver, log the details
                if (status.status === "failed") {
                  const errorDetail = status.errors?.[0];
                  const code = errorDetail?.code || "unknown";
                  const reason = errorDetail?.message || errorDetail?.title || "No error details provided by Meta";
                  console.error(`[Webhook Status] Message ${status.id} delivery failed: Code ${code} - ${reason}`);

                  // Find message to associate with campaign and organization
                  const msg = await prisma.message.findFirst({
                    where: { waMessageId: status.id },
                    select: {
                      organizationId: true,
                      campaignId: true,
                      contact: { select: { name: true, phone: true } }
                    }
                  });

                  if (msg) {
                    const d = new Date();
                    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                    await prisma.systemLog.create({
                      data: {
                        timestamp: timeStr,
                        type: "campaign",
                        message: `Delivery failed to ${msg.contact.name} (${msg.contact.phone}): ${reason} (Code ${code})`,
                        organizationId: msg.organizationId,
                        campaignId: msg.campaignId
                      }
                    });
                  }
                }

                // Update campaign metrics for delivery tracking
                if (status.status === "delivered" || status.status === "read") {
                  const msg = await prisma.message.findFirst({
                    where: { waMessageId: status.id },
                    select: { campaignId: true },
                  });
                  if (msg?.campaignId) {
                    const field = status.status === "delivered" ? "delivered" : "read";
                    await prisma.campaign.update({
                      where: { id: msg.campaignId },
                      data: { [field]: { increment: 1 } },
                    }).catch(() => {}); // Ignore if already counted
                  }
                }
              } catch {
                // Status update is best-effort, don't fail the webhook
              }
            }
          }
        }

        // ─── Inbound Messages ───────────────────────────────────────
        if (value.messages) {
          for (const msg of value.messages) {
            const waFrom = msg.from;
            const text = msg.text?.body || msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id || msg.button?.text || (msg.order ? "WhatsApp Native Order" : "");
            const profileName = value.contacts?.[0]?.profile?.name || `Customer ${waFrom.slice(-4)}`;

            console.log(`WhatsApp message from ${waFrom} (${profileName}): ${text}`);

            const phoneNumberId = value.metadata?.phone_number_id;
            if (!phoneNumberId) {
              console.warn("WhatsApp webhook: missing phone_number_id in metadata, skipping");
              continue;
            }

            // ─── System-Level Auth Code Interception ───
            if (text.toUpperCase().includes("VERIFICATION CODE: WPF-")) {
              await handleSystemAuthWebhook(text, waFrom, phoneNumberId);
              continue;
            }

            // ─── Multi-Tenant Routing: Strict phone_number_id + WABA validation ───
            const org = await prisma.organization.findFirst({
              where: {
                whatsappPhoneNumberId: phoneNumberId,
                whatsappBusinessAccountId: entryWabaId, // Defense-in-depth: cross-validate WABA
                whatsappConnected: true,
              },
            });

            if (!org) {
              // Fallback: try phone_number_id only (for cases where WABA ID may differ)
              const orgFallback = await prisma.organization.findFirst({
                where: {
                  whatsappPhoneNumberId: phoneNumberId,
                  whatsappConnected: true,
                },
              });

              if (!orgFallback) {
                console.warn(`WhatsApp webhook: no org found for phone_number_id ${phoneNumberId} / WABA ${entryWabaId}`);
                continue;
              }

              // Log the WABA mismatch for investigation but proceed
              if (orgFallback.whatsappBusinessAccountId !== entryWabaId) {
                console.warn(
                  `WhatsApp webhook: WABA mismatch for org ${orgFallback.id}. ` +
                  `Expected: ${orgFallback.whatsappBusinessAccountId}, Got: ${entryWabaId}. ` +
                  `Proceeding with phone_number_id match.`
                );
              }

              // Process with fallback org
              await processInboundMessage(orgFallback.id, waFrom, text, profileName, msg.id, msg.order, msg.referral);
              continue;
            }

            await processInboundMessage(org.id, waFrom, text, profileName, msg.id, msg.order, msg.referral);
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err: unknown) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function processInboundMessage(
  orgId: string,
  waFrom: string,
  text: string,
  profileName: string,
  waMessageId?: string,
  orderData?: { catalog_id: string; product_items: { product_retailer_id: string; quantity: string; item_price: string; currency: string }[]; text?: string },
  referralData?: { source_id: string; source_url: string; headline: string; body: string }
) {
  const normalizedPhone = `+${waFrom.replace(/[^0-9]/g, "")}`;

  // Strict phone number lookup — exact match only, no suffix matching
  let contact = await prisma.contact.findFirst({
    where: {
      phone: normalizedPhone,
      organizationId: orgId,
    },
  });

  const d = new Date();
  const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  if (contact) {
    const updateData: any = {
      lastMessage: text,
      lastMessageTime: timeStr,
      unreadCount: { increment: 1 },
    };
    if (referralData?.source_id) {
      updateData.sourceAdId = referralData.source_id;
    }

    contact = await prisma.contact.update({
      where: { id: contact.id },
      data: updateData,
    });
  } else {
    contact = await prisma.contact.create({
      data: {
        name: profileName,
        phone: normalizedPhone,
        email: `${waFrom}@whatsapp.customer`,
        source: "WhatsApp Inbound",
        tags: ["WhatsApp", "Inbound"],
        status: "Active",
        lastMessage: text,
        lastMessageTime: timeStr,
        unreadCount: 1,
        assignedAgent: "Bot",
        organizationId: orgId,
        sourceAdId: referralData?.source_id || null,
      },
    });
  }

  await prisma.message.create({
    data: {
      sender: "user",
      text,
      timestamp: timeStr,
      contactId: contact.id,
      organizationId: orgId,
      waMessageId: waMessageId || null,
    },
  });

  await prisma.systemLog.create({
    data: {
      timestamp: timeStr,
      type: "chat",
      message: `WhatsApp from ${contact.name}: "${text.slice(0, 60)}"`,
      organizationId: orgId,
    },
  });

  // Handle Native WhatsApp Order
  if (orderData) {
    console.log(`[Marketplace] Native order received from ${contact.phone} with ${orderData.product_items.length} items.`);
    let totalCents = 0;
    const orderItemsToCreate = [];

    for (const item of orderData.product_items) {
      // Find product by SKU or ID
      const product = await prisma.product.findFirst({
        where: {
          organizationId: orgId,
          OR: [
            { sku: item.product_retailer_id },
            { id: item.product_retailer_id }
          ]
        }
      });
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
      const { createRazorpayPaymentLink } = await import("@/shared/lib/razorpay");
      const rzpLink = await createRazorpayPaymentLink(totalCents, orderIdStr, contact.phone, contact.name);

      await prisma.order.create({
        data: {
          orderId: orderIdStr,
          contactId: contact.id,
          total: totalCents,
          status: "pending",
          paymentStatus: "pending",
          razorpayOrderId: rzpLink.id,
          phone: contact.phone,
          organizationId: orgId,
          address: { address: "pending" },
          items: {
            create: orderItemsToCreate,
          },
        },
      });

      const { sendWhatsAppMessage, formatPhoneNumber } = await import("@/shared/lib/whatsapp");
      const CURRENCY_SYMBOL = "₹";
      const totalFormatted = `${CURRENCY_SYMBOL}${(totalCents / 100).toFixed(2)}`;
      let summaryText = `🧾 *Order Received!*\n\n━━━━━━━━━━━━━━━━━━━\n`;
      orderItemsToCreate.forEach((item) => {
        summaryText += `*${item.name}* x${item.quantity} — ${CURRENCY_SYMBOL}${(item.price * item.quantity / 100).toFixed(2)}\n`;
      });
      summaryText += `━━━━━━━━━━━━━━━━━━━\n*Total: ${totalFormatted}*\n*Order ID:* ${orderIdStr}\n\n💳 *Pay online:*\n${rzpLink.short_url}\n\nOr reply *CONFIRM* after payment to verify your order.`;

      await sendWhatsAppMessage({
        to: formatPhoneNumber(contact.phone),
        text: summaryText,
        buttons: [
          { type: "reply", reply: { id: "confirm_order", title: "✅ Paid" } },
          { type: "reply", reply: { id: "menu", title: "🏠 Menu" } },
        ],
      }, orgId);
    }
    return;
  }

  if (contact.assignedAgent === "Bot") {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { marketplaceBotEnabled: true },
    });

    if (org?.marketplaceBotEnabled) {
      const marketplaceHandled = await handleMarketplaceMessage(
        text,
        contact.phone,
        contact.id,
        orgId
      );
      if (!marketplaceHandled) {
        await handleAutoResponder(contact.id, orgId);
      }
    } else {
      await handleAutoResponder(contact.id, orgId);
    }
  }
}

/**
 * Handle system-level WhatsApp authentication attempts.
 * Extracts the WPF- code, resolves if user profile exists, and sends back verification check status.
 */
async function handleSystemAuthWebhook(text: string, waFrom: string, phoneNumberId: string) {
  const match = text.match(/Verification Code:\s*(WPF-[A-Z0-9]+)/i);
  if (!match) {
    console.warn(`[System Webhook Auth] Pattern not matched in text: "${text}"`);
    return;
  }

  const code = match[1].toUpperCase();
  const normalizedPhone = `+${waFrom.replace(/[^0-9]/g, "")}`;

  console.log(`[System Webhook Auth] Processing code "${code}" from phone "${normalizedPhone}"`);

  const attempt = await prisma.whatsAppLoginAttempt.findUnique({
    where: { code },
  });

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
    await prisma.whatsAppLoginAttempt.update({
      where: { id: attempt.id },
      data: { status: "EXPIRED", phone: normalizedPhone },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { phone: normalizedPhone },
  });

  if (user) {
    // Existing user: mark as VERIFIED and link profile
    await prisma.whatsAppLoginAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "VERIFIED",
        phone: normalizedPhone,
        userId: user.id,
      },
    });
    console.log(`[System Webhook Auth] Linked attempt ${attempt.id} to user ${user.id} (${normalizedPhone})`);
  } else {
    // New Prospect: mark as VERIFIED_NEW_USER for onboarding modal triggers
    await prisma.whatsAppLoginAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "VERIFIED_NEW_USER",
        phone: normalizedPhone,
      },
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