/**
 * widgetService.ts — Embeddable website chat-button widget.
 *
 * One config per org, lazily created on first settings load so the embed
 * snippet is available immediately ("one click" integration). The publicKey is
 * the only identifier customer websites ever see.
 */
import * as crypto from "crypto";
import { ApiError } from "@/shared/lib/api";
import * as repo from "../repositories/widgetRepo";
import type { PublicWidgetConfig, UpdateWidgetInput } from "../types";

const POSITIONS = new Set(["bottom-right", "bottom-left"]);

/** Return the org's widget config, creating one on first access. */
export async function getOrCreateConfig(organizationId: string) {
  const existing = await repo.findByOrg(organizationId);
  if (existing) return existing;
  const publicKey = `wfw_${crypto.randomBytes(16).toString("hex")}`;
  return repo.createForOrg(organizationId, publicKey);
}

export async function updateConfig(organizationId: string, input: UpdateWidgetInput) {
  if (input.position && !POSITIONS.has(input.position)) {
    throw new ApiError("position must be bottom-right or bottom-left", 400);
  }
  if (input.color && !/^#[0-9a-fA-F]{6}$/.test(input.color)) {
    throw new ApiError("color must be a hex value like #25D366", 400);
  }
  // Normalize to wa.me digits; tolerate "+91 98765-43210"-style input.
  if (input.phoneNumber !== undefined) {
    input.phoneNumber = input.phoneNumber.replace(/\D/g, "");
    if (input.phoneNumber && input.phoneNumber.length < 8) {
      throw new ApiError("phoneNumber must include the country code", 400);
    }
  }
  await getOrCreateConfig(organizationId); // ensure the row exists before update
  return repo.updateForOrg(organizationId, input);
}

/** Config as served to the embed script on third-party sites. */
export async function getPublicConfig(publicKey: string): Promise<PublicWidgetConfig> {
  const config = await repo.findByPublicKey(publicKey);
  if (!config) throw new ApiError("Unknown widget key", 404);
  return {
    enabled: config.enabled && Boolean(config.phoneNumber),
    phoneNumber: config.phoneNumber,
    position: config.position,
    color: config.color,
    greeting: config.greeting,
    prefilledText: config.prefilledText,
    showGreeting: config.showGreeting,
    brandName: config.organization.name,
  };
}

/** Click beacon from the embed script. Silently ignores unknown keys. */
export async function recordClick(publicKey: string) {
  const config = await repo.findByPublicKey(publicKey);
  if (!config) return;
  await repo.incrementClicks(publicKey);
}
