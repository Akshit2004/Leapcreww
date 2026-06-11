import { z } from "zod";
import { route, ok } from "@/shared/lib/api";
import { parseBody } from "@/shared/lib/validation";
import { authenticateApiKey, requireScope } from "../../../services/apiKeyService";
import { listV1Contacts, upsertV1Contact } from "../../../services/v1Service";

const UpsertContactSchema = z.object({
  phone: z.string().trim().min(5).max(20),
  name: z.string().trim().max(255).optional(),
  email: z.string().trim().email().max(255).optional(),
  tags: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  source: z.string().trim().max(100).optional(),
});

/** GET /v1/contacts?phone=&tag=&limit=&offset= — list/search contacts. */
export const GET = route(async (req) => {
  const ctx = await authenticateApiKey(req);
  requireScope(ctx, "contacts:read");

  const url = new URL(req.url);
  const contacts = await listV1Contacts(
    ctx.organizationId,
    {
      phone: url.searchParams.get("phone") || undefined,
      tag: url.searchParams.get("tag") || undefined,
    },
    Number(url.searchParams.get("limit")) || 50,
    Number(url.searchParams.get("offset")) || 0
  );
  return ok({ contacts });
});

/** POST /v1/contacts — upsert by phone (tags merged, attributes shallow-merged). */
export const POST = route(async (req) => {
  const ctx = await authenticateApiKey(req);
  requireScope(ctx, "contacts:write");

  const payload = await parseBody(req, UpsertContactSchema);
  const { contact, created } = await upsertV1Contact(ctx.organizationId, payload);
  return ok({ contact, created }, { status: created ? 201 : 200 });
});
