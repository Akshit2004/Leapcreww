/** Canonical intent identifiers for the AI Workspace.
 *  These map quick-start card clicks to pre-filled prompts so the
 *  workspace can auto-fire the right action without user re-typing.
 */
export type WorkspaceIntent =
  | "broadcast_campaign"
  | "cart_recovery"
  | "chatbot_flow"
  | "whatsapp_template"
  | "custom";

export interface WorkspaceParams {
  prompt: string;
  intent: WorkspaceIntent;
}

/** Maps intent keys → starter prompts sent to the AI on workspace mount. */
export const INTENT_PROMPTS: Record<WorkspaceIntent, string> = {
  broadcast_campaign: "Launch a broadcast campaign",
  cart_recovery:      "Automate cart recovery",
  chatbot_flow:       "Build a chatbot flow",
  whatsapp_template:  "Create a WhatsApp template",
  custom:             "",
};

const VALID_INTENTS = new Set<string>([
  "broadcast_campaign",
  "cart_recovery",
  "chatbot_flow",
  "whatsapp_template",
  "custom",
]);

function toIntent(raw: string | null): WorkspaceIntent {
  return raw && VALID_INTENTS.has(raw) ? (raw as WorkspaceIntent) : "custom";
}

/**
 * Builds the URL that navigates to the AI Workspace.
 * Uses the existing tab-based routing (e.g. `/org/[orgId]?tab=ai-workspace`).
 *
 * @param basePath  Path portion only (e.g. `/org/abc123`)
 * @param prompt    Free-text prompt entered by the user
 * @param intent    Optional structured intent for quick-start cards
 */
export function buildWorkspaceUrl(
  basePath: string,
  prompt: string,
  intent?: WorkspaceIntent
): string {
  const params = new URLSearchParams({ tab: "ai-workspace" });
  const trimmed = prompt.trim();
  if (trimmed) params.set("prompt", trimmed);
  if (intent && intent !== "custom") params.set("intent", intent);
  return `${basePath}?${params.toString()}`;
}

/**
 * Parses URL search params into typed workspace state.
 * Returns the effective prompt — preferring explicit `prompt` param over
 * the default prompt derived from `intent`.
 */
export function parseWorkspaceParams(
  searchParams: URLSearchParams | Record<string, string | null>
): WorkspaceParams {
  const get = (k: string) =>
    searchParams instanceof URLSearchParams
      ? searchParams.get(k)
      : searchParams[k] ?? null;

  const rawPrompt  = get("prompt") ?? "";
  const rawIntent  = get("intent") ?? "";
  const intent     = toIntent(rawIntent || null);

  // If there is no explicit prompt but there is an intent, use the intent's
  // default starter sentence so the workspace auto-fires.
  const prompt = rawPrompt.trim() || INTENT_PROMPTS[intent] || "";

  return { prompt, intent };
}
