/** UUID v4 pattern */
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Complete string → human label (case-insensitive key lookup) */
const EXACT: Record<string, string> = {
  appt_resched:    "Appointment Rescheduled",
  appt_cancel:     "Appointment Cancelled",
  appt_confirm:    "Appointment Confirmed",
  appt_no_show:    "Appointment — No Show",
  cart_abandoned:  "Cart Abandoned",
  cart_recovered:  "Cart Recovered",
  order_confirmed: "Order Confirmed",
  order_shipped:   "Order Shipped",
  order_delivered: "Order Delivered",
  payment_failed:  "Payment Failed",
  payment_success: "Payment Successful",
};

/** Prefix rules — checked in order, most-specific first */
const PREFIX: Array<[RegExp, string]> = [
  [/^appt_slot_/i, "User selected an appointment slot"],
  [/^appt_bk_/i,   "Appointment booking created"],
  [/^appt_/i,      "Appointment updated"],
  [/^cart_/i,      "Cart event recorded"],
  [/^order_/i,     "Order status updated"],
  [/^payment_/i,   "Payment event recorded"],
];

function titleCase(str: string): string {
  return str
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Converts raw system event strings (chatbot webhook payloads, activity log entries)
 * into human-readable labels.
 *
 * Resolution order:
 *   1. Exact match against known event codes (case-insensitive)
 *   2. Prefix match for parameterised events (e.g. appt_slot_<uuid>)
 *   3. UUID stripping + title-case fallback
 *   4. "System event" when nothing remains after stripping
 */
export function parseSystemEventString(eventString: string): string {
  if (typeof eventString !== "string") return "";
  const trimmed = eventString.trim();
  if (!trimmed) return "";

  // 1. Exact match
  const exact = EXACT[trimmed.toLowerCase()];
  if (exact) return exact;

  // 2. Prefix match
  for (const [re, label] of PREFIX) {
    if (re.test(trimmed)) return label;
  }

  // 3. Strip UUIDs and trailing separators, then title-case whatever remains
  const stripped = trimmed
    .replace(UUID_RE, "")
    .replace(/[_-]+$/g, "")
    .trim();

  if (!stripped) return "System event";

  const humanized = titleCase(stripped);
  return humanized || "System event";
}
