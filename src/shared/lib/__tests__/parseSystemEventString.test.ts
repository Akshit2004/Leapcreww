import { describe, it, expect } from "vitest";
import { parseSystemEventString } from "../parseSystemEventString";

// ─── Exact event code mappings ─────────────────────────────────────────────────

describe("exact event code mappings", () => {
  it.each([
    ["appt_resched",    "Appointment Rescheduled"],
    ["appt_cancel",     "Appointment Cancelled"],
    ["appt_confirm",    "Appointment Confirmed"],
    ["appt_no_show",    "Appointment — No Show"],
    ["cart_abandoned",  "Cart Abandoned"],
    ["cart_recovered",  "Cart Recovered"],
    ["order_confirmed", "Order Confirmed"],
    ["order_shipped",   "Order Shipped"],
    ["order_delivered", "Order Delivered"],
    ["payment_failed",  "Payment Failed"],
    ["payment_success", "Payment Successful"],
  ])('maps "%s" → "%s"', (input, expected) => {
    expect(parseSystemEventString(input)).toBe(expected);
  });

  it("is case-insensitive for exact codes", () => {
    expect(parseSystemEventString("APPT_RESCHED")).toBe("Appointment Rescheduled");
    expect(parseSystemEventString("Cart_Abandoned")).toBe("Cart Abandoned");
    expect(parseSystemEventString("ORDER_SHIPPED")).toBe("Order Shipped");
  });

  it("trims whitespace before matching exact codes", () => {
    expect(parseSystemEventString("  appt_resched  ")).toBe("Appointment Rescheduled");
  });
});

// ─── UUID-parameterised prefix mappings ────────────────────────────────────────

const SAMPLE_UUID = "7455303a-fee7-4ecf-8f09-2e58d36bcf7f";
const SAMPLE_UUID_2 = "0b148ba1-851c-4749-b96f-84435c9e083b";

describe("UUID-parameterised prefix mappings", () => {
  it('maps appt_slot_<uuid> → "User selected an appointment slot"', () => {
    expect(parseSystemEventString(`appt_slot_${SAMPLE_UUID}`)).toBe(
      "User selected an appointment slot"
    );
  });

  it('maps appt_bk_<uuid> → "Appointment booking created"', () => {
    expect(parseSystemEventString(`appt_bk_${SAMPLE_UUID_2}`)).toBe(
      "Appointment booking created"
    );
  });

  it('maps appt_<unknown_suffix> → "Appointment updated"', () => {
    expect(parseSystemEventString("appt_some_other_action")).toBe("Appointment updated");
  });

  it('maps cart_<unknown_suffix> → "Cart event recorded"', () => {
    expect(parseSystemEventString("cart_checkout_started")).toBe("Cart event recorded");
  });

  it('maps order_<unknown_suffix> → "Order status updated"', () => {
    expect(parseSystemEventString("order_refunded")).toBe("Order status updated");
  });

  it('maps payment_<unknown_suffix> → "Payment event recorded"', () => {
    expect(parseSystemEventString("payment_pending")).toBe("Payment event recorded");
  });

  it("prefix matching is case-insensitive", () => {
    expect(parseSystemEventString(`APPT_SLOT_${SAMPLE_UUID}`)).toBe(
      "User selected an appointment slot"
    );
    expect(parseSystemEventString(`APPT_BK_${SAMPLE_UUID_2}`)).toBe(
      "Appointment booking created"
    );
  });

  it("most-specific prefix wins over generic prefix", () => {
    // appt_slot_ must win over appt_
    expect(parseSystemEventString(`appt_slot_${SAMPLE_UUID}`)).toBe(
      "User selected an appointment slot"
    );
    // appt_bk_ must win over appt_
    expect(parseSystemEventString(`appt_bk_${SAMPLE_UUID}`)).toBe(
      "Appointment booking created"
    );
  });
});

// ─── UUID stripping fallback ────────────────────────────────────────────────────

describe("UUID stripping fallback", () => {
  it('returns "System event" for a bare UUID', () => {
    expect(parseSystemEventString(SAMPLE_UUID)).toBe("System event");
  });

  it('returns "System event" when only UUIDs and separators remain', () => {
    expect(parseSystemEventString(`${SAMPLE_UUID}-${SAMPLE_UUID_2}`)).toBe("System event");
  });

  it("strips UUID and title-cases the remaining label", () => {
    expect(parseSystemEventString(`user_action_${SAMPLE_UUID}`)).toBe("User Action");
  });

  it("handles multiple UUIDs in one string", () => {
    expect(parseSystemEventString(`flow_step_${SAMPLE_UUID}_next_${SAMPLE_UUID_2}`)).toBe(
      "Flow Step Next"
    );
  });

  it("converts underscores to spaces and title-cases unknown keys", () => {
    expect(parseSystemEventString("user_signed_up")).toBe("User Signed Up");
  });

  it("converts hyphens to spaces in unknown strings", () => {
    expect(parseSystemEventString("some-webhook-event")).toBe("Some Webhook Event");
  });
});

// ─── Malformed / edge cases ─────────────────────────────────────────────────────

describe("malformed and edge cases", () => {
  it("returns empty string for an empty string", () => {
    expect(parseSystemEventString("")).toBe("");
  });

  it("returns empty string for whitespace-only string", () => {
    expect(parseSystemEventString("   ")).toBe("");
  });

  it("returns empty string for null input", () => {
    expect(parseSystemEventString(null as unknown as string)).toBe("");
  });

  it("returns empty string for undefined input", () => {
    expect(parseSystemEventString(undefined as unknown as string)).toBe("");
  });

  it("returns empty string for numeric input", () => {
    expect(parseSystemEventString(42 as unknown as string)).toBe("");
  });

  it("returns empty string for object input", () => {
    expect(parseSystemEventString({} as unknown as string)).toBe("");
  });

  it('returns "System event" for a string containing only separators', () => {
    expect(parseSystemEventString("___---___")).toBe("System event");
  });

  it("handles a malformed UUID (too short) as a regular string", () => {
    // Not a valid UUID pattern — should title-case as-is
    const result = parseSystemEventString("appt_bk_not-a-real-uuid");
    expect(result).not.toBe("");
    expect(typeof result).toBe("string");
  });

  it("handles very long unknown strings without throwing", () => {
    const long = "x_".repeat(500);
    expect(() => parseSystemEventString(long)).not.toThrow();
  });

  it("collapses repeated separators into a single space", () => {
    expect(parseSystemEventString("foo___bar---baz")).toBe("Foo Bar Baz");
  });
});
