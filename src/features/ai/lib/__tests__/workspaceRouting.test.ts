import { describe, it, expect } from "vitest";
import {
  buildWorkspaceUrl,
  parseWorkspaceParams,
  INTENT_PROMPTS,
  type WorkspaceIntent,
} from "../workspaceRouting";

// ─── buildWorkspaceUrl ────────────────────────────────────────────────────────

describe("buildWorkspaceUrl", () => {
  it("always includes tab=ai-workspace", () => {
    const url = buildWorkspaceUrl("/org/abc", "");
    expect(url).toContain("tab=ai-workspace");
  });

  it("includes encoded prompt when non-empty", () => {
    const url = buildWorkspaceUrl("/org/abc", "Launch a campaign");
    expect(url).toContain("prompt=Launch+a+campaign");
  });

  it("trims whitespace from prompt before encoding", () => {
    const url = buildWorkspaceUrl("/org/abc", "  hello  ");
    expect(url).toContain("prompt=hello");
    expect(url).not.toContain("  ");
  });

  it("omits prompt param when empty string", () => {
    const url = buildWorkspaceUrl("/org/abc", "");
    expect(url).not.toContain("prompt");
  });

  it("omits prompt param when whitespace-only", () => {
    const url = buildWorkspaceUrl("/org/abc", "   ");
    expect(url).not.toContain("prompt");
  });

  it("includes intent when non-custom", () => {
    const url = buildWorkspaceUrl("/org/abc", "hello", "broadcast_campaign");
    expect(url).toContain("intent=broadcast_campaign");
  });

  it("omits intent param when intent is 'custom'", () => {
    const url = buildWorkspaceUrl("/org/abc", "hello", "custom");
    expect(url).not.toContain("intent");
  });

  it("omits intent param when intent is undefined", () => {
    const url = buildWorkspaceUrl("/org/abc", "hello");
    expect(url).not.toContain("intent");
  });

  it("preserves basePath exactly", () => {
    const url = buildWorkspaceUrl("/org/xyz-123", "test");
    expect(url.startsWith("/org/xyz-123?")).toBe(true);
  });

  it("produces a valid query string structure", () => {
    const url = buildWorkspaceUrl("/org/abc", "hello", "cart_recovery");
    const [, qs] = url.split("?");
    const params = new URLSearchParams(qs);
    expect(params.get("tab")).toBe("ai-workspace");
    expect(params.get("prompt")).toBe("hello");
    expect(params.get("intent")).toBe("cart_recovery");
  });

  it.each([
    "broadcast_campaign",
    "cart_recovery",
    "chatbot_flow",
    "whatsapp_template",
  ] as WorkspaceIntent[])("includes intent=%s correctly", (intent) => {
    const url = buildWorkspaceUrl("/org/abc", "p", intent);
    expect(url).toContain(`intent=${intent}`);
  });
});

// ─── parseWorkspaceParams — URLSearchParams ───────────────────────────────────

describe("parseWorkspaceParams with URLSearchParams", () => {
  it("parses explicit prompt and intent", () => {
    const sp = new URLSearchParams("tab=ai-workspace&prompt=hello&intent=cart_recovery");
    const result = parseWorkspaceParams(sp);
    expect(result.prompt).toBe("hello");
    expect(result.intent).toBe("cart_recovery");
  });

  it("returns 'custom' intent when no intent param", () => {
    const sp = new URLSearchParams("prompt=hello");
    const { intent } = parseWorkspaceParams(sp);
    expect(intent).toBe("custom");
  });

  it("returns 'custom' intent for unknown intent value", () => {
    const sp = new URLSearchParams("intent=some_random_value");
    const { intent } = parseWorkspaceParams(sp);
    expect(intent).toBe("custom");
  });

  it("falls back to INTENT_PROMPTS when prompt is absent but intent is set", () => {
    const sp = new URLSearchParams("intent=broadcast_campaign");
    const { prompt } = parseWorkspaceParams(sp);
    expect(prompt).toBe(INTENT_PROMPTS.broadcast_campaign);
  });

  it("falls back to INTENT_PROMPTS when prompt is whitespace-only", () => {
    const sp = new URLSearchParams("intent=chatbot_flow&prompt=   ");
    const { prompt } = parseWorkspaceParams(sp);
    expect(prompt).toBe(INTENT_PROMPTS.chatbot_flow);
  });

  it("returns empty prompt for 'custom' intent with no prompt param", () => {
    const sp = new URLSearchParams("intent=custom");
    const { prompt } = parseWorkspaceParams(sp);
    expect(prompt).toBe("");
  });

  it("trims whitespace from prompt", () => {
    const sp = new URLSearchParams("prompt=+hello+");
    const { prompt } = parseWorkspaceParams(sp);
    expect(prompt).toBe("hello");
  });

  it("explicit prompt takes precedence over intent default", () => {
    const sp = new URLSearchParams("prompt=My+custom+prompt&intent=broadcast_campaign");
    const { prompt } = parseWorkspaceParams(sp);
    expect(prompt).toBe("My custom prompt");
    expect(prompt).not.toBe(INTENT_PROMPTS.broadcast_campaign);
  });

  it("validates all defined intent values", () => {
    const validIntents: WorkspaceIntent[] = [
      "broadcast_campaign",
      "cart_recovery",
      "chatbot_flow",
      "whatsapp_template",
      "custom",
    ];
    for (const intent of validIntents) {
      const sp = new URLSearchParams(`intent=${intent}`);
      expect(parseWorkspaceParams(sp).intent).toBe(intent);
    }
  });
});

// ─── parseWorkspaceParams — plain object ─────────────────────────────────────

describe("parseWorkspaceParams with plain object", () => {
  it("parses from a Record object", () => {
    const result = parseWorkspaceParams({ prompt: "test prompt", intent: "whatsapp_template" });
    expect(result.prompt).toBe("test prompt");
    expect(result.intent).toBe("whatsapp_template");
  });

  it("handles null values gracefully", () => {
    const result = parseWorkspaceParams({ prompt: null, intent: null });
    expect(result.prompt).toBe("");
    expect(result.intent).toBe("custom");
  });

  it("handles missing keys (undefined via type)", () => {
    const result = parseWorkspaceParams({} as Record<string, string | null>);
    expect(result.prompt).toBe("");
    expect(result.intent).toBe("custom");
  });

  it("falls back intent default prompt in record mode too", () => {
    const result = parseWorkspaceParams({ prompt: null, intent: "cart_recovery" });
    expect(result.prompt).toBe(INTENT_PROMPTS.cart_recovery);
  });

  it("rejects unknown intent in record mode", () => {
    const result = parseWorkspaceParams({ prompt: null, intent: "make_me_rich" });
    expect(result.intent).toBe("custom");
  });
});

// ─── INTENT_PROMPTS completeness ─────────────────────────────────────────────

describe("INTENT_PROMPTS", () => {
  it("has an entry for every WorkspaceIntent", () => {
    const expectedKeys: WorkspaceIntent[] = [
      "broadcast_campaign",
      "cart_recovery",
      "chatbot_flow",
      "whatsapp_template",
      "custom",
    ];
    for (const key of expectedKeys) {
      expect(Object.prototype.hasOwnProperty.call(INTENT_PROMPTS, key)).toBe(true);
    }
  });

  it("custom intent has empty starter prompt", () => {
    expect(INTENT_PROMPTS.custom).toBe("");
  });

  it("all non-custom intents have non-empty starter prompts", () => {
    const nonCustom: WorkspaceIntent[] = [
      "broadcast_campaign",
      "cart_recovery",
      "chatbot_flow",
      "whatsapp_template",
    ];
    for (const intent of nonCustom) {
      expect(INTENT_PROMPTS[intent].trim().length).toBeGreaterThan(0);
    }
  });
});

// ─── Round-trip: build → parse ────────────────────────────────────────────────

describe("round-trip: buildWorkspaceUrl → parseWorkspaceParams", () => {
  it("recovers prompt and intent after a round-trip", () => {
    const url = buildWorkspaceUrl("/org/abc", "Recover my cart sales", "cart_recovery");
    const [, qs] = url.split("?");
    const params = new URLSearchParams(qs);
    const result = parseWorkspaceParams(params);
    expect(result.prompt).toBe("Recover my cart sales");
    expect(result.intent).toBe("cart_recovery");
  });

  it("recovers prompt with no intent (defaults to custom)", () => {
    const url = buildWorkspaceUrl("/org/abc", "Do something creative");
    const [, qs] = url.split("?");
    const params = new URLSearchParams(qs);
    const result = parseWorkspaceParams(params);
    expect(result.prompt).toBe("Do something creative");
    expect(result.intent).toBe("custom");
  });

  it("auto-fills prompt from intent when prompt is absent in round-trip", () => {
    const url = buildWorkspaceUrl("/org/abc", "", "chatbot_flow");
    const [, qs] = url.split("?");
    const params = new URLSearchParams(qs);
    const result = parseWorkspaceParams(params);
    expect(result.prompt).toBe(INTENT_PROMPTS.chatbot_flow);
    expect(result.intent).toBe("chatbot_flow");
  });
});
