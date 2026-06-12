import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const KEY_HEX = process.env.ENCRYPTION_KEY || "";

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    // In dev without a key, return a zero-key (no-op encryption)
    return Buffer.alloc(32, 0);
  }
  return Buffer.from(KEY_HEX, "hex");
}

/** Encrypt a plaintext string. Returns "iv:ciphertext:tag" in hex. */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
}

/** Decrypt a value produced by encrypt(). Returns null if value is null/empty. */
export function decrypt(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.includes(":")) return value; // legacy unencrypted value, return as-is
  try {
    const [ivHex, encHex, tagHex] = value.split(":");
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
  } catch {
    return value; // fallback for legacy unencrypted values
  }
}
