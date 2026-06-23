export interface CatalogStep {
  type: "send_template" | "add_tag" | "remove_tag";
  templateName?: string;
  templateParams?: string[];
  tag?: string;
  delayMinutes: number;
}

export interface CatalogAutomation {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  triggerType: "keyword" | "welcome" | "tag_added" | "button_reply";
  triggerConfig: Record<string, unknown>;
  steps: CatalogStep[];
}

export const AUTOMATION_CATALOG: CatalogAutomation[] = [
  // ── Basics ──────────────────────────────────────────────────────────────
  {
    id: "cat_welcome",
    title: "Welcome New Contact",
    description: "Greet every new contact instantly, then follow up with an offer 24 hours later.",
    emoji: "👋",
    category: "Basics",
    triggerType: "welcome",
    triggerConfig: {},
    steps: [
      { type: "send_template", templateName: "special_offer", templateParams: ["{{contact.name}}", "10%", "Welcome10"], delayMinutes: 0 },
      { type: "send_template", templateName: "survey_invitation", templateParams: ["{{contact.name}}", "your first experience with us"], delayMinutes: 1440 },
    ],
  },
  {
    id: "cat_help_keyword",
    title: "HELP / Support Reply",
    description: "Auto-reply when someone texts HELP, SUPPORT, or CONTACT with your support info.",
    emoji: "🆘",
    category: "Basics",
    triggerType: "keyword",
    triggerConfig: { keywords: ["HELP", "SUPPORT", "CONTACT", "ASSIST"], matchType: "exact" },
    steps: [
      { type: "send_template", templateName: "demo_scheduled", templateParams: ["{{contact.name}}", "Support", "today", "at your earliest convenience"], delayMinutes: 0 },
    ],
  },
  {
    id: "cat_optout",
    title: "Opt-Out (STOP)",
    description: "Tag contacts as opted-out when they text STOP or UNSUBSCRIBE.",
    emoji: "🚫",
    category: "Basics",
    triggerType: "keyword",
    triggerConfig: { keywords: ["STOP", "UNSUBSCRIBE", "CANCEL", "NO"], matchType: "exact" },
    steps: [
      { type: "add_tag", tag: "Opted-Out", delayMinutes: 0 },
    ],
  },
  {
    id: "cat_pricing",
    title: "Pricing Inquiry",
    description: "Instantly send pricing info when someone asks about price or cost.",
    emoji: "💬",
    category: "Basics",
    triggerType: "keyword",
    triggerConfig: { keywords: ["PRICE", "PRICING", "COST", "RATE", "QUOTE", "HOW MUCH"], matchType: "contains" },
    steps: [
      { type: "send_template", templateName: "price_drop_alert", templateParams: ["{{contact.name}}", "our product", "special"], delayMinutes: 0 },
    ],
  },
  // ── E-commerce ──────────────────────────────────────────────────────────
  {
    id: "cat_cart_recovery",
    title: "Abandoned Cart Recovery",
    description: "3-touch sequence: immediate nudge → price incentive at 1h → final review ask at 24h.",
    emoji: "🛒",
    category: "E-commerce",
    triggerType: "tag_added",
    triggerConfig: { tag: "WhatsApp-Cart" },
    steps: [
      { type: "send_template", templateName: "abandoned_checkout", templateParams: ["{{contact.name}}", "your cart"], delayMinutes: 0 },
      { type: "send_template", templateName: "price_drop_alert", templateParams: ["{{contact.name}}", "your selected items", "10%"], delayMinutes: 60 },
      { type: "send_template", templateName: "review_request", templateParams: ["{{contact.name}}", "your recent browse"], delayMinutes: 1440 },
    ],
  },
  {
    id: "cat_post_purchase",
    title: "Post-Purchase Follow-up",
    description: "Thank the buyer immediately, then request a review 48 hours later.",
    emoji: "📦",
    category: "E-commerce",
    triggerType: "tag_added",
    triggerConfig: { tag: "Order-Placed" },
    steps: [
      { type: "send_template", templateName: "delivery_scheduled", templateParams: ["{{contact.name}}", "your order", "within 3-5 business days", "9am – 6pm"], delayMinutes: 0 },
      { type: "send_template", templateName: "review_request", templateParams: ["{{contact.name}}", "your recent purchase"], delayMinutes: 2880 },
    ],
  },
  {
    id: "cat_loyalty_reward",
    title: "VIP Loyalty Reward",
    description: "Instantly reward contacts tagged as VIP with their loyalty points balance.",
    emoji: "🏆",
    category: "E-commerce",
    triggerType: "tag_added",
    triggerConfig: { tag: "VIP" },
    steps: [
      { type: "send_template", templateName: "loyalty_points_earned", templateParams: ["{{contact.name}}", "500", "2,500"], delayMinutes: 0 },
    ],
  },
  {
    id: "cat_winback",
    title: "Win-Back Inactive",
    description: "Re-engage dormant customers with a special offer, followed by a survey after 2 days.",
    emoji: "💤",
    category: "E-commerce",
    triggerType: "tag_added",
    triggerConfig: { tag: "Inactive" },
    steps: [
      { type: "send_template", templateName: "special_offer", templateParams: ["{{contact.name}}", "20%", "WINBACK20"], delayMinutes: 0 },
      { type: "send_template", templateName: "survey_invitation", templateParams: ["{{contact.name}}", "what we can do better"], delayMinutes: 2880 },
    ],
  },
  {
    id: "cat_review_request",
    title: "Review Request",
    description: "Ask for a review when an order is delivered.",
    emoji: "⭐",
    category: "E-commerce",
    triggerType: "tag_added",
    triggerConfig: { tag: "Order-Delivered" },
    steps: [
      { type: "send_template", templateName: "review_request", templateParams: ["{{contact.name}}", "your recent order"], delayMinutes: 0 },
      { type: "send_template", templateName: "loyalty_points_earned", templateParams: ["{{contact.name}}", "100", "your current balance"], delayMinutes: 1440 },
    ],
  },
  // ── Lead Generation ──────────────────────────────────────────────────────
  {
    id: "cat_lead_nurture",
    title: "New Lead Nurture",
    description: "3-touch nurture: welcome → demo offer at 24h → check-in survey at 3 days.",
    emoji: "🎯",
    category: "Lead Generation",
    triggerType: "welcome",
    triggerConfig: {},
    steps: [
      { type: "send_template", templateName: "account_verified", templateParams: ["{{contact.name}}", "our platform"], delayMinutes: 0 },
      { type: "send_template", templateName: "demo_scheduled", templateParams: ["{{contact.name}}", "our platform", "this week", "at a time that works for you"], delayMinutes: 1440 },
      { type: "send_template", templateName: "survey_invitation", templateParams: ["{{contact.name}}", "your needs"], delayMinutes: 4320 },
    ],
  },
  {
    id: "cat_demo_followup",
    title: "Demo Follow-up",
    description: "Confirm the demo immediately and send a meeting reminder 24 hours before.",
    emoji: "📅",
    category: "Lead Generation",
    triggerType: "tag_added",
    triggerConfig: { tag: "Demo-Requested" },
    steps: [
      { type: "send_template", templateName: "demo_scheduled", templateParams: ["{{contact.name}}", "our product", "soon", "at your convenience"], delayMinutes: 0 },
      { type: "send_template", templateName: "meeting_reminder", templateParams: ["{{contact.name}}", "our team", "your demo", "tomorrow"], delayMinutes: 1440 },
    ],
  },
  {
    id: "cat_referral",
    title: "Referral Request",
    description: "Ask happy customers (tagged Loyal) to refer a friend.",
    emoji: "🤝",
    category: "Lead Generation",
    triggerType: "tag_added",
    triggerConfig: { tag: "Loyal" },
    steps: [
      { type: "send_template", templateName: "survey_invitation", templateParams: ["{{contact.name}}", "our referral program"], delayMinutes: 0 },
    ],
  },
  // ── Finance ───────────────────────────────────────────────────────────────
  {
    id: "cat_payment_reminder",
    title: "Payment Reminder",
    description: "Remind customers of a due payment, then send a final notice 24h later.",
    emoji: "💳",
    category: "Finance",
    triggerType: "tag_added",
    triggerConfig: { tag: "Payment-Due" },
    steps: [
      { type: "send_template", templateName: "credit_card_due", templateParams: ["{{contact.name}}", "your outstanding balance", "within 3 days"], delayMinutes: 0 },
      { type: "send_template", templateName: "emi_reminder", templateParams: ["{{contact.name}}", "your EMI", "your account", "today"], delayMinutes: 1440 },
    ],
  },
  {
    id: "cat_investment_update",
    title: "Investment Portfolio Alert",
    description: "Notify investors when their portfolio is updated.",
    emoji: "📊",
    category: "Finance",
    triggerType: "tag_added",
    triggerConfig: { tag: "Investor" },
    steps: [
      { type: "send_template", templateName: "investment_update", templateParams: ["{{contact.name}}", "your portfolio", "up-to-date"], delayMinutes: 0 },
    ],
  },
  // ── Healthcare ────────────────────────────────────────────────────────────
  {
    id: "cat_appointment",
    title: "Appointment Confirmed",
    description: "Confirm the appointment immediately, then send a reminder 24h before.",
    emoji: "🏥",
    category: "Healthcare",
    triggerType: "tag_added",
    triggerConfig: { tag: "Appointment-Booked" },
    steps: [
      { type: "send_template", templateName: "doctor_appt_confirmed", templateParams: ["{{contact.name}}", "your doctor", "your appointment date", "your appointment time"], delayMinutes: 0 },
      { type: "send_template", templateName: "health_checkup_reminder", templateParams: ["{{contact.name}}", "our clinic"], delayMinutes: 1440 },
    ],
  },
  {
    id: "cat_prescription",
    title: "Prescription Ready",
    description: "Alert the patient when their prescription is ready for collection.",
    emoji: "💊",
    category: "Healthcare",
    triggerType: "tag_added",
    triggerConfig: { tag: "Prescription-Ready" },
    steps: [
      { type: "send_template", templateName: "prescription_ready", templateParams: ["{{contact.name}}", "your doctor", "our pharmacy", "6pm"], delayMinutes: 0 },
    ],
  },
  // ── HR ────────────────────────────────────────────────────────────────────
  {
    id: "cat_onboarding",
    title: "Employee Onboarding",
    description: "Send offer letter immediately, welcome on day 2, training reminder on day 3.",
    emoji: "👔",
    category: "HR",
    triggerType: "tag_added",
    triggerConfig: { tag: "New-Employee" },
    steps: [
      { type: "send_template", templateName: "offer_letter_sent", templateParams: ["{{contact.name}}", "your role", "our company"], delayMinutes: 0 },
      { type: "send_template", templateName: "onboarding_welcome", templateParams: ["{{contact.name}}", "our company", "Day 1", "9:00 AM"], delayMinutes: 1440 },
      { type: "send_template", templateName: "training_reminder", templateParams: ["{{contact.name}}", "your onboarding program", "Day 3", "10:00 AM"], delayMinutes: 2880 },
    ],
  },
  {
    id: "cat_payslip",
    title: "Payslip Notification",
    description: "Notify employees when their payslip is ready.",
    emoji: "📄",
    category: "HR",
    triggerType: "tag_added",
    triggerConfig: { tag: "Payslip-Ready" },
    steps: [
      { type: "send_template", templateName: "payslip_ready", templateParams: ["{{contact.name}}", "this month"], delayMinutes: 0 },
    ],
  },
  // ── Travel ───────────────────────────────────────────────────────────────
  {
    id: "cat_travel_booking",
    title: "Travel Booking Confirmation",
    description: "Confirm the booking instantly, then send a check-in reminder before departure.",
    emoji: "✈️",
    category: "Travel",
    triggerType: "tag_added",
    triggerConfig: { tag: "Travel-Booked" },
    steps: [
      { type: "send_template", templateName: "travel_package_confirmed", templateParams: ["{{contact.name}}", "your destination", "your departure date", "your return date"], delayMinutes: 0 },
      { type: "send_template", templateName: "check_in_reminder", templateParams: ["{{contact.name}}", "your hotel", "check-in time"], delayMinutes: 1440 },
    ],
  },
  // ── Real Estate ───────────────────────────────────────────────────────────
  {
    id: "cat_property_visit",
    title: "Property Visit Confirmation",
    description: "Confirm the site visit and send directions automatically.",
    emoji: "🏠",
    category: "Real Estate",
    triggerType: "tag_added",
    triggerConfig: { tag: "Property-Visit" },
    steps: [
      { type: "send_template", templateName: "property_visit_confirmed", templateParams: ["{{contact.name}}", "the property", "your visit date", "your visit time"], delayMinutes: 0 },
    ],
  },
];

export const CATALOG_CATEGORIES = [...new Set(AUTOMATION_CATALOG.map((a) => a.category))];
