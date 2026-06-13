import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const KEY_HEX = process.env.INTEGRATION_TOKEN_KEY || process.env.SHOPIFY_TOKEN_KEY || "";

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    // In dev without a key, return a zero-key (no-op encryption)
    return Buffer.alloc(32, 0);
  }
  return Buffer.from(KEY_HEX, "hex");
}

/** Encrypt a plaintext string. Returns "enc:iv:tag:ciphertext" in hex. */
export function encryptSecret(plaintext: string): string {
  const keyHex = process.env.INTEGRATION_TOKEN_KEY || process.env.SHOPIFY_TOKEN_KEY;
  if (!keyHex) return plaintext; // dev fallback
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Decrypt a value produced by encryptSecret(). */
export function decryptSecret(value: string): string {
  if (!value.startsWith("enc:")) {
    throw new Error("Invalid encrypted format");
  }
  const parts = value.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted format");
  }
  const [, ivHex, tagHex, encHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}

/** Decrypt a value, falling back to returning it as-is (plaintext) on any failure or if not prefixed with "enc:". */
export function decryptSecretSafe(value: string | null | undefined): string {
  if (!value) return "";
  if (!value.startsWith("enc:")) {
    return value; // legacy plaintext
  }
  try {
    return decryptSecret(value);
  } catch (err) {
    console.warn("[crypto] Failed to decrypt secret, returning as-is:", err);
    return value;
  }
}
