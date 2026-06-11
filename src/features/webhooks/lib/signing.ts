/**
 * Outbound webhook signing utilities.
 * Extracted here so they can be unit-tested without the delivery infrastructure.
 */
import * as crypto from "crypto";

/** Produce the `sha256=<hmac>` header value for a given secret + body. */
export function sign(secret: string, body: string): string {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
}

/** Constant-time check: does `signature` match sign(secret, body)? */
export function verify(signature: string, secret: string, body: string): boolean {
  const expected = sign(secret, body);
  const normalised = signature.startsWith("sha256=") ? signature : `sha256=${signature}`;
  if (normalised.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(normalised), Buffer.from(expected));
}
