const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 500;

export interface GroqTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface GroqToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface GroqMessage {
  role: string;
  content: string | null;
  tool_calls?: GroqToolCall[];
}

interface GroqCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  tools?: GroqTool[];
  toolChoice?: "auto" | "none" | "required";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGroq(
  messages: { role: string; content: string }[],
  options: GroqCompletionOptions = {}
): Promise<GroqMessage> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Groq API key not configured (missing GROQ_API_KEY environment variable)");
  }

  const body: Record<string, unknown> = {
    model: options.model || DEFAULT_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
  };
  if (options.jsonMode) {
    body.response_format = { type: "json_object" };
  }
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = options.toolChoice ?? "auto";
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.error?.message || `Groq API call failed with status ${response.status}`;
        // Retry on rate limiting / transient server errors only
        if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
          lastError = new Error(message);
          await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        throw new Error(message);
      }

      const data = await response.json();
      const message: GroqMessage | undefined = data.choices?.[0]?.message;
      return message || { role: "assistant", content: "" };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Groq API call failed");
}

/**
 * Returns just the text content of the model's reply. Retries on rate limits/5xx.
 */
export async function getGroqChatCompletion(
  messages: { role: string; content: string }[],
  modelOverride?: string,
  options?: Omit<GroqCompletionOptions, "model" | "tools" | "toolChoice">
): Promise<string> {
  const message = await callGroq(messages, { ...options, model: modelOverride });
  return message.content || "";
}

/**
 * Try `preferredModel` first; if it hits a daily/token rate limit (429 with
 * "tokens per day" in the error message) fall back to `fallbackModel`.
 * Use this for quality-sensitive calls where 70b is preferred but 8b is
 * acceptable when the daily quota is exhausted.
 */
export async function getGroqChatCompletionWithFallback(
  messages: { role: string; content: string }[],
  preferredModel: string,
  fallbackModel: string,
  options?: Omit<GroqCompletionOptions, "model" | "tools" | "toolChoice">
): Promise<string> {
  try {
    return await getGroqChatCompletion(messages, preferredModel, options);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Only fall back on daily token quota errors — not on auth/bad-request errors
    if (msg.includes("tokens per day") || msg.includes("TPD") || msg.includes("Rate limit reached")) {
      console.warn(`[groq] ${preferredModel} daily limit hit — falling back to ${fallbackModel}`);
      return await getGroqChatCompletion(messages, fallbackModel, options);
    }
    throw err;
  }
}

/**
 * Returns the full assistant message (content + tool_calls) so callers can
 * implement tool-calling / function-calling flows.
 */
export async function getGroqChatCompletionWithTools(
  messages: { role: string; content: string }[],
  options: GroqCompletionOptions = {}
): Promise<GroqMessage> {
  return callGroq(messages, options);
}
