import { NextRequest, NextResponse } from "next/server";

const SPEC = {
  openapi: "3.1.0",
  info: {
    title: "WappFlow Public API",
    version: "1.0.0",
    description:
      "Send WhatsApp messages, manage contacts, and read templates programmatically. " +
      "All endpoints require a Bearer API key issued from Settings → Developer.",
    contact: { url: "https://wappflow.com/docs" },
  },
  servers: [{ url: "/api/v1", description: "Production" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "wf_live_<hex>",
        description:
          "API key from Settings → Developer Quickstart. Required scope listed per endpoint.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: { error: { type: "string" } },
      },
      Contact: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          phone: { type: "string", example: "+919876543210" },
          email: { type: "string", format: "email" },
          tags: { type: "array", items: { type: "string" } },
          attributes: { type: "object", additionalProperties: true },
          status: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Template: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          category: { type: "string", enum: ["Marketing", "Utility", "Authentication"] },
          status: { type: "string" },
          metaStatus: { type: "string" },
          body: { type: "string" },
        },
      },
      SendMessageRequest: {
        type: "object",
        required: ["to"],
        properties: {
          to: { type: "string", example: "+919876543210" },
          text: { type: "string", description: "Free-form text (requires active 24h session)" },
          template: {
            oneOf: [
              { type: "string", description: "Template name (uses en_US, no variables)" },
              {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" },
                  language: { type: "string", default: "en_US" },
                  variables: { type: "array", items: { type: "string" } },
                },
              },
            ],
          },
          media: {
            type: "object",
            required: ["type", "url"],
            properties: {
              type: { type: "string", enum: ["image", "video", "document"] },
              url: { type: "string", format: "uri" },
              caption: { type: "string" },
            },
          },
        },
      },
      SendMessageResponse: {
        type: "object",
        properties: {
          messageId: { type: "string" },
          waMessageId: { type: "string" },
          replayed: {
            type: "boolean",
            description: "true when response was served from the Idempotency-Key cache",
          },
        },
      },
      UpsertContactRequest: {
        type: "object",
        required: ["phone"],
        properties: {
          phone: { type: "string", example: "+919876543210" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          tags: { type: "array", items: { type: "string" } },
          attributes: { type: "object", additionalProperties: true },
        },
      },
    },
  },
  paths: {
    "/me": {
      get: {
        summary: "Verify API key",
        description:
          "Returns the connected workspace name and granted scopes. " +
          "Use as a health-check on startup or during OAuth-style key setup.",
        operationId: "getMe",
        responses: {
          "200": {
            description: "Workspace identity",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    organizationId: { type: "string", format: "uuid" },
                    name: { type: "string" },
                    scopes: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid or missing API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/messages": {
      post: {
        summary: "Send a message",
        description:
          "Send a WhatsApp message to a phone number. Requires scope `messages:send`. " +
          "Pass an `Idempotency-Key` header to make the send safe to retry.",
        operationId: "sendMessage",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",
            required: false,
            schema: { type: "string", maxLength: 255 },
            description: "Unique key for safe retries. Same key returns cached response.",
          },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SendMessageRequest" } } },
        },
        responses: {
          "200": {
            description: "Message sent (or replayed from idempotency cache)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SendMessageResponse" } } },
          },
          "402": { description: "Insufficient wallet balance", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Invalid or missing API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Missing scope messages:send", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/contacts": {
      get: {
        summary: "List contacts",
        description: "List or search contacts. Requires scope `contacts:read`.",
        operationId: "listContacts",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" }, description: "Filter by name or phone" },
          { name: "tag", in: "query", schema: { type: "string" }, description: "Filter by tag" },
          { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 200 } },
          { name: "cursor", in: "query", schema: { type: "string" }, description: "Pagination cursor (id of last item)" },
        ],
        responses: {
          "200": {
            description: "Contact list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    contacts: { type: "array", items: { $ref: "#/components/schemas/Contact" } },
                    total: { type: "integer" },
                    nextCursor: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Upsert a contact",
        description:
          "Create or update a contact by phone number. Tags and attributes are merged (not replaced). " +
          "Requires scope `contacts:write`.",
        operationId: "upsertContact",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpsertContactRequest" } } },
        },
        responses: {
          "200": {
            description: "Contact created or updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Contact" } } },
          },
        },
      },
    },
    "/templates": {
      get: {
        summary: "List templates",
        description: "List approved and pending WhatsApp templates. Requires scope `templates:read`.",
        operationId: "listTemplates",
        responses: {
          "200": {
            description: "Template list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { templates: { type: "array", items: { $ref: "#/components/schemas/Template" } } },
                },
              },
            },
          },
        },
      },
    },
    "/events": {
      get: {
        summary: "Poll recent events",
        description:
          "Paginated event log for recent inbound messages and orders. " +
          "Useful as a Zapier trigger source. Pass `after` cursor from the previous response.",
        operationId: "listEvents",
        parameters: [
          { name: "type", in: "query", schema: { type: "string", enum: ["message.received", "message.status", "order.placed", "contact.created"] } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "after", in: "query", schema: { type: "string" }, description: "ISO 8601 timestamp — return events after this time" },
        ],
        responses: {
          "200": {
            description: "Recent events",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    events: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          type: { type: "string" },
                          data: { type: "object", additionalProperties: true },
                          createdAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                    nextAfter: { type: "string", format: "date-time", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export async function GET(_req: NextRequest) {
  return NextResponse.json(SPEC, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
