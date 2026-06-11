/**
 * catalog.ts — Declarative recipe definitions.
 *
 * Each recipe bundles the templates + sequence a use case needs so it installs
 * with one click. Constraints honored here (do not break them):
 *  - Triggers must actually fire somewhere in the codebase: `cart_abandoned`
 *    (Shopify webhook + marketplace sweep), `signup` and `ad_click` (inbound
 *    WhatsApp webhook).
 *  - `send_template` steps may only use template names the sequence engine
 *    knows how to parameterize (see executeStep): "cart_recovery" maps
 *    {{1}}=contact name, {{2}}=checkout URL.
 *  - `send_message` steps run inside the 24h session window (the engine
 *    promotes expired free-form sends to the cart_recovery template, which
 *    only makes sense for the cart recipe).
 */
import type { RecipeDefinition, RecipeId } from "../types";

export const RECIPE_CATALOG: Record<RecipeId, RecipeDefinition> = {
  abandoned_cart: {
    id: "abandoned_cart",
    title: "Abandoned Cart Recovery",
    tagline: "Win back shoppers who left without paying — typically recovers 10–15% of lost carts.",
    emoji: "🛒",
    firesWhen: "A Shopify or WhatsApp-catalog cart sits unpaid for ~1 hour.",
    category: "E-Commerce",
    templates: [
      {
        name: "cart_recovery",
        category: "Marketing",
        body: "Hi {{1}}, you left something behind! Your cart is still waiting for you. Complete your order here: {{2}}",
        buttons: [],
      },
    ],
    sequence: {
      name: "Abandoned Cart Recovery",
      trigger: "cart_abandoned",
      steps: [
        {
          order: 0,
          delayMinutes: 30,
          actionType: "send_message",
          message:
            "Hi {{contact.name}}, you still have items in your cart ({{cart.total}}). Complete your order here: {{cart.checkout_url}}",
        },
        {
          order: 1,
          delayMinutes: 1380, // ~23h later — engine falls back to the template outside the session
          actionType: "send_template",
          templateName: "cart_recovery",
        },
      ],
    },
  },

  welcome_flow: {
    id: "welcome_flow",
    title: "Instant Welcome",
    tagline: "Greet every new contact the moment they first message you — no one starts with silence.",
    emoji: "👋",
    firesWhen: "A brand-new contact sends their first WhatsApp message.",
    category: "Engagement",
    templates: [],
    sequence: {
      name: "Instant Welcome",
      trigger: "signup",
      steps: [
        {
          order: 0,
          delayMinutes: 1,
          actionType: "send_message",
          message:
            "Hey {{contact.name}}! 👋 Thanks for reaching out — you're through to the right place. Ask us anything, or just say what you're looking for and we'll point you in the right direction.",
        },
      ],
    },
  },

  ad_lead_nurture: {
    id: "ad_lead_nurture",
    title: "Ad Lead Follow-up",
    tagline: "Convert click-to-WhatsApp ad leads while they're hot, with an automatic two-touch follow-up.",
    emoji: "🎯",
    firesWhen: "A contact messages you from a click-to-WhatsApp ad.",
    category: "Lead Generation",
    templates: [],
    sequence: {
      name: "Ad Lead Follow-up",
      trigger: "ad_click",
      steps: [
        {
          order: 0,
          delayMinutes: 1,
          actionType: "send_message",
          message:
            "Hi {{contact.name}}, thanks for getting in touch from our ad! 🙌 Tell us what caught your eye and we'll get you everything you need.",
        },
        {
          order: 1,
          delayMinutes: 240, // 4h later — still inside the 24h session opened by their message
          actionType: "send_message",
          message:
            "Hi {{contact.name}}, just checking in — still curious about what you saw in our ad? Happy to answer any questions before you decide.",
        },
      ],
    },
  },

  order_confirmation: {
    id: "order_confirmation",
    title: "Order Confirmation",
    tagline: "Confirm every order instantly on WhatsApp — customers love the immediacy.",
    emoji: "📦",
    firesWhen: "A new order is placed via Shopify, WhatsApp catalog, or marketplace checkout.",
    category: "E-Commerce",
    templates: [
      {
        name: "order_confirmation",
        category: "Utility",
        body: "Hi {{1}}, your order of ₹{{2}} is confirmed! 🎉 We'll update you when it ships. Thank you for shopping with us.",
        buttons: [],
      },
    ],
    sequence: {
      name: "Order Confirmation",
      trigger: "order_placed",
      steps: [
        {
          order: 0,
          delayMinutes: 1,
          actionType: "send_template",
          templateName: "order_confirmation",
        },
      ],
    },
  },

  review_request: {
    id: "review_request",
    title: "Review Collector",
    tagline: "Ask happy customers for a review 3 days after their order — automate your social proof.",
    emoji: "⭐",
    firesWhen: "3 days after a new order is placed via any channel.",
    category: "Customer Success",
    templates: [
      {
        name: "review_request",
        category: "Marketing",
        body: "Hi {{1}}, how was your recent order? We'd love your feedback! Share a quick review and help others make great choices. 🌟",
        buttons: [],
      },
    ],
    sequence: {
      name: "Review Request",
      trigger: "order_placed",
      steps: [
        {
          order: 0,
          delayMinutes: 4320, // 3 days
          actionType: "send_template",
          templateName: "review_request",
        },
      ],
    },
  },

  win_back: {
    id: "win_back",
    title: "Win-Back Campaign",
    tagline: "Re-engage contacts who haven't heard from you in a while with a personalised offer.",
    emoji: "🔥",
    firesWhen: "A contact is tagged 'win-back' (manually or via a segment export).",
    category: "Retention",
    templates: [
      {
        name: "win_back",
        category: "Marketing",
        body: "Hi {{1}}, it's been a while! 👋 We've missed you. Here's something special to welcome you back — just reply to this message and we'll take care of the rest.",
        buttons: [],
      },
    ],
    sequence: {
      name: "Win-Back",
      trigger: "tag_added",
      triggerConfig: { tag: "win-back" },
      steps: [
        {
          order: 0,
          delayMinutes: 5,
          actionType: "send_template",
          templateName: "win_back",
        },
        {
          order: 1,
          delayMinutes: 2880, // 2 days later — last nudge
          actionType: "send_message",
          message:
            "Hi {{contact.name}}, just a friendly follow-up from us. Still interested? We'd love to hear from you. 😊",
        },
      ],
    },
  },
};

export const RECIPE_IDS = Object.keys(RECIPE_CATALOG) as RecipeId[];

export function isRecipeId(value: string): value is RecipeId {
  return value in RECIPE_CATALOG;
}
