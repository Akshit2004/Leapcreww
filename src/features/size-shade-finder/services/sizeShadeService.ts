/**
 * sizeShadeService.ts — the Shade Finder and Size Finder conversational agents.
 *
 * Both are deliberately *short* (3 tappable questions) and *personable*: the
 * questions arrive as WhatsApp interactive buttons, every answer gets a warm
 * human acknowledgement, and the final recommendation is written by Groq in the
 * brand's own voice (naming the product the customer was looking at, if known).
 *
 * Entry points:
 *   - Brand-triggered: a template send sets `shade_finder_state` / `size_finder_state`
 *     (see sequenceService) and the customer's reply lands in the handlers below.
 *   - Customer-triggered: the customer messages "SHADE" / "SIZE" (e.g. from a
 *     storefront wa.me deep link) → handleFinderKeyword starts the flow and, by
 *     virtue of them messaging us, we now have their phone number.
 *
 * Interactive button replies arrive as the button *id* (see whatsapp webhook
 * route), so every state matches on ids first, then falls back to typed text so
 * customers who type "fair" / "medium" / "M" still get through.
 */
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import { getGroqChatCompletionWithFallback } from "@/shared/lib/groq";
import type { Contact } from "@prisma/client";
import {
  getContactAttributes,
  updateContactAttributes,
  getOrgBrandVoice,
  type BrandVoice,
} from "../repositories/sizeShadeRepo";

type ReplyButton = { type: "reply"; reply: { id: string; title: string } };

// ── Attribute helpers ────────────────────────────────────────────────────────

async function getAttrs(contactId: string): Promise<Record<string, any>> {
  return getContactAttributes(contactId);
}

async function setAttrs(contactId: string, patch: Record<string, unknown>) {
  const attrs = await getAttrs(contactId);
  await updateContactAttributes(contactId, { ...attrs, ...patch });
}

async function send(contact: Contact, orgId: string, text: string) {
  await sendWhatsAppMessage({ to: formatPhoneNumber(contact.phone), text }, orgId);
}

async function sendButtons(
  contact: Contact,
  orgId: string,
  text: string,
  buttons: ReplyButton[]
) {
  // WhatsApp allows max 3 reply buttons.
  await sendWhatsAppMessage(
    { to: formatPhoneNumber(contact.phone), text, buttons: buttons.slice(0, 3) },
    orgId
  );
}

const btn = (id: string, title: string): ReplyButton => ({ type: "reply", reply: { id, title } });

/** Normalise an incoming reply (button id OR typed text) for matching. */
function norm(text: string): string {
  return text.trim().toLowerCase();
}

/** True if the normalised reply matches the button id or any of the keywords. */
function matches(reply: string, id: string, ...keywords: string[]): boolean {
  if (reply === id) return true;
  return keywords.some((k) => reply === k || reply.includes(k));
}

// ── Groq personalisation ──────────────────────────────────────────────────────

const PREFERRED_MODEL = "llama-3.1-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant";

/**
 * Ask Groq to phrase the final recommendation in the brand's voice. Falls back
 * to a clean static message if the LLM is unavailable — the customer always
 * gets a useful answer.
 */
async function personalize(opts: {
  voice: BrandVoice;
  customerName: string | null;
  productContext: string | null;
  summary: string; // plain-English summary of what the customer told us
  recommendation: string; // the concrete result (shade family / size)
  fallback: string; // static message used if Groq fails
}): Promise<string> {
  const { voice, customerName, productContext, summary, recommendation, fallback } = opts;
  try {
    const system =
      `You are a real human style/beauty advisor for "${voice.brandName}". ` +
      `Voice: ${voice.tone}. ` +
      `Write ONE short WhatsApp message (2-4 sentences, max ~60 words) that delivers the recommendation warmly and personally. ` +
      `Sound like a person texting a friend who asked for help — never robotic, never a form. ` +
      `Use at most one emoji. No markdown headings, no bullet lists, no asterisks around words. ` +
      `Do NOT invent specific product names, prices, or SKUs beyond what you are given. ` +
      `End with a light, genuine nudge to try it / shop it.`;

    const user =
      (customerName ? `Customer's name: ${customerName}.\n` : "") +
      (productContext ? `They were looking at: ${productContext}.\n` : "") +
      `What they told me: ${summary}\n` +
      `My recommendation for them: ${recommendation}\n\n` +
      `Write the message now.`;

    const out = await getGroqChatCompletionWithFallback(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      PREFERRED_MODEL,
      FALLBACK_MODEL,
      { temperature: 0.8, maxTokens: 220 }
    );
    const cleaned = out.trim().replace(/^["']|["']$/g, "");
    return cleaned.length > 0 ? cleaned : fallback;
  } catch (err) {
    console.warn("[finder] personalize failed, using fallback:", err);
    return fallback;
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  SHADE FINDER
// ════════════════════════════════════════════════════════════════════════════
//
//  Q1 skin depth (fair / medium / deep)
//  Q2 undertone — asked via the gold-vs-silver jewellery proxy (no "look at
//     your veins" nonsense): gold → warm, silver → cool, both → neutral
//  Q3 the look they want (everyday / glam)
//  → recommendation, then an optional one-question refine (skin type) for a
//    sharper formula pick.

type Depth = "fair" | "medium" | "deep";
type Undertone = "warm" | "cool" | "neutral";

const SHADE_FAMILIES: Record<Depth, Record<Undertone, string>> = {
  fair: {
    cool: "a cool ivory / porcelain shade (think NC15 family)",
    warm: "a warm vanilla / nude-beige shade (NW15 family)",
    neutral: "a natural ivory shade (N15 family)",
  },
  medium: {
    cool: "a rose-beige shade (NC30 family)",
    warm: "a honey / golden-beige shade (NW30 family)",
    neutral: "a true natural beige (N30 family)",
  },
  deep: {
    cool: "a cool mocha shade (NC50 family)",
    warm: "a warm espresso / caramel-deep shade (NW50 family)",
    neutral: "a rich sable shade (N50 family)",
  },
};

const DEPTH_LABEL: Record<Depth, string> = { fair: "fair", medium: "medium / wheatish", deep: "deep / dusky" };
const UNDERTONE_LABEL: Record<Undertone, string> = { warm: "warm", cool: "cool", neutral: "neutral" };

function shadeFinishNote(finish: "everyday" | "glam"): string {
  return finish === "glam"
    ? "go one shade richer with a long-wear matte for that done-up look"
    : "a lightweight natural-finish formula will feel like your skin but better";
}

async function startShade(contact: Contact, orgId: string, product: string | null) {
  await setAttrs(contact.id, {
    shade_finder_state: "awaiting_depth",
    shade_finder_product: product,
    // clear any stale size flow
  });
  const name = contact.name && contact.name !== contact.phone ? `, ${contact.name.split(" ")[0]}` : "";
  await sendButtons(
    contact,
    orgId,
    `Yay, let's find your perfect shade${name}! ✨ I'll only ask 3 quick things.\n\nFirst — how would you describe your skin tone?`,
    [
      btn("sd_depth_fair", "Fair / Light"),
      btn("sd_depth_medium", "Medium / Wheatish"),
      btn("sd_depth_deep", "Deep / Dusky"),
    ]
  );
}

export async function handleShadeFinderReply(
  text: string,
  contact: Contact,
  orgId: string
): Promise<boolean> {
  const attrs = (contact.attributes as Record<string, any>) ?? {};
  const state: string | undefined = attrs.shade_finder_state;
  if (!state || state === "done") return false;

  const r = norm(text);

  // Q1 → skin depth
  if (state === "awaiting_depth") {
    let depth: Depth | null = null;
    if (matches(r, "sd_depth_fair", "fair", "light", "1")) depth = "fair";
    else if (matches(r, "sd_depth_medium", "medium", "wheat", "wheatish", "2")) depth = "medium";
    else if (matches(r, "sd_depth_deep", "deep", "dusky", "dark", "3")) depth = "deep";

    if (!depth) {
      await sendButtons(contact, orgId, "No worries — just tap the one closest to you 💛", [
        btn("sd_depth_fair", "Fair / Light"),
        btn("sd_depth_medium", "Medium / Wheatish"),
        btn("sd_depth_deep", "Deep / Dusky"),
      ]);
      return true;
    }

    await setAttrs(contact.id, { shade_finder_state: "awaiting_undertone", shade_finder_depth: depth });
    await sendButtons(
      contact,
      orgId,
      `Lovely. Here's a fun one — which jewellery makes your skin glow more?\n\n(This is the easiest way to read your undertone 😉)`,
      [
        btn("sd_ut_gold", "Gold"),
        btn("sd_ut_silver", "Silver"),
        btn("sd_ut_both", "Both look good"),
      ]
    );
    return true;
  }

  // Q2 → undertone via jewellery proxy
  if (state === "awaiting_undertone") {
    let undertone: Undertone | null = null;
    if (matches(r, "sd_ut_gold", "gold", "warm", "1")) undertone = "warm";
    else if (matches(r, "sd_ut_silver", "silver", "cool", "2")) undertone = "cool";
    else if (matches(r, "sd_ut_both", "both", "neutral", "either", "3")) undertone = "neutral";

    if (!undertone) {
      await sendButtons(contact, orgId, "Just tap whichever suits you best ✨", [
        btn("sd_ut_gold", "Gold"),
        btn("sd_ut_silver", "Silver"),
        btn("sd_ut_both", "Both look good"),
      ]);
      return true;
    }

    await setAttrs(contact.id, { shade_finder_state: "awaiting_finish", shade_finder_undertone: undertone });
    await sendButtons(
      contact,
      orgId,
      `Got it — ${UNDERTONE_LABEL[undertone]} undertone. Last one: what's the vibe you're going for?`,
      [
        btn("sd_fin_everyday", "Everyday / Natural"),
        btn("sd_fin_glam", "Full Glam"),
      ]
    );
    return true;
  }

  // Q3 → finish → recommend
  if (state === "awaiting_finish") {
    let finish: "everyday" | "glam" | null = null;
    if (matches(r, "sd_fin_everyday", "everyday", "natural", "subtle", "1")) finish = "everyday";
    else if (matches(r, "sd_fin_glam", "glam", "full", "bold", "2")) finish = "glam";

    if (!finish) {
      await sendButtons(contact, orgId, "Pick the look you reach for most 💄", [
        btn("sd_fin_everyday", "Everyday / Natural"),
        btn("sd_fin_glam", "Full Glam"),
      ]);
      return true;
    }

    const depth = (attrs.shade_finder_depth as Depth) ?? "medium";
    const undertone = (attrs.shade_finder_undertone as Undertone) ?? "neutral";
    const family = SHADE_FAMILIES[depth][undertone];
    const finishNote = shadeFinishNote(finish);

    await setAttrs(contact.id, {
      shade_finder_state: "offer_refine",
      shade_finder_finish: finish,
      shade_finder_result: family,
    });

    const voice = await getOrgBrandVoice(orgId);
    const product = (attrs.shade_finder_product as string) ?? null;
    const fallback =
      `Based on your ${DEPTH_LABEL[depth]} skin with ${UNDERTONE_LABEL[undertone]} undertones, your match is ${family}. ` +
      `For your ${finish === "glam" ? "glam" : "everyday"} look, ${finishNote}. You're going to love how it sits on you 💛`;

    const msg = await personalize({
      voice,
      customerName: contact.name && contact.name !== contact.phone ? contact.name : null,
      productContext: product,
      summary: `${DEPTH_LABEL[depth]} skin, ${UNDERTONE_LABEL[undertone]} undertone, prefers a ${finish} look`,
      recommendation: `${family}; tip: ${finishNote}`,
      fallback,
    });

    await send(contact, orgId, msg);
    await sendButtons(
      contact,
      orgId,
      `Want me to fine-tune the exact formula for your skin type?`,
      [
        btn("sd_refine_yes", "Yes, tailor it"),
        btn("sd_refine_no", "I'm all set"),
      ]
    );
    return true;
  }

  // Optional refine — offer skin-type question
  if (state === "offer_refine") {
    if (matches(r, "sd_refine_no", "no", "set", "good", "all set", "done")) {
      await setAttrs(contact.id, { shade_finder_state: "done", shade_finder_product: null });
      await send(contact, orgId, "Perfect — happy shopping! Message me anytime if you want a second opinion 💛");
      return true;
    }
    if (matches(r, "sd_refine_yes", "yes", "tailor", "sure", "ok", "okay")) {
      await setAttrs(contact.id, { shade_finder_state: "awaiting_skintype" });
      await sendButtons(contact, orgId, "Love it — how does your skin usually behave?", [
        btn("sd_skin_oily", "Oily / Shiny"),
        btn("sd_skin_dry", "Dry / Tight"),
        btn("sd_skin_combo", "Combination"),
      ]);
      return true;
    }
    // unclear → re-offer
    await sendButtons(contact, orgId, "Shall I tailor the formula to your skin type?", [
      btn("sd_refine_yes", "Yes, tailor it"),
      btn("sd_refine_no", "I'm all set"),
    ]);
    return true;
  }

  // Refine → skin type → final formula note
  if (state === "awaiting_skintype") {
    let skinType: "oily" | "dry" | "combo" | null = null;
    if (matches(r, "sd_skin_oily", "oily", "shiny", "1")) skinType = "oily";
    else if (matches(r, "sd_skin_dry", "dry", "tight", "2")) skinType = "dry";
    else if (matches(r, "sd_skin_combo", "combination", "combo", "both", "3")) skinType = "combo";

    if (!skinType) {
      await sendButtons(contact, orgId, "Just tap the closest one 💛", [
        btn("sd_skin_oily", "Oily / Shiny"),
        btn("sd_skin_dry", "Dry / Tight"),
        btn("sd_skin_combo", "Combination"),
      ]);
      return true;
    }

    const family = (attrs.shade_finder_result as string) ?? "your matched shade";
    const formula =
      skinType === "oily"
        ? "go for a matte / oil-control formula so it stays put all day"
        : skinType === "dry"
          ? "pick a hydrating / dewy formula so it never looks patchy"
          : "a natural satin finish balances your T-zone beautifully";

    await setAttrs(contact.id, {
      shade_finder_state: "done",
      shade_finder_skintype: skinType,
      shade_finder_product: null,
    });

    const voice = await getOrgBrandVoice(orgId);
    const product = (attrs.shade_finder_product as string) ?? null;
    const fallback = `Perfect — with ${skinType === "combo" ? "combination" : skinType} skin, ${formula}. Paired with ${family}, that's your dream combo. Go treat yourself 💛`;

    const msg = await personalize({
      voice,
      customerName: contact.name && contact.name !== contact.phone ? contact.name : null,
      productContext: product,
      summary: `${skinType} skin; already matched to ${family}`,
      recommendation: `formula tip: ${formula}; shade: ${family}`,
      fallback,
    });

    await send(contact, orgId, msg);
    return true;
  }

  return false;
}

// ════════════════════════════════════════════════════════════════════════════
//  SIZE FINDER
// ════════════════════════════════════════════════════════════════════════════
//
//  No height/weight interrogation. We anchor on a size the customer already
//  knows fits them ("what do you usually wear?") — the True-Fit approach — then
//  adjust by garment type and how they like things to fit.
//
//  Q1 garment category (top / bottom / outer-or-ethnic)
//  Q2 the size that usually fits (typed: S/M/L… or "Zara M", "32 waist")
//  Q3 fit preference (snug / true-to-size / relaxed)

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/** Parse an anchor reply into a letter size or a numeric (waist) size. */
function parseAnchorSize(raw: string): { letter?: string; numeric?: number } | null {
  const s = raw.trim().toUpperCase();
  // letter sizes, also handles "ZARA M", "USUALLY L"
  const letter = s.match(/\b(XXXL|XXL|XL|XS|XXS|S|M|L)\b/);
  if (letter) return { letter: letter[1] };
  // numeric waist / EU size, e.g. "32", "30 waist", "size 38"
  const num = s.match(/\b(\d{2})\b/);
  if (num) {
    const n = parseInt(num[1], 10);
    if (n >= 24 && n <= 48) return { numeric: n };
  }
  return null;
}

function adjustLetter(letter: string, fit: "snug" | "true" | "relaxed", outer: boolean): string {
  let idx = SIZE_ORDER.indexOf(letter);
  if (idx < 0) return letter;
  if (fit === "snug") idx -= 1;
  else if (fit === "relaxed") idx += 1;
  if (outer && fit !== "snug") idx += 1; // outerwear/ethnic layers a touch roomier
  idx = Math.max(0, Math.min(SIZE_ORDER.length - 1, idx));
  return SIZE_ORDER[idx];
}

function adjustNumeric(n: number, fit: "snug" | "true" | "relaxed"): number {
  if (fit === "snug") return n - 1;
  if (fit === "relaxed") return n + 2;
  return n;
}

async function startSize(contact: Contact, orgId: string, product: string | null) {
  await setAttrs(contact.id, {
    size_finder_state: "awaiting_category",
    size_finder_product: product,
  });
  const name = contact.name && contact.name !== contact.phone ? `, ${contact.name.split(" ")[0]}` : "";
  await sendButtons(
    contact,
    orgId,
    `Let's nail your size${name}! 👗 No tape measure, promise — just 3 taps.\n\nWhat are you shopping for?`,
    [
      btn("sz_cat_top", "Top / Shirt / Dress"),
      btn("sz_cat_bottom", "Jeans / Trousers"),
      btn("sz_cat_outer", "Jacket / Ethnic"),
    ]
  );
}

export async function handleSizeFinderReply(
  text: string,
  contact: Contact,
  orgId: string
): Promise<boolean> {
  const attrs = (contact.attributes as Record<string, any>) ?? {};
  const state: string | undefined = attrs.size_finder_state;
  if (!state || state === "done") return false;

  const r = norm(text);

  // Q1 → category
  if (state === "awaiting_category") {
    let category: "top" | "bottom" | "outer" | null = null;
    if (matches(r, "sz_cat_top", "top", "shirt", "dress", "tee", "kurti", "1")) category = "top";
    else if (matches(r, "sz_cat_bottom", "jeans", "trouser", "trousers", "bottom", "pant", "pants", "skirt", "2")) category = "bottom";
    else if (matches(r, "sz_cat_outer", "jacket", "ethnic", "outer", "coat", "blazer", "3")) category = "outer";

    if (!category) {
      await sendButtons(contact, orgId, "Just tap what you're after 👕", [
        btn("sz_cat_top", "Top / Shirt / Dress"),
        btn("sz_cat_bottom", "Jeans / Trousers"),
        btn("sz_cat_outer", "Jacket / Ethnic"),
      ]);
      return true;
    }

    await setAttrs(contact.id, { size_finder_state: "awaiting_anchor", size_finder_category: category });
    await send(
      contact,
      orgId,
      `Great choice! Now the secret to a perfect fit 👇\n\nWhat size do you *usually* wear and love? You can tell me a size (S, M, L…) or even a brand that fits you well — like "Zara M" or "32 waist". Whatever you've got!`
    );
    return true;
  }

  // Q2 → anchor size (free text — the True-Fit anchor)
  if (state === "awaiting_anchor") {
    const parsed = parseAnchorSize(text);
    if (!parsed) {
      await send(
        contact,
        orgId,
        `No stress! Just type the size you reach for most — like *M*, *L*, or a number like *32*. If you're not sure, tell me a brand + size that fit you nicely 😊`
      );
      return true;
    }
    await setAttrs(contact.id, {
      size_finder_state: "awaiting_fit",
      size_finder_anchor_letter: parsed.letter ?? null,
      size_finder_anchor_numeric: parsed.numeric ?? null,
    });
    await sendButtons(contact, orgId, `Perfect. And how do you like things to fit?`, [
      btn("sz_fit_snug", "Snug / Fitted"),
      btn("sz_fit_true", "True to size"),
      btn("sz_fit_relaxed", "Relaxed / Roomy"),
    ]);
    return true;
  }

  // Q3 → fit preference → recommend
  if (state === "awaiting_fit") {
    let fit: "snug" | "true" | "relaxed" | null = null;
    if (matches(r, "sz_fit_snug", "snug", "fitted", "tight", "1")) fit = "snug";
    else if (matches(r, "sz_fit_true", "true", "regular", "standard", "2")) fit = "true";
    else if (matches(r, "sz_fit_relaxed", "relaxed", "roomy", "loose", "oversized", "3")) fit = "relaxed";

    if (!fit) {
      await sendButtons(contact, orgId, "How do you like your fit?", [
        btn("sz_fit_snug", "Snug / Fitted"),
        btn("sz_fit_true", "True to size"),
        btn("sz_fit_relaxed", "Relaxed / Roomy"),
      ]);
      return true;
    }

    const category = (attrs.size_finder_category as "top" | "bottom" | "outer") ?? "top";
    const anchorLetter = attrs.size_finder_anchor_letter as string | null;
    const anchorNumeric = attrs.size_finder_anchor_numeric as number | null;
    const outer = category === "outer";

    let result: string;
    let summary: string;
    if (anchorNumeric != null) {
      const n = adjustNumeric(anchorNumeric, fit);
      result = `size ${n} (waist)`;
      summary = `usually wears ${anchorNumeric}, wants a ${fit} fit on ${category}`;
    } else {
      const letter = adjustLetter(anchorLetter ?? "M", fit, outer);
      result = `size ${letter}`;
      summary = `usually wears ${anchorLetter ?? "M"}, wants a ${fit} fit on a ${category} item`;
    }

    const fitWord = fit === "snug" ? "fitted" : fit === "relaxed" ? "relaxed" : "true-to-size";

    await setAttrs(contact.id, {
      size_finder_state: "done",
      size_finder_fit: fit,
      size_finder_result: result,
      size_finder_product: null,
      size_finder_anchor_letter: null,
      size_finder_anchor_numeric: null,
    });

    const voice = await getOrgBrandVoice(orgId);
    const product = (attrs.size_finder_product as string) ?? null;
    const fallback = `Based on what fits you well and your love for a ${fitWord} fit, go with *${result}* with us. If you're between sizes on ${outer ? "outerwear" : "this one"}, size up for comfort. Happy shopping! 🛍️`;

    const msg = await personalize({
      voice,
      customerName: contact.name && contact.name !== contact.phone ? contact.name : null,
      productContext: product,
      summary,
      recommendation: `${result}; they like a ${fitWord} fit`,
      fallback,
    });

    await send(contact, orgId, msg);
    return true;
  }

  return false;
}

// ════════════════════════════════════════════════════════════════════════════
//  KEYWORD ENTRY  ("SHADE" / "SIZE" from a storefront deep link or chat)
// ════════════════════════════════════════════════════════════════════════════

const SHADE_KEYWORD = /^\s*(shade\b|find\s*(my)?\s*shade|shade\s*finder|colou?r\s*match)/i;
const SIZE_KEYWORD = /^\s*(size\b|find\s*(my)?\s*size|size\s*finder|fit\s*finder)/i;

/** Pull product context out of a deep-link payload like "SHADE: Velvet Lipstick". */
function extractProduct(text: string): string | null {
  const after = text.replace(/^[^:—\-]*[:—-]\s*/, "").trim();
  // if the split produced the same string (no separator) there's no product
  if (after && after.toLowerCase() !== text.trim().toLowerCase() && after.length <= 80) {
    return after;
  }
  return null;
}

/**
 * Customer-initiated entry. If the message starts a finder ("SHADE"/"SIZE") and
 * the customer is NOT already mid-flow, kick off the relevant finder. Returns
 * true when it consumed the message.
 *
 * Wire this into the inbound chain BEFORE the reply handlers above.
 */
export async function handleFinderKeyword(
  text: string,
  contact: Contact,
  orgId: string
): Promise<boolean> {
  const attrs = (contact.attributes as Record<string, any>) ?? {};
  // Don't hijack an in-progress flow — let the reply handlers own it.
  const shadeActive = attrs.shade_finder_state && attrs.shade_finder_state !== "done";
  const sizeActive = attrs.size_finder_state && attrs.size_finder_state !== "done";
  if (shadeActive || sizeActive) return false;

  if (SHADE_KEYWORD.test(text)) {
    await startShade(contact, orgId, extractProduct(text));
    return true;
  }
  if (SIZE_KEYWORD.test(text)) {
    await startSize(contact, orgId, extractProduct(text));
    return true;
  }
  return false;
}

// ── Storefront deep-link generator ────────────────────────────────────────────

/**
 * Build a click-to-WhatsApp deep link that pre-fills the finder keyword (and an
 * optional product name). When the customer taps it on the storefront and hits
 * send, the inbound webhook captures their phone number and handleFinderKeyword
 * starts the flow.
 */
export function buildFinderDeepLink(
  dialableNumber: string,
  kind: "shade" | "size",
  product?: string | null
): string {
  const keyword = kind === "shade" ? "SHADE" : "SIZE";
  const payload = product ? `${keyword}: ${product}` : keyword;
  const num = dialableNumber.replace(/\D/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(payload)}`;
}
