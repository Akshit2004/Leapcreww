/**
 * cartRecoveryAgent.ts
 *
 * The reactive side of the abandoned-cart pipeline — everything that fires
 * when a customer REPLIES to a recovery message (session is now open).
 *
 * Pipeline:
 *   Gatekeeper  — pause the active cart_abandoned enrollment immediately
 *   Analyst     — one Groq call: label + objection + score + action
 *   Ghostwriter — one Groq call: writes the personalised reply
 *   Closer      — deterministic: value-tier action (discount link / escalate)
 *
 * Exported:
 *   handleCartRecoveryReply(text, contact, orgId) → boolean
 *     Returns true  = message consumed here, caller must return early.
 *     Returns false = contact not in recovery, let normal routing continue.
 */

import type { Contact } from "@prisma/client";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import { getGroqChatCompletionWithFallback } from "@/shared/lib/groq";

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntentLabel = "hot" | "objection" | "not_now" | "dead";
export type ObjectionType = "fit" | "price" | "shipping" | "stock" | "thinking" | "cod_payment" | null;
export type RecoveryAction = "close" | "address_objection" | "nurture" | "cancel";

export interface AnalystResult {
  label: IntentLabel;
  objection: ObjectionType;
  score: number;       // 1–10
  action: RecoveryAction;
}

// ─── Gatekeeper ───────────────────────────────────────────────────────────────

/**
 * Pause every active cart_abandoned enrollment for this contact.
 * We use status "paused" — the SequenceEnrollment.status column is a
 * plain String so no migration is needed. processDueEnrollments only
 * picks up "active" rows, so "paused" enrollments are skipped automatically.
 */
async function pauseCartEnrollments(
  contactId: string,
  orgId: string,
): Promise<boolean> {
  const { prisma } = await import("@/shared/lib/prisma");

  const active = await prisma.sequenceEnrollment.findMany({
    where: {
      contactId,
      organizationId: orgId,
      status: "active",
      sequence: { trigger: "cart_abandoned" },
    },
  });

  if (active.length === 0) return false;

  await prisma.sequenceEnrollment.updateMany({
    where: { id: { in: active.map((e) => e.id) } },
    data: {
      status: "paused",
      // Record why so a dashboard can show it
      nextRunAt: null,
    },
  });

  // Stamp the contact so we know the pipeline is in reactive mode
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (contact) {
    const attrs = (contact.attributes as Record<string, unknown>) || {};
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        attributes: {
          ...attrs,
          recovery_paused_at: new Date().toISOString(),
          recovery_paused_reason: "customer_replied",
        },
      },
    });
  }

  return true;
}

// ─── Analyst ──────────────────────────────────────────────────────────────────

async function runAnalyst(
  replyText: string,
  contact: Contact,
): Promise<AnalystResult> {
  const attrs = (contact.attributes as Record<string, unknown>) || {};
  const cartItems = String(attrs.cart_items ?? "your item");
  const cartTotal = String(attrs.cart_total ?? "0");

  const prompt = `You are a cart recovery intent analyst for a WhatsApp commerce assistant.

Cart: "${cartItems}" — ₹${cartTotal}
Customer reply: "${replyText}"

Classify the customer's intent and return ONLY valid JSON with these exact keys:
{
  "label": "hot" | "objection" | "not_now" | "dead",
  "objection": "fit" | "price" | "shipping" | "stock" | "thinking" | null,
  "score": <integer 1-10>,
  "action": "close" | "address_objection" | "nurture" | "cancel"
}

Rules:
- "hot"       = ready to buy, asking how to pay, asking about size to confirm
- "objection" = has a specific concern blocking purchase (fit, price, shipping, stock, cod_payment)
- "not_now"   = interested but timing is wrong ("later", "next week", "checking")
- "dead"      = bought elsewhere, not interested, asked to stop
- score 8-10  = very high buying intent, trigger close action
- action "close" only when label is "hot" AND score >= 8
- action "cancel" only when label is "dead"`;

  const raw = await getGroqChatCompletionWithFallback(
    [
      { role: "system", content: "You are a JSON-only response bot. Never add explanation." },
      { role: "user", content: prompt },
    ],
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    { temperature: 0.1, maxTokens: 150, jsonMode: true },
  );

  try {
    const parsed = JSON.parse(raw) as Partial<AnalystResult>;
    return {
      label:     (["hot","objection","not_now","dead"].includes(parsed.label ?? "") ? parsed.label : "not_now") as IntentLabel,
      objection: (["fit","price","shipping","stock","thinking",null].includes(parsed.objection ?? null) ? parsed.objection : null) as ObjectionType,
      score:     typeof parsed.score === "number" ? Math.min(10, Math.max(1, parsed.score)) : 5,
      action:    (["close","address_objection","nurture","cancel"].includes(parsed.action ?? "") ? parsed.action : "nurture") as RecoveryAction,
    };
  } catch {
    // Safe fallback — treat as mild interest
    return { label: "not_now", objection: null, score: 4, action: "nurture" };
  }
}

// ─── Ghostwriter ──────────────────────────────────────────────────────────────

async function runGhostwriter(
  replyText: string,
  contact: Contact,
  analysis: AnalystResult,
  orgId: string,
): Promise<string> {
  const attrs = (contact.attributes as Record<string, unknown>) || {};
  const cartItems   = String(attrs.cart_items   ?? "your item");
  const cartTotal   = String(attrs.cart_total   ?? "0");
  const checkoutUrl = String(attrs.cart_checkout_url ?? attrs.shopify_checkout_url ?? "");

  const productName = cartItems.split(",")[0]?.replace(/\s*\(x\d+\)/, "").trim() || "your item";

  // Build context-specific instruction for each action type
  const actionInstruction: Record<RecoveryAction, string> = {
    close:
      `The customer is ready to buy. Send the checkout link naturally as part of a warm, 1-sentence nudge. URL: ${checkoutUrl}`,
    address_objection:
      `The customer has a ${analysis.objection ?? "general"} concern. Address ONLY that concern directly and confidently in 1-2 sentences. Do not push for a sale yet.`,
    nurture:
      `The customer is interested but not ready. Acknowledge their timing, keep the door open warmly. No pressure. 1 sentence.`,
    cancel:
      `The customer is not interested. Reply warmly and gracefully close the conversation. Wish them well. 1 sentence.`,
  };

  const systemPrompt = `You are a personal shopping assistant writing a WhatsApp reply on behalf of the brand.

Rules (strict):
- Max 2 sentences. Conversational, never corporate.
- Use the customer's first name once at most.
- No discount promises (that is handled separately by the system).
- No asterisks, no markdown. Plain WhatsApp text only.
- One emoji at most, and only if it feels natural.
- Never say "I am an AI" or "as an assistant".`;

  const userPrompt = `Customer name: ${contact.name}
Product in cart: ${productName} (₹${cartTotal})
Their message: "${replyText}"
Intent: ${analysis.label} | objection: ${analysis.objection ?? "none"} | score: ${analysis.score}/10

Task: ${actionInstruction[analysis.action]}`;

  const reply = await getGroqChatCompletionWithFallback(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    { temperature: 0.7, maxTokens: 150 },
  );

  return reply.trim();
}

// ─── Closer ───────────────────────────────────────────────────────────────────

/**
 * Deterministic closer: fires only when Analyst says action === "close".
 * Value-tiered — never lets AI decide on discounts or human escalation.
 */
async function runCloser(
  contact: Contact,
  orgId: string,
): Promise<void> {
  const attrs = (contact.attributes as Record<string, unknown>) || {};
  const cartTotal   = parseFloat(String(attrs.cart_total ?? "0")) || 0;
  const checkoutUrl = String(attrs.cart_checkout_url ?? attrs.shopify_checkout_url ?? "");
  const phone       = formatPhoneNumber(contact.phone);

  const { prisma } = await import("@/shared/lib/prisma");

  if (cartTotal >= 5000) {
    // High-value: escalate to human, no discount
    await prisma.contact.update({
      where: { id: contact.id },
      data: { assignedAgent: "Human", unreadCount: { increment: 1 } },
    });
    await prisma.systemLog.create({
      data: {
        type: "crm",
        message: `[Cart Recovery] High-value cart (₹${cartTotal}) — escalated ${contact.name} to human agent after intent score 8+.`,
        organizationId: orgId,
      },
    });
    // No WhatsApp message from the bot — the human picks it up from Inbox
    return;
  }

  // Standard: send checkout link as a clean CTA
  // (Ghostwriter already sent the warm reply; Closer just logs + tags)
  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      tags: { set: Array.from(new Set([...contact.tags, "Recovery-High-Intent"])) },
    },
  });

  await prisma.systemLog.create({
    data: {
      type: "crm",
      message: `[Cart Recovery] High intent detected for ${contact.name}. Checkout URL sent: ${checkoutUrl}`,
      organizationId: orgId,
    },
  });
}

// ─── Objection Closer ─────────────────────────────────────────────────────────
//
// Fires when Analyst returns action === "address_objection". Sends a concrete,
// deterministic response to the specific blocker — no AI hallucination on
// pricing or COD availability. Ghostwriter already sent the warm reply; this
// closer sends the material proof that removes the objection.

async function runObjectionCloser(
  contact: Contact,
  orgId: string,
  objection: ObjectionType,
): Promise<void> {
  const attrs = (contact.attributes as Record<string, unknown>) || {};
  const checkoutUrl = String(attrs.cart_checkout_url ?? attrs.shopify_checkout_url ?? "");
  const cartTotal   = parseFloat(String(attrs.cart_total ?? "0")) || 0;
  const phone       = formatPhoneNumber(contact.phone);

  const { prisma } = await import("@/shared/lib/prisma");

  if (objection === "price" || objection === "shipping") {
    // Fetch org's merchant-configured discount code. Sending it early here
    // (instead of waiting for T3) captures the objection in-conversation.
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { cartRecoveryDiscountCode: true },
    });
    const discountCode = org?.cartRecoveryDiscountCode;

    if (discountCode && checkoutUrl) {
      const msg = objection === "shipping"
        ? `🚚 We've got you covered! Use code *${discountCode}* at checkout for free shipping:\n${checkoutUrl}`
        : `💸 Here's something for you — use code *${discountCode}* for a discount on your order:\n${checkoutUrl}`;
      await sendWhatsAppMessage({ to: phone, text: msg }, orgId);
      await prisma.message.create({
        data: { sender: "agent", text: msg, contactId: contact.id, organizationId: orgId },
      });
      await prisma.contact.update({
        where: { id: contact.id },
        data: { tags: { set: Array.from(new Set([...contact.tags, "Discount-Sent"])) } },
      });
    }
    return;
  }

  if (objection === "cod_payment") {
    // Customer asked if COD is available — confirm it and link back to checkout.
    if (checkoutUrl) {
      const msg = `✅ Yes! Cash on Delivery is available for your order. Complete your checkout here:\n${checkoutUrl}`;
      await sendWhatsAppMessage({ to: phone, text: msg }, orgId);
      await prisma.message.create({
        data: { sender: "agent", text: msg, contactId: contact.id, organizationId: orgId },
      });
    }
    return;
  }

  if (objection === "fit" || objection === "stock") {
    // Can't resolve size/stock algorithmi­cally — escalate to human.
    await prisma.contact.update({
      where: { id: contact.id },
      data: { assignedAgent: "Human", unreadCount: { increment: 1 } },
    });
    await prisma.systemLog.create({
      data: {
        type: "crm",
        message: `[Cart Recovery] ${objection} objection from ${contact.name} (₹${cartTotal}) — escalated to human agent.`,
        organizationId: orgId,
      },
    });
    return;
  }
}

// ─── Opt-out guard ────────────────────────────────────────────────────────────

const OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "opt out", "opt-out", "don't message", "dont message", "remove me"];

function isOptOut(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return OPT_OUT_KEYWORDS.some((k) => lower === k || lower.startsWith(k + " "));
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Call this from whatsappInboundService BEFORE the autoresponder.
 * Returns true if the message was handled by the cart recovery pipeline.
 */
export async function handleCartRecoveryReply(
  text: string,
  contact: Contact,
  orgId: string,
): Promise<boolean> {
  const attrs = (contact.attributes as Record<string, unknown>) || {};

  // Only run if this contact is enrolled in cart recovery
  if (!attrs.cart_recovery_enrolled) return false;
  // Don't run if already recovered
  if (attrs.cart_recovered === true) return false;

  // Gatekeeper: try to pause active enrollments
  const hadActiveEnrollment = await pauseCartEnrollments(contact.id, orgId);
  if (!hadActiveEnrollment) return false;

  const phone = formatPhoneNumber(contact.phone);
  const { prisma } = await import("@/shared/lib/prisma");

  // Hard opt-out: cancel everything, log, never message again
  if (isOptOut(text)) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        attributes: { ...(attrs as object), cart_recovery_enrolled: false, opted_out: true },
        tags: { set: Array.from(new Set([...contact.tags, "Opted-Out"])) },
      },
    });
    await prisma.sequenceEnrollment.updateMany({
      where: { contactId: contact.id, organizationId: orgId, status: "paused" },
      data: { status: "cancelled", nextRunAt: null },
    });
    await prisma.systemLog.create({
      data: {
        type: "crm",
        message: `[Cart Recovery] ${contact.name} opted out. All recovery sequences cancelled.`,
        organizationId: orgId,
      },
    });
    return true; // consumed — do not route to autoresponder
  }

  // Analyst
  const analysis = await runAnalyst(text, contact).catch(() => ({
    label: "not_now" as IntentLabel,
    objection: null as ObjectionType,
    score: 4,
    action: "nurture" as RecoveryAction,
  }));

  // Stamp analysis onto contact attributes for dashboards / analytics
  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      attributes: {
        ...(attrs as object),
        recovery_intent_label: analysis.label,
        recovery_objection:    analysis.objection,
        recovery_score:        analysis.score,
        recovery_action:       analysis.action,
        recovery_analysed_at:  new Date().toISOString(),
      },
    },
  });

  // If dead intent: cancel enrollment, tag cold-cart, stop pipeline
  if (analysis.action === "cancel") {
    await prisma.sequenceEnrollment.updateMany({
      where: { contactId: contact.id, organizationId: orgId, status: "paused" },
      data: { status: "cancelled", nextRunAt: null },
    });
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        attributes: { ...(attrs as object), cart_recovery_enrolled: false },
        tags: { set: Array.from(new Set([...contact.tags, "Cold-Cart"])) },
      },
    });
    return true;
  }

  // Ghostwriter: generate personalised reply
  const ghostReply = await runGhostwriter(text, contact, analysis, orgId).catch(
    () => `Thanks for reaching out, ${contact.name}! Let me know if you have any questions. 😊`,
  );

  // Send the ghostwritten reply
  const sendResult = await sendWhatsAppMessage({ to: phone, text: ghostReply }, orgId);

  if (sendResult.ok) {
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    await prisma.message.create({
      data: { sender: "agent", text: ghostReply, contactId: contact.id, organizationId: orgId },
    });
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastMessage: ghostReply.slice(0, 60), lastMessageTime: timeStr },
    });
  }

  // Closer: additional deterministic action after the Ghostwriter reply.
  if (analysis.action === "close") {
    await runCloser(contact, orgId).catch(() => {});
  } else if (analysis.action === "address_objection" && analysis.objection) {
    await runObjectionCloser(contact, orgId, analysis.objection).catch(() => {});
  }

  await prisma.systemLog.create({
    data: {
      type: "crm",
      message: `[Cart Recovery] Reply from ${contact.name} → ${analysis.label} (${analysis.score}/10). Action: ${analysis.action}.`,
      organizationId: orgId,
    },
  });

  return true; // message consumed by recovery pipeline
}
