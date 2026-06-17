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
    tagline: "AI-personalised 4-touch recovery ladder — image opener, social proof, incentive, winback. Typically recovers 15–25% of lost carts.",
    emoji: "🛒",
    firesWhen: "A Shopify or WhatsApp-catalog cart sits unpaid for ~30 minutes.",
    category: "E-Commerce",
    templates: [
      // ── Touch 1: Personalised image opener (no discount) ────────────────────
      {
        name: "cr_t1_new",
        category: "Marketing",
        body: "Hi {{1}} 👋 You were just looking at the {{2}} — still in your size. Want me to hold it before it sells out? 🖤",
        buttons: ["Hold it ✋", "Complete order"],
      },
      {
        name: "cr_t1_repeat",
        category: "Marketing",
        body: "Hey {{1}}, welcome back! 🙌 Spotted you checking out the {{2}} again. Shall I set one aside for you?",
        buttons: ["Yes, hold it", "Complete order"],
      },
      {
        name: "cr_t1_highvalue",
        category: "Marketing",
        body: "Hi {{1}}, I noticed you were considering the {{2}}. Happy to answer any questions before you decide — no rush at all. 😊",
        buttons: ["I have a question", "View order"],
      },
      {
        name: "cr_t1_generic",
        category: "Marketing",
        body: "Hi {{1}}, the {{2}} is still waiting in your cart. Shall I hold it for you?",
        buttons: ["Yes, hold it", "Complete order"],
      },
      // ── Touch 2: Social proof / objection pre-empt (still no discount) ──────
      {
        name: "cr_t2_proof",
        category: "Marketing",
        body: "Hi {{1}}, just checking in on the {{2}} 👀 It's been one of our top picks this week — a lot of customers are loving it. Still yours if you want it.",
        buttons: ["Tell me more", "Complete order"],
      },
      {
        name: "cr_t2_scarcity",
        category: "Marketing",
        body: "Hi {{1}}, a quick heads-up — the {{2}} is running low in your size. We can't guarantee it'll be available tomorrow. Want to lock it in?",
        buttons: ["Lock it in 🔒", "Complete order"],
      },
      {
        name: "cr_t2_fit",
        category: "Marketing",
        body: "Hi {{1}}, if you were wondering about fit — the {{2}} runs true to size, slim but not tight. Happy to help if you have any questions 🙌",
        buttons: ["I have a question", "Complete order"],
      },
      // ── Touch 3: Last-resort incentive ──────────────────────────────────────
      {
        name: "cr_t3_discount",
        category: "Marketing",
        body: "Hi {{1}}, your cart is about to expire 😢 We'd hate for you to miss the {{2}}. Here's a little something to help you decide: {{3}}",
        buttons: ["Claim offer"],
      },
      {
        name: "cr_t3_escalate",
        category: "Marketing",
        body: "Hi {{1}}, I noticed you haven't completed your order for the {{2}} yet. I'd love to connect you with one of our advisors — they can help you decide. Shall I?",
        buttons: ["Yes, connect me", "Complete order"],
      },
      // ── Reactive / utility ───────────────────────────────────────────────────
      {
        name: "cr_hold_confirm",
        category: "Utility",
        body: "Done! I've noted your interest in the {{2}}, {{1}} 😊 Your cart will be here when you're ready: {{3}}",
        buttons: ["Complete order"],
      },
      {
        name: "cr_winback_cold",
        category: "Marketing",
        body: "Hi {{1}}, last call for the {{2}} 👋 If the timing wasn't right, no worries at all — we'll be here whenever you're ready.",
        buttons: ["Shop now"],
      },
      // ── Beauty / Cosmetics ──────────────────────────────────────────────────
      {
        name: "cr_t1_beauty",
        category: "Marketing",
        body: "Hi {{1}} 💄 Your {{2}} is still waiting! Not sure about the shade? Our customers say it looks beautiful on all skin tones — and we offer easy exchanges.",
        buttons: ["Tell me more", "Complete order"],
      },
      {
        name: "cr_t2_replenishment",
        category: "Marketing",
        body: "Hi {{1}}, just so you know — the {{2}} typically lasts 3–4 weeks once you're in a routine. A lot of our customers reorder monthly 🌿 Still yours if you want it.",
        buttons: ["I have a question", "Complete order"],
      },
    ],
    sequence: {
      name: "Abandoned Cart Recovery",
      trigger: "cart_abandoned",
      steps: [
        {
          // T1 — 30 min: personalised image opener
          // In-session (rare): free-form warm nudge
          // Out-of-session: AI selector → cr_t1_{new|repeat|highvalue|generic}
          order: 0,
          delayMinutes: 30,
          actionType: "send_message",
          message:
            "Hi {{contact.name}} 👋 You left something in your cart — shall I hold it for you while you think it over? 🖤 {{cart.checkout_url}}",
        },
        {
          // T2 — 8 h: social proof or objection pre-empt
          // Out-of-session: AI selector → cr_t2_{proof|scarcity|fit}
          order: 1,
          delayMinutes: 480,
          actionType: "send_message",
          message:
            "Just checking in, {{contact.name}} 👀 Still interested? Your cart is still saved for you: {{cart.checkout_url}}",
        },
        {
          // T3 — 24 h: last-resort incentive (or human escalation for ₹5000+)
          // Out-of-session: AI selector → cr_t3_{discount|escalate}
          order: 2,
          delayMinutes: 1440,
          actionType: "send_message",
          message:
            "Last chance, {{contact.name}} — your cart is about to expire 😢 {{cart.checkout_url}}",
        },
        {
          // T4 — 48 h: graceful cold winback
          // Out-of-session: cr_winback_cold
          order: 3,
          delayMinutes: 2880,
          actionType: "send_message",
          message:
            "Hi {{contact.name}}, no pressure at all — whenever you're ready, we'll be here for you. 🙌",
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

  launch_waitlist: {
    id: "launch_waitlist",
    title: "Launch Waitlist",
    tagline: "Build hype and convert your waitlist into Day 1 buyers — fire automatically when a contact opts in.",
    emoji: "🚀",
    firesWhen: "A contact is tagged 'waitlist' (chatbot opt-in, landing page capture, or manual tag).",
    category: "Launches",
    templates: [
      {
        name: "launch_waitlist_confirm",
        category: "Utility",
        body: "Hi {{1}}, you're on the list! 🎉 We'll message you the moment it drops — you'll be first to know.",
        buttons: [],
      },
    ],
    sequence: {
      name: "Launch Waitlist",
      trigger: "tag_added",
      triggerConfig: { tag: "waitlist" },
      steps: [
        {
          order: 0,
          delayMinutes: 1,
          actionType: "send_template",
          templateName: "launch_waitlist_confirm",
        },
        {
          order: 1,
          delayMinutes: 1380, // ~23h — D-1 tease
          actionType: "send_message",
          message:
            "⏰ It's almost here, {{contact.name}}! The launch is tomorrow. Watch this space — you'll get the link before anyone else. 👀",
        },
        {
          order: 2,
          delayMinutes: 2820, // ~47h — launch moment nudge
          actionType: "send_message",
          message:
            "🛒 It's LIVE, {{contact.name}}! You're first in line — grab yours before it sells out. 🔥",
        },
      ],
    },
  },

  flash_sale_drop: {
    id: "flash_sale_drop",
    title: "Flash Sale Drop",
    tagline: "Fire an urgent 3-touch sequence the moment a flash sale starts — maximise sell-through in the first hour.",
    emoji: "⚡",
    firesWhen: "A contact is tagged 'flash-sale' (trigger via a campaign action or manually).",
    category: "Launches",
    templates: [
      {
        name: "flash_sale_alert",
        category: "Marketing",
        body: "⚡ Flash sale is LIVE, {{1}}! Everything is on sale right now — shop before it ends.",
        buttons: [],
      },
    ],
    sequence: {
      name: "Flash Sale Drop",
      trigger: "tag_added",
      triggerConfig: { tag: "flash-sale" },
      steps: [
        {
          order: 0,
          delayMinutes: 1,
          actionType: "send_template",
          templateName: "flash_sale_alert",
        },
        {
          order: 1,
          delayMinutes: 60,
          actionType: "send_message",
          message:
            "⏳ Still going, {{contact.name}}! Flash sale ends soon — last chance to save big. 🛒",
        },
        {
          order: 2,
          delayMinutes: 180,
          actionType: "send_message",
          message:
            "🚨 Final hour! The flash sale is almost over. Don't miss out, {{contact.name}}. 🔥",
        },
      ],
    },
  },

  ndr_recovery: {
    id: "ndr_recovery",
    title: "NDR Recovery",
    tagline: "Rescue failed deliveries via WhatsApp — reduce RTO by up to 40% with instant customer confirmation.",
    emoji: "📦",
    firesWhen: "A courier files an NDR (non-delivery report) for any order.",
    category: "Fulfillment",
    templates: [
      {
        name: "ndr_alert",
        category: "Utility",
        body: "Hi {{1}}, our courier attempted to deliver your order but couldn't reach you. Reply:\n1️⃣ CONFIRM — I'm available now\n2️⃣ RESCHEDULE — Choose another date\n3️⃣ ADDRESS — Update my address\n4️⃣ CANCEL — Cancel my order",
        buttons: [],
      },
    ],
    sequence: {
      name: "NDR Recovery",
      trigger: "ndr_pending",
      steps: [
        { order: 0, delayMinutes: 2, actionType: "send_template", templateName: "ndr_alert" },
        { order: 1, delayMinutes: 120, actionType: "send_message", message: "Hi {{contact.name}}, still waiting on your reply about the delivery attempt. Reply 1 to confirm availability, 2 to reschedule, or 3 to update address. We need to hear from you in the next few hours to attempt redelivery. 🚚" },
      ],
    },
  },

  cod_confirmation: {
    id: "cod_confirmation",
    title: "COD Order Confirmation",
    tagline: "Confirm COD orders instantly — cut fake orders and return-to-origin by up to 30%.",
    emoji: "💰",
    firesWhen: "A Cash on Delivery order is placed via Shopify or any connected store.",
    category: "E-Commerce",
    templates: [
      {
        name: "cod_confirmation",
        category: "Utility",
        body: "Hi {{1}}, your COD order #{{2}} for ₹{{3}} is placed! Reply YES to confirm or NO to cancel.",
        buttons: [],
      },
    ],
    sequence: {
      name: "COD Order Confirmation",
      trigger: "cod_order_placed",
      steps: [
        {
          order: 0,
          delayMinutes: 1,
          actionType: "send_template",
          templateName: "cod_confirmation",
        },
        {
          order: 1,
          delayMinutes: 120,
          actionType: "send_template",
          templateName: "cod_confirmation",
        },
      ],
    },
  },

  order_shipped_notification: {
    id: "order_shipped_notification",
    title: "Shipping Notification",
    tagline: "Notify customers the moment their order ships — with live tracking link.",
    emoji: "🚚",
    firesWhen: "Order is picked up and dispatched by the courier.",
    category: "Fulfillment",
    templates: [
      {
        name: "order_shipped",
        category: "Utility",
        body: "Hi {{1}}, your order is on its way! 🚚 Track it here: {{2}}",
        buttons: [],
      },
    ],
    sequence: {
      name: "Shipping Notification",
      trigger: "order_shipped",
      steps: [
        {
          order: 0,
          delayMinutes: 1,
          actionType: "send_template",
          templateName: "order_shipped",
        },
        {
          order: 1,
          delayMinutes: 1440,
          actionType: "send_message",
          message:
            "Hi {{contact.name}}, just checking in — your order is on its way and should arrive soon! 📦",
        },
      ],
    },
  },

  post_delivery_review: {
    id: "post_delivery_review",
    title: "Post-Delivery Review",
    tagline: "Ask for a review 3 days after confirmed delivery — get accurate, verified feedback.",
    emoji: "⭐",
    firesWhen: "Order is marked as delivered by the courier (Shiprocket or generic webhook).",
    category: "Customer Success",
    templates: [
      {
        name: "post_delivery_review",
        category: "Marketing",
        body: "Hi {{1}}, your order arrived! 🎉 How was your experience? A quick review would mean the world to us. 🌟",
        buttons: [],
      },
    ],
    sequence: {
      name: "Post-Delivery Review",
      trigger: "order_delivered",
      steps: [
        {
          order: 0,
          delayMinutes: 4320, // 3 days
          actionType: "send_template",
          templateName: "post_delivery_review",
        },
      ],
    },
  },
  size_finder: {
    id: "size_finder",
    title: "Size Finder Bot",
    tagline: "Help customers find their perfect size via WhatsApp — 3 questions, instant recommendation.",
    emoji: "📏",
    firesWhen: "A contact is tagged 'find-my-size' (e.g. from a chatbot button or campaign link).",
    category: "Personalisation",
    templates: [
      {
        name: "size_finder_start",
        category: "Utility",
        body: "Hi {{1}}, let's find your perfect fit! 👗 What are you shopping for?\n*1* Women  *2* Men  *3* Kids",
        buttons: [],
      },
    ],
    sequence: {
      name: "Size Finder",
      trigger: "tag_added",
      triggerConfig: { tag: "find-my-size" },
      steps: [
        {
          order: 0,
          delayMinutes: 1,
          actionType: "send_template",
          templateName: "size_finder_start",
        },
      ],
    },
  },

  shade_finder: {
    id: "shade_finder",
    title: "Shade Finder Bot",
    tagline: "Match customers to their ideal foundation & concealer shade in 2 questions — great for beauty brands.",
    emoji: "💄",
    firesWhen: "A contact is tagged 'find-my-shade' (e.g. from a chatbot button or product page QR).",
    category: "Personalisation",
    templates: [
      {
        name: "shade_finder_start",
        category: "Utility",
        body: "Hi {{1}}, let's find your perfect shade match! 💄 Rate your skin tone:\n*1* Fair  *2* Light  *3* Medium\n*4* Olive  *5* Dark  *6* Deep",
        buttons: [],
      },
    ],
    sequence: {
      name: "Shade Finder",
      trigger: "tag_added",
      triggerConfig: { tag: "find-my-shade" },
      steps: [
        {
          order: 0,
          delayMinutes: 1,
          actionType: "send_template",
          templateName: "shade_finder_start",
        },
      ],
    },
  },
  beauty_replenishment: {
    id: "beauty_replenishment",
    title: "Replenishment Reminder",
    tagline: "Remind customers to restock 30 days after delivery — convert loyal buyers on autopilot.",
    emoji: "🌿",
    firesWhen: "30 days after an order is confirmed as delivered by the courier.",
    category: "Retention",
    templates: [
      {
        name: "beauty_replenishment",
        category: "Utility",
        body: "Hi {{1}}, it's been about {{2}} days since your last order — time to restock! 🌿\n\nReply *REORDER* to get the same products delivered again, or *STOP* to skip reminders.",
        buttons: [],
      },
    ],
    sequence: {
      name: "Replenishment Reminder",
      trigger: "order_delivered",
      steps: [
        {
          order: 0,
          delayMinutes: 43200, // 30 days
          actionType: "send_template",
          templateName: "beauty_replenishment",
        },
        {
          order: 1,
          delayMinutes: 10080, // +7 days = 37 days after delivery
          actionType: "send_message",
          message:
            "Hey {{contact.name}}, just a final nudge — your restock reminder is still open! Reply *REORDER* and we'll take care of it. 💚",
        },
      ],
    },
  },
  address_verification: {
    id: "address_verification",
    title: "Address Verification",
    tagline: "Confirm delivery address within 15 minutes of order — prevent wrong-address NDRs before the courier picks up.",
    emoji: "🏠",
    firesWhen: "A new order is placed via Shopify or any connected store.",
    category: "Fulfillment",
    templates: [
      {
        name: "address_confirmation",
        category: "Utility",
        body: "Hi {{1}}, your order #{{2}} is being prepared 📦 Before we hand it to the courier, can you quickly confirm your delivery address is correct?\n\nReply *YES* to confirm or *NO* to update it.",
        buttons: [],
      },
    ],
    sequence: {
      name: "Address Verification",
      trigger: "order_placed",
      steps: [
        {
          order: 0,
          delayMinutes: 15,
          actionType: "send_template",
          templateName: "address_confirmation",
        },
      ],
    },
  },

  ofd_reminder: {
    id: "ofd_reminder",
    title: "Out-for-Delivery Alert",
    tagline: "Ping customers the moment their order leaves the hub — near-zero missed deliveries, near-zero 'not available' NDRs.",
    emoji: "🚚",
    firesWhen: "Shiprocket marks the shipment as Out for Delivery.",
    category: "Fulfillment",
    templates: [
      {
        name: "ofd_alert",
        category: "Utility",
        body: "Hi {{1}}, great news — your order is out for delivery today! 🛵 Our delivery partner will reach you between 10 AM – 7 PM.\n\nPlease keep your phone nearby and ensure someone is available. 😊",
        buttons: [],
      },
    ],
    sequence: {
      name: "OFD Alert",
      trigger: "order_out_for_delivery",
      steps: [
        {
          order: 0,
          delayMinutes: 1,
          actionType: "send_template",
          templateName: "ofd_alert",
        },
      ],
    },
  },

  rto_winback: {
    id: "rto_winback",
    title: "RTO Win-Back",
    tagline: "Convert an RTO from a loss to a second chance — understand why, fix the issue, and re-ship with confidence.",
    emoji: "📦",
    firesWhen: "Shiprocket marks an order as RTO Initiated.",
    category: "Fulfillment",
    templates: [
      {
        name: "rto_initiated",
        category: "Utility",
        body: "Hi {{1}}, we noticed your order couldn't be delivered and is heading back to us 😔 We'd love to get it to you — can you let us know what went wrong?\n\nReply:\n*1* Wrong address — I'll share the correct one\n*2* I wasn't available — please reship\n*3* I changed my mind — cancel the order",
        buttons: [],
      },
      {
        name: "ndr_alert_attempt2",
        category: "Utility",
        body: "Hi {{1}}, this is our second delivery attempt for your order 🚚 Our courier will try once more — please make sure someone is available today.\n\nReply *CONFIRM* to let us know you're ready, or *RESCHEDULE* to pick a new date.",
        buttons: [],
      },
    ],
    sequence: {
      name: "RTO Win-Back",
      trigger: "order_rto",
      steps: [
        {
          order: 0,
          delayMinutes: 5,
          actionType: "send_template",
          templateName: "rto_initiated",
        },
        {
          order: 1,
          delayMinutes: 2880, // 48h later — final check-in
          actionType: "send_message",
          message:
            "Hi {{contact.name}}, just following up — we'd still love to get your order to you! Reply *RESHIP* and we'll sort it out, or *CANCEL* to close the order. 😊",
        },
      ],
    },
  },

  cod_risk_verification: {
    id: "cod_risk_verification",
    title: "COD Risk Verification",
    tagline: "Catch fake COD orders before dispatch — send a verification ping to first-time buyers with large orders.",
    emoji: "💰",
    firesWhen: "A high-risk COD order is detected (first-time buyer + large cart value).",
    category: "E-Commerce",
    templates: [
      {
        name: "cod_risk_verify",
        category: "Utility",
        body: "Hi {{1}}, we want to make sure your COD order #{{2}} for ₹{{3}} reaches you safely 📦\n\nBefore we begin packing, can you confirm:\n*YES* — Please process my order\n*NO* — Cancel this order\n\nIf we don't hear back within 2 hours, we'll proceed with your order.",
        buttons: [],
      },
    ],
    sequence: {
      name: "COD Risk Verification",
      trigger: "cod_order_placed",
      steps: [
        {
          order: 0,
          delayMinutes: 2,
          actionType: "send_template",
          templateName: "cod_risk_verify",
        },
      ],
    },
  },
};

export const RECIPE_IDS = Object.keys(RECIPE_CATALOG) as RecipeId[];

export function isRecipeId(value: string): value is RecipeId {
  return value in RECIPE_CATALOG;
}
