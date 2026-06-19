/**
 * cartRecoveryTemplateSelector.ts
 *
 * Determines which of the 12 cart-recovery template variants to send,
 * fills its variables, and returns the WhatsApp API component array.
 *
 * Routing is deterministic (value tier, buyer history, touch number).
 * Groq is used only for one optional enrichment: a one-liner product
 * description that makes the body copy feel hand-written.
 *
 * Template naming convention: cr_t{touch}_{angle}
 *   touch:  1 (image nudge) | 2 (social proof) | 3 (incentive)
 *   angle:  new | repeat | highvalue | generic | proof | scarcity |
 *           fit | discount | escalate | hold | size | cold
 */

import type { Contact } from "@prisma/client";
import { getGroqChatCompletionWithFallback } from "@/shared/lib/groq";

// ─── Template variant definitions ────────────────────────────────────────────
// Each entry describes the approved Meta template.
// Variables:  {{1}}=name  {{2}}=product  {{3}}=checkout_url  (most templates)
//             {{3}}=price (highvalue)    {{3}}=fit_note (size)
// Header: IMAGE for touch-1 variants; TEXT or none for later touches.

export interface CartRecoveryTemplate {
  name: string;
  headerType: "IMAGE" | "TEXT" | "NONE";
  headerText?: string; // only when headerType === "TEXT"
  body: string;
  buttons: Array<
    | { type: "QUICK_REPLY"; text: string }
    | { type: "URL"; text: string; urlVar: "{{3}}" }
  >;
  // Which variable slot holds the checkout URL (needed to fill it at send time)
  checkoutUrlVar: "{{3}}" | "{{4}}" | null;
}

export const CART_RECOVERY_TEMPLATES: Record<string, CartRecoveryTemplate> = {
  // ── TOUCH 1: Image opener — no discount ────────────────────────────────────

  cr_t1_new: {
    name: "cr_t1_new",
    headerType: "IMAGE",
    body: "Hi {{1}} 👋 You were just looking at the {{2}} — still in your size. Want me to hold it before it sells out? 🖤",
    buttons: [
      { type: "QUICK_REPLY", text: "Hold it ✋" },
      { type: "URL", text: "Complete order", urlVar: "{{3}}" },
    ],
    checkoutUrlVar: "{{3}}",
  },

  cr_t1_repeat: {
    name: "cr_t1_repeat",
    headerType: "IMAGE",
    body: "Hey {{1}}, welcome back! 🙌 Spotted you checking out the {{2}} again. Shall I set one aside for you?",
    buttons: [
      { type: "QUICK_REPLY", text: "Yes, hold it" },
      { type: "URL", text: "Complete order", urlVar: "{{3}}" },
    ],
    checkoutUrlVar: "{{3}}",
  },

  cr_t1_highvalue: {
    // ₹5 000+ carts — concierge tone, no scarcity pressure
    name: "cr_t1_highvalue",
    headerType: "IMAGE",
    body: "Hi {{1}}, I noticed you were considering the {{2}}. Happy to answer any questions before you decide — no rush at all. 😊",
    buttons: [
      { type: "QUICK_REPLY", text: "I have a question" },
      { type: "URL", text: "View order", urlVar: "{{3}}" },
    ],
    checkoutUrlVar: "{{3}}",
  },

  cr_t1_generic: {
    // Fallback for non-apparel / unknown category
    name: "cr_t1_generic",
    headerType: "IMAGE",
    body: "Hi {{1}}, the {{2}} is still waiting in your cart. Shall I hold it for you?",
    buttons: [
      { type: "QUICK_REPLY", text: "Yes, hold it" },
      { type: "URL", text: "Complete order", urlVar: "{{3}}" },
    ],
    checkoutUrlVar: "{{3}}",
  },

  // ── TOUCH 2: Social proof / objection bait — still no discount ─────────────

  cr_t2_proof: {
    name: "cr_t2_proof",
    headerType: "NONE",
    body: "Hi {{1}}, just checking in on the {{2}} 👀 It's been one of our top picks this week — a lot of customers are loving it. Still yours if you want it.",
    buttons: [
      { type: "QUICK_REPLY", text: "Tell me more" },
      { type: "URL", text: "Complete order", urlVar: "{{3}}" },
    ],
    checkoutUrlVar: "{{3}}",
  },

  cr_t2_scarcity: {
    name: "cr_t2_scarcity",
    headerType: "NONE",
    body: "Hi {{1}}, a quick heads-up — the {{2}} is running low in your size. We can't guarantee it'll be available tomorrow. Want to lock it in?",
    buttons: [
      { type: "QUICK_REPLY", text: "Lock it in 🔒" },
      { type: "URL", text: "Complete order", urlVar: "{{3}}" },
    ],
    checkoutUrlVar: "{{3}}",
  },

  cr_t2_fit: {
    // Pre-empts the #1 objection for apparel
    name: "cr_t2_fit",
    headerType: "NONE",
    body: "Hi {{1}}, if you were wondering about fit — the {{2}} runs true to size, slim but not tight. Happy to help if you have any questions 🙌",
    buttons: [
      { type: "QUICK_REPLY", text: "I have a question" },
      { type: "URL", text: "Complete order", urlVar: "{{3}}" },
    ],
    checkoutUrlVar: "{{3}}",
  },

  // ── TOUCH 3: Incentive — last resort ───────────────────────────────────────

  cr_t3_discount: {
    name: "cr_t3_discount",
    headerType: "NONE",
    body: "Hi {{1}}, your cart is about to expire 😢 We'd hate for you to miss the {{2}}. Here's a little something to help you decide: {{3}}",
    buttons: [{ type: "URL", text: "Claim offer", urlVar: "{{3}}" }],
    checkoutUrlVar: "{{3}}",
  },

  cr_t3_escalate: {
    // High-value carts: offer human, never discount
    name: "cr_t3_escalate",
    headerType: "NONE",
    body: "Hi {{1}}, I noticed you haven't completed your order for the {{2}} yet. I'd love to connect you with one of our advisors — they can help you decide. Shall I?",
    buttons: [
      { type: "QUICK_REPLY", text: "Yes, connect me" },
      { type: "URL", text: "Complete order", urlVar: "{{3}}" },
    ],
    checkoutUrlVar: "{{3}}",
  },

  // ── REACTIVE: Reply-triggered (button tap responses) ───────────────────────
  // These are template-safe replies used when the Ghostwriter cannot free-write
  // (edge case: session closed between reply and response send).

  cr_hold_confirm: {
    name: "cr_hold_confirm",
    headerType: "NONE",
    body: "Done! I've noted your interest in the {{2}}, {{1}} 😊 Your cart will be here when you're ready: {{3}}",
    buttons: [{ type: "URL", text: "Complete order", urlVar: "{{3}}" }],
    checkoutUrlVar: "{{3}}",
  },

  cr_winback_cold: {
    // 48 h+ no response — final touch before giving up
    name: "cr_winback_cold",
    headerType: "NONE",
    body: "Hi {{1}}, last call for the {{2}} 👋 If the timing wasn't right, no worries at all — we'll be here whenever you're ready.",
    buttons: [{ type: "URL", text: "Shop now", urlVar: "{{3}}" }],
    checkoutUrlVar: "{{3}}",
  },

  // ── BEAUTY / COSMETICS ────────────────────────────────────────────────────

  cr_t1_beauty: {
    // T1 for beauty products — addresses shade uncertainty, not size
    name: "cr_t1_beauty",
    headerType: "IMAGE",
    body: "Hi {{1}} 💄 Your {{2}} is still waiting! Not sure about the shade? Our customers say it looks beautiful on all skin tones — and we offer easy exchanges.",
    buttons: [
      { type: "QUICK_REPLY", text: "Tell me more" },
      { type: "URL", text: "Complete order", urlVar: "{{3}}" },
    ],
    checkoutUrlVar: "{{3}}",
  },

  cr_t2_replenishment: {
    // T2 for beauty — triggers replenishment urgency, not size scarcity
    name: "cr_t2_replenishment",
    headerType: "NONE",
    body: "Hi {{1}}, just so you know — the {{2}} typically lasts 3–4 weeks once you're in a routine. A lot of our customers reorder monthly 🌿 Still yours if you want it.",
    buttons: [
      { type: "QUICK_REPLY", text: "I have a question" },
      { type: "URL", text: "Complete order", urlVar: "{{3}}" },
    ],
    checkoutUrlVar: "{{3}}",
  },
};

// ─── Selection result ─────────────────────────────────────────────────────────

export interface TemplateSelection {
  template: CartRecoveryTemplate;
  /** Resolved body variables: [name, product, checkoutUrl] */
  bodyParams: string[];
  /** Product image URL for the header (null → no header image sent) */
  headerImageUrl: string | null;
}

// ─── Deterministic selector ───────────────────────────────────────────────────

/**
 * Pick the right template variant and fill its variables.
 * touchNumber: 0 = first touch, 1 = second touch, 2 = third (incentive) touch.
 */
export async function selectCartRecoveryTemplate(
  contact: Contact,
  touchNumber: number,
  orderCount: number,   // pass from caller — avoids a DB query here
  headerImageUrl: string | null,
): Promise<TemplateSelection> {
  const attrs = (contact.attributes as Record<string, string | boolean | null | undefined>) || {};
  const cartTotal   = parseFloat(String(attrs.cart_total  ?? "0")) || 0;
  const cartItems   = String(attrs.cart_items   ?? "");
  const checkoutUrl = String(attrs.cart_checkout_url ?? attrs.shopify_checkout_url ?? "");

  // Derive a short product name (first item before any "(x" quantity suffix)
  const productName = cartItems.split(",")[0]?.replace(/\s*\(x\d+\)/, "").trim() || "your item";

  // Optionally enrich the product name with a Groq one-liner so the message
  // feels hand-written ("the Midnight Black Oxford Slim Fit" → "the Oxford")
  const shortProduct = await enrichProductName(productName).catch(() => productName);

  // ── Touch 1 selection ────────────────────────────────────────────────────
  if (touchNumber === 0) {
    let key: string;
    if (cartTotal >= 5000) {
      key = "cr_t1_highvalue";
    } else if (orderCount > 0) {
      key = "cr_t1_repeat";
    } else if (isApparelCategory(productName)) {
      key = "cr_t1_new";
    } else if (isCosmeticsCategory(productName)) {
      key = "cr_t1_beauty";
    } else {
      key = "cr_t1_generic";
    }
    return build(key, contact.name, shortProduct, checkoutUrl, headerImageUrl);
  }

  // ── Touch 2 selection ────────────────────────────────────────────────────
  if (touchNumber === 1) {
    let key: string;
    if (cartTotal >= 5000) {
      key = "cr_t2_scarcity";         // luxury buyers respond to exclusivity
    } else if (isApparelCategory(productName)) {
      key = "cr_t2_fit";              // apparel → pre-empt fit objection
    } else if (isCosmeticsCategory(productName)) {
      key = "cr_t2_replenishment";    // beauty → replenishment urgency
    } else {
      key = "cr_t2_proof";
    }
    return build(key, contact.name, shortProduct, checkoutUrl, null); // no image on T2
  }

  // ── Touch 3 selection (incentive) ────────────────────────────────────────
  if (touchNumber === 2) {
    if (cartTotal >= 5000) {
      return build("cr_t3_escalate", contact.name, shortProduct, checkoutUrl, null);
    }
    return build("cr_t3_discount", contact.name, shortProduct, checkoutUrl, null);
  }

  // ── Touch 4 (order 3): cold winback — graceful last call ─────────────────
  return build("cr_winback_cold", contact.name, shortProduct, checkoutUrl, null);
}

// ─── WhatsApp API component builder ──────────────────────────────────────────

/**
 * Converts a TemplateSelection into the `components` array expected by
 * sendWhatsAppMessage({ template: { components } }).
 */
export function buildTemplateComponents(
  selection: TemplateSelection,
): Record<string, unknown>[] {
  const components: Record<string, unknown>[] = [];

  // Header component (image or nothing)
  if (selection.template.headerType === "IMAGE" && selection.headerImageUrl) {
    components.push({
      type: "header",
      parameters: [
        { type: "image", image: { link: selection.headerImageUrl } },
      ],
    });
  } else if (selection.template.headerType === "TEXT" && selection.template.headerText) {
    components.push({
      type: "header",
      parameters: [{ type: "text", text: selection.template.headerText }],
    });
  }

  // Body component
  components.push({
    type: "body",
    parameters: selection.bodyParams.map((p) => ({ type: "text", text: p })),
  });

  return components;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function build(
  key: string,
  name: string,
  product: string,
  checkoutUrl: string,
  headerImageUrl: string | null,
): TemplateSelection {
  const template = CART_RECOVERY_TEMPLATES[key];
  if (!template) throw new Error(`Unknown cart recovery template key: ${key}`);
  return {
    template,
    bodyParams: [name, product, checkoutUrl],
    headerImageUrl,
  };
}

const APPAREL_KEYWORDS = [
  "shirt", "tshirt", "t-shirt", "top", "kurta", "kurti", "blouse",
  "jeans", "trouser", "pant", "skirt", "dress", "saree", "lehenga",
  "jacket", "hoodie", "sweatshirt", "suit", "blazer", "sherwani",
  "oxford", "polo", "linen", "cotton", "fabric", "apparel", "wear",
];

const COSMETICS_KEYWORDS = [
  "lipstick", "lip gloss", "lip liner", "lip balm",
  "foundation", "concealer", "powder", "blush", "bronzer", "highlighter", "contour",
  "eyeshadow", "eyeliner", "mascara", "brow", "kajal",
  "serum", "moisturiser", "moisturizer", "sunscreen", "spf", "toner", "cleanser",
  "face wash", "scrub", "mask", "peel", "retinol", "vitamin c", "niacinamide",
  "perfume", "fragrance", "deodorant", "body lotion", "body butter",
  "shampoo", "conditioner", "hair mask", "hair oil", "hair serum",
  "nail polish", "nail art",
  "makeup", "cosmetic", "beauty", "skincare", "skin care", "haircare", "hair care",
];

function isApparelCategory(productName: string): boolean {
  const lower = productName.toLowerCase();
  return APPAREL_KEYWORDS.some((k) => lower.includes(k));
}

function isCosmeticsCategory(productName: string): boolean {
  const lower = productName.toLowerCase();
  return COSMETICS_KEYWORDS.some((k) => lower.includes(k));
}

/**
 * Groq call to shorten / humanise the product name for template copy.
 * e.g. "Midnight Black Oxford Slim Fit Formal Shirt (Size M)" → "Midnight Oxford"
 * Falls back to the raw name on any error.
 */
async function enrichProductName(raw: string): Promise<string> {
  if (raw.length <= 25) return raw; // already short enough

  const reply = await getGroqChatCompletionWithFallback(
    [
      {
        role: "system",
        content:
          "You are a copywriter assistant. Given a product name from an e-commerce cart, return ONLY a short, natural-sounding version (2–4 words max) that would fit inside a WhatsApp message. No punctuation, no explanation.",
      },
      { role: "user", content: raw },
    ],
    "llama-3.1-8b-instant",
    "llama-3.1-8b-instant",
    { temperature: 0.3, maxTokens: 20 },
  );

  const shortened = reply.trim().replace(/^["']|["']$/g, "");
  return shortened || raw;
}
