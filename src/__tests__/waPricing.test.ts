import { describe, it, expect } from "vitest";
import { priceFor } from "@/features/billing/services/waPricing";

describe("priceFor", () => {
  it("returns correct IN marketing price", () => {
    expect(priceFor("IN", "marketing")).toBe(88);
  });

  it("returns correct IN utility price", () => {
    expect(priceFor("IN", "utility")).toBe(16);
  });

  it("returns correct IN authentication price", () => {
    expect(priceFor("IN", "authentication")).toBe(13);
  });

  it("returns 0 for service category (session messages are free)", () => {
    expect(priceFor("IN", "service")).toBe(0);
    expect(priceFor("US", "service")).toBe(0);
  });

  it("returns correct US marketing price", () => {
    expect(priceFor("US", "marketing")).toBe(2500);
  });

  it("falls back to DEFAULT pricing for unknown country", () => {
    expect(priceFor("ZZ", "marketing")).toBe(100);
    expect(priceFor("ZZ", "utility")).toBe(30);
  });

  it("is case-insensitive for country code", () => {
    expect(priceFor("in", "marketing")).toBe(88);
    expect(priceFor("In", "marketing")).toBe(88);
  });

  it("multiplies by units", () => {
    expect(priceFor("IN", "marketing", 3)).toBe(264);
    expect(priceFor("IN", "service", 10)).toBe(0);
  });
});
