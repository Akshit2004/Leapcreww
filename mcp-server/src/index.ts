#!/usr/bin/env node
/**
 * WappFlow MCP Server
 * Gives AI agents access to WappFlow's WhatsApp messaging and CRM capabilities.
 *
 * Usage:
 *   WAPPFLOW_API_KEY=wf_live_... node dist/index.js
 *   # or
 *   npx @wappflow/mcp-server --api-key wf_live_...
 *
 * Configure in Claude Desktop (claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "wappflow": {
 *         "command": "npx",
 *         "args": ["@wappflow/mcp-server"],
 *         "env": { "WAPPFLOW_API_KEY": "wf_live_..." }
 *       }
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── Config ──────────────────────────────────────────────────────────────────

const apiKey = process.env.WAPPFLOW_API_KEY
  ?? process.argv.find((a) => a.startsWith("--api-key="))?.split("=")[1]
  ?? "";

if (!apiKey) {
  process.stderr.write("Error: WAPPFLOW_API_KEY environment variable is required.\n");
  process.exit(1);
}

const baseUrl = (
  process.env.WAPPFLOW_BASE_URL
  ?? process.argv.find((a) => a.startsWith("--base-url="))?.split("=")[1]
  ?? "https://app.wappflow.com"
).replace(/\/$/, "");

const apiBase = `${baseUrl}/api/v1`;

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function call<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  let url = `${apiBase}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const str = qs.toString();
    if (str) url += `?${str}`;
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`WappFlow API error ${res.status}: ${(err as { error?: string }).error ?? res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "wappflow",
  version: "0.1.0",
});

// Tool: send_message
server.tool(
  "send_message",
  "Send a WhatsApp message to a phone number. Use 'text' for a free-form message (requires active 24h session) or 'template' for an approved template broadcast.",
  {
    to: z.string().describe("Recipient phone number in E.164 format, e.g. +919876543210"),
    text: z.string().optional().describe("Free-form text message (24h window must be open)"),
    template: z.string().optional().describe("Approved template name, e.g. 'welcome_flow'"),
  },
  async ({ to, text, template }) => {
    if (!to) throw new Error("'to' is required");
    if (!text && !template) throw new Error("Either 'text' or 'template' is required");
    const result = await call<{ messageId: string; waMessageId: string | null }>(
      "POST", "/messages", { to, ...(text ? { text } : { template }) }
    );
    return {
      content: [{ type: "text" as const, text: `Message sent. ID: ${result.messageId}` }],
    };
  }
);

// Tool: upsert_contact
server.tool(
  "upsert_contact",
  "Create or update a CRM contact by phone number. Tags and attributes are merged, never replaced.",
  {
    phone: z.string().describe("E.164 phone number, e.g. +919876543210"),
    name: z.string().optional().describe("Contact full name"),
    email: z.string().optional().describe("Contact email address"),
    tags: z.array(z.string()).optional().describe("Tags to add to the contact"),
    attributes: z.record(z.unknown()).optional().describe("Custom key-value attributes"),
  },
  async (input) => {
    const contact = await call<{ id: string; name: string; phone: string }>(
      "POST", "/contacts", input
    );
    return {
      content: [{ type: "text" as const, text: `Contact saved: ${contact.name} (${contact.phone}) — ID ${contact.id}` }],
    };
  }
);

// Tool: list_contacts
server.tool(
  "list_contacts",
  "List or search CRM contacts. Returns up to 50 contacts by default.",
  {
    search: z.string().optional().describe("Filter by name or phone number"),
    tag: z.string().optional().describe("Filter by a specific tag"),
    limit: z.number().int().min(1).max(200).optional().default(20).describe("Max results (1–200)"),
  },
  async ({ search, tag, limit }) => {
    const result = await call<{ contacts: Array<{ id: string; name: string; phone: string; tags: string[] }>; total: number }>(
      "GET", "/contacts", undefined, { search, tag, limit }
    );
    const lines = result.contacts.map((c) =>
      `• ${c.name} | ${c.phone} | tags: ${c.tags.join(", ") || "none"} | id: ${c.id}`
    );
    return {
      content: [{
        type: "text" as const,
        text: `Found ${result.total} contact(s):\n${lines.join("\n") || "(none)"}`,
      }],
    };
  }
);

// Tool: list_templates
server.tool(
  "list_templates",
  "List all WhatsApp message templates (approved and pending). Useful before sending to check available template names.",
  {},
  async () => {
    const result = await call<{ templates: Array<{ name: string; category: string; metaStatus: string; body: string }> }>(
      "GET", "/templates"
    );
    const lines = result.templates.map((t) =>
      `• ${t.name} [${t.category}] [${t.metaStatus}]\n  ${t.body.slice(0, 80)}${t.body.length > 80 ? "…" : ""}`
    );
    return {
      content: [{
        type: "text" as const,
        text: `${result.templates.length} template(s):\n\n${lines.join("\n\n") || "(none)"}`,
      }],
    };
  }
);

// Tool: get_events
server.tool(
  "get_events",
  "Fetch recent events from the WappFlow event log (inbound messages, new contacts, placed orders). Use 'after' for pagination.",
  {
    type: z.enum(["message.received", "contact.created", "order.placed", "message.status"]).optional()
      .describe("Filter by event type"),
    limit: z.number().int().min(1).max(100).optional().default(20),
    after: z.string().optional().describe("ISO 8601 timestamp — only return events after this time"),
  },
  async ({ type, limit, after }) => {
    const result = await call<{
      events: Array<{ id: string; type: string; data: unknown; createdAt: string }>;
      nextAfter: string | null;
    }>("GET", "/events", undefined, { type, limit, after });
    const lines = result.events.map((e) =>
      `• [${e.createdAt}] ${e.type}: ${JSON.stringify(e.data).slice(0, 100)}`
    );
    return {
      content: [{
        type: "text" as const,
        text: [
          `${result.events.length} event(s):`,
          ...lines,
          result.nextAfter ? `\nNext cursor: ${result.nextAfter}` : "",
        ].filter(Boolean).join("\n"),
      }],
    };
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(`WappFlow MCP server running (${baseUrl})\n`);
