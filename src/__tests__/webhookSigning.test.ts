import { describe, it, expect, beforeEach } from "vitest";
import * as crypto from "crypto";

// Inbound (Meta → LeapCreww)
import { validateWebhookSignature } from "@/shared/lib/whatsapp";

// Outbound (LeapCreww → subscriber)
import { sign, verify } from "@/features/webhooks/lib/signing";

const APP_SECRET = "test-app-secret-32chars-exactly!!";
const BODY = JSON.stringify({ hello: "world" });

function makeMetaSignature(secret: string, body: string) {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("Inbound HMAC — validateWebhookSignature", () => {
  beforeEach(() => {
    process.env.WHATSAPP_APP_SECRET = APP_SECRET;
  });

  it("accepts a valid signature", () => {
    const sig = makeMetaSignature(APP_SECRET, BODY);
    expect(validateWebhookSignature(sig, BODY)).toBe(true);
  });

  it("rejects a signature from the wrong secret", () => {
    const sig = makeMetaSignature("wrong-secret", BODY);
    expect(validateWebhookSignature(sig, BODY)).toBe(false);
  });

  it("rejects a tampered body", () => {
    const sig = makeMetaSignature(APP_SECRET, BODY);
    expect(validateWebhookSignature(sig, BODY + " tampered")).toBe(false);
  });

  it("rejects null signature", () => {
    expect(validateWebhookSignature(null, BODY)).toBe(false);
  });

  it("rejects empty string signature", () => {
    expect(validateWebhookSignature("", BODY)).toBe(false);
  });

  it("rejects when APP_SECRET is not configured", () => {
    delete process.env.WHATSAPP_APP_SECRET;
    const sig = makeMetaSignature(APP_SECRET, BODY);
    expect(validateWebhookSignature(sig, BODY)).toBe(false);
  });
});

describe("Outbound HMAC — sign + verify roundtrip", () => {
  const SECRET = "whsec_abc123supersecretsubscribersecret";

  it("sign produces sha256= prefix", () => {
    expect(sign(SECRET, BODY)).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it("same input always produces same signature (deterministic)", () => {
    expect(sign(SECRET, BODY)).toBe(sign(SECRET, BODY));
  });

  it("different secrets produce different signatures", () => {
    expect(sign(SECRET, BODY)).not.toBe(sign("other-secret", BODY));
  });

  it("different bodies produce different signatures", () => {
    expect(sign(SECRET, BODY)).not.toBe(sign(SECRET, BODY + "x"));
  });

  it("verify accepts correct signature", () => {
    const sig = sign(SECRET, BODY);
    expect(verify(sig, SECRET, BODY)).toBe(true);
  });

  it("verify rejects wrong secret", () => {
    const sig = sign(SECRET, BODY);
    expect(verify(sig, "wrong", BODY)).toBe(false);
  });

  it("verify rejects tampered body", () => {
    const sig = sign(SECRET, BODY);
    expect(verify(sig, SECRET, BODY + "!")).toBe(false);
  });

  it("verify accepts signature without sha256= prefix", () => {
    const raw = crypto.createHmac("sha256", SECRET).update(BODY).digest("hex");
    expect(verify(raw, SECRET, BODY)).toBe(true);
  });
});
