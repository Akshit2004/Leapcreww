/**
 * Comparison page data. Competitor capabilities are summarized in good faith
 * from public information (June 2026) — every page carries a "verify on their
 * site" disclaimer. Keep claims about competitors conservative; oversell only
 * what we can demo.
 */

export type CellValue = "yes" | "partial" | "no" | string;

export interface ComparisonRow {
  feature: string;
  detail?: string;
  leapcrew: CellValue;
  competitor: CellValue;
}

export interface CompetitorPage {
  slug: string;
  name: string;
  /** One-line honest framing of who they are. */
  positioning: string;
  /** Our one-paragraph verdict — fair, not trash talk. */
  verdict: string;
  rows: ComparisonRow[];
  /** Honest reasons to pick THEM. Credibility section. */
  chooseThemIf: string[];
  chooseUsIf: string[];
}

const SHARED_LEAPCREW_ROWS: ComparisonRow[] = [];
void SHARED_LEAPCREW_ROWS;

export const COMPETITORS: Record<string, CompetitorPage> = {
  wati: {
    slug: "wati",
    name: "Wati",
    positioning:
      "A polished, well-funded WhatsApp platform serving SMBs across Southeast Asia and India.",
    verdict:
      "Wati is a mature, well-built product with one of the best UXs in the category. The differences come down to focus: Wati is built for global SMB support and sales chat; LeapCrew is built for Indian D2C revenue — COD, RTO, couriers, and rupee-level attribution are first-class citizens here, add-ons or absent there.",
    rows: [
      { feature: "Broadcasts & campaigns", leapcrew: "yes", competitor: "yes" },
      { feature: "Visual chatbot builder", leapcrew: "yes", competitor: "yes" },
      { feature: "Shared team inbox", leapcrew: "yes", competitor: "yes" },
      { feature: "Shopify integration", leapcrew: "yes", competitor: "yes" },
      { feature: "Rupee-level revenue attribution", detail: "every order tied to its source campaign", leapcrew: "yes", competitor: "no" },
      { feature: "COD confirmation flow", detail: "one-click recipe, no bot building", leapcrew: "yes", competitor: "partial" },
      { feature: "NDR / RTO rescue", detail: "courier-fail → WhatsApp intervention", leapcrew: "yes", competitor: "no" },
      { feature: "Shiprocket-native integration", leapcrew: "yes", competitor: "no" },
      { feature: "One-click automation recipes", detail: "17+ installable flows", leapcrew: "yes", competitor: "partial" },
      { feature: "Native AI autoresponder", detail: "LLM-powered, brand-aware", leapcrew: "yes", competitor: "partial" },
      { feature: "Developer platform", detail: "REST API + typed SDKs + MCP server", leapcrew: "yes", competitor: "partial" },
      { feature: "INR-first pricing", leapcrew: "₹1,499/mo entry", competitor: "USD pricing (~₹3,300+/mo)" },
      { feature: "Free trial", leapcrew: "14 days, no card", competitor: "7 days" },
    ],
    chooseThemIf: [
      "You operate across multiple countries and need a vendor with global support coverage",
      "You want the longest track record and a large support team behind the product",
      "Your primary use case is support/sales chat rather than commerce automation",
    ],
    chooseUsIf: [
      "You're an Indian D2C brand where COD and RTO eat your margins",
      "You want to know which campaign made which rupee — not just delivery rates",
      "You use Shiprocket and want delivery events to drive WhatsApp automatically",
      "You (or your agency) want to build on an API with typed SDKs and an MCP server",
    ],
  },

  interakt: {
    slug: "interakt",
    name: "Interakt",
    positioning:
      "Jio Haptik's WhatsApp platform — one of the longest-standing players in Indian D2C, with strong brand relationships.",
    verdict:
      "Interakt earned its place: solid fundamentals, Indian pricing, real D2C customer base, and Jio distribution behind it. What it doesn't have is the revenue layer — attribution stops at delivery metrics, and COD/NDR workflows need custom bot building. LeapCrew ships those as one-click recipes, and adds a developer platform Interakt has never offered.",
    rows: [
      { feature: "Broadcasts & campaigns", leapcrew: "yes", competitor: "yes" },
      { feature: "Visual chatbot builder", leapcrew: "yes", competitor: "yes" },
      { feature: "Shared team inbox", leapcrew: "yes", competitor: "yes" },
      { feature: "Shopify integration", leapcrew: "yes", competitor: "yes" },
      { feature: "INR pricing", leapcrew: "yes", competitor: "yes" },
      { feature: "Rupee-level revenue attribution", detail: "every order tied to its source campaign", leapcrew: "yes", competitor: "no" },
      { feature: "COD confirmation flow", detail: "one-click recipe, no bot building", leapcrew: "yes", competitor: "partial" },
      { feature: "NDR / RTO rescue", detail: "courier-fail → WhatsApp intervention", leapcrew: "yes", competitor: "no" },
      { feature: "Shiprocket-native integration", leapcrew: "yes", competitor: "partial" },
      { feature: "One-click automation recipes", detail: "17+ installable flows", leapcrew: "yes", competitor: "partial" },
      { feature: "Native AI autoresponder", detail: "LLM-powered, brand-aware", leapcrew: "yes", competitor: "partial" },
      { feature: "Developer platform", detail: "REST API + typed SDKs + MCP server", leapcrew: "yes", competitor: "no" },
      { feature: "Free trial", leapcrew: "14 days, no card", competitor: "14 days" },
    ],
    chooseThemIf: [
      "You want the safety of a Jio-backed vendor with years of operating history",
      "You're already deep in the Haptik/Jio ecosystem",
      "You prefer the vendor with the largest existing Indian D2C customer base",
    ],
    chooseUsIf: [
      "RTO and fake COD orders are a line item you can feel",
      "You want revenue attribution, not delivery dashboards",
      "You want automations live in an afternoon — recipes, not bot-building projects",
      "Your agency or dev team wants API/SDK/MCP access to build on",
    ],
  },

  aisensy: {
    slug: "aisensy",
    name: "AiSensy",
    positioning:
      "A bootstrapped, WhatsApp-native Indian platform with strong click-to-WhatsApp ads tooling and a large SMB user base.",
    verdict:
      "AiSensy is the volume leader in Indian WhatsApp marketing for a reason — accessible pricing, mature click-to-WhatsApp ads tooling, and years of trust. The gap is depth on the commerce side: attribution, COD confirmation, and courier-driven automation aren't what it was built for. LeapCrew was built for exactly that, with a developer platform on top.",
    rows: [
      { feature: "Broadcasts & campaigns", leapcrew: "yes", competitor: "yes" },
      { feature: "Visual chatbot builder", leapcrew: "yes", competitor: "yes" },
      { feature: "Shared team inbox", leapcrew: "yes", competitor: "yes" },
      { feature: "Click-to-WhatsApp ads tooling", leapcrew: "yes", competitor: "yes" },
      { feature: "INR pricing", leapcrew: "yes", competitor: "yes" },
      { feature: "Rupee-level revenue attribution", detail: "every order tied to its source campaign", leapcrew: "yes", competitor: "no" },
      { feature: "COD confirmation flow", detail: "one-click recipe, no bot building", leapcrew: "yes", competitor: "partial" },
      { feature: "NDR / RTO rescue", detail: "courier-fail → WhatsApp intervention", leapcrew: "yes", competitor: "no" },
      { feature: "Shiprocket-native integration", leapcrew: "yes", competitor: "partial" },
      { feature: "One-click automation recipes", detail: "17+ installable flows", leapcrew: "yes", competitor: "partial" },
      { feature: "Native AI autoresponder", detail: "LLM-powered, brand-aware", leapcrew: "yes", competitor: "partial" },
      { feature: "Native commerce checkout", detail: "catalog + Razorpay inside the chat", leapcrew: "yes", competitor: "partial" },
      { feature: "Developer platform", detail: "REST API + typed SDKs + MCP server", leapcrew: "yes", competitor: "no" },
    ],
    chooseThemIf: [
      "Click-to-WhatsApp ad campaigns are the core of your acquisition strategy",
      "You want the most battle-tested template library and community in India",
      "You're price-anchored to the lowest entry tier in the market",
    ],
    chooseUsIf: [
      "You sell on COD and RTO is quietly eating 20–30% of shipped value",
      "You want the WhatsApp channel measured in revenue, not read receipts",
      "You want post-purchase automation (shipping, NDR, reviews, replenishment) out of the box",
      "You want a platform your developers and agency can extend via API",
    ],
  },
};
