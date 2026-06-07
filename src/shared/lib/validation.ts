/**
 * validation.ts — Zod request validation (Constitution, Article III).
 *
 * Companion to shared/lib/api.ts. Where `requireFields` only asserts presence,
 * these helpers assert *shape* — types, formats, lengths, enums — and reject
 * malformed input with a 400 before it reaches a service. Validation failures
 * throw `ApiError`, so the existing `route()` wrapper turns them into a clean
 * `{ error }` response automatically.
 *
 * Usage:
 *   const Schema = z.object({ to: z.string().min(5), text: z.string().max(4096) });
 *   const data = await parseBody(req, Schema);   // typed, validated
 */
import { z } from "zod";
import { ApiError } from "./api";

/** Collapse a ZodError into a single readable 400 message. */
function formatZodError(error: z.ZodError): string {
  const details = error.issues
    .map((issue) => {
      const path = issue.path.map(String).join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");
  return `Validation failed: ${details}`;
}

/** Validate already-parsed data against a schema, or throw 400. */
export function validate<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw new ApiError(formatZodError(result.error), 400);
  return result.data;
}

/** Parse a JSON request body and validate it against a schema, or throw 400. */
export async function parseBody<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError("Invalid JSON body", 400);
  }
  return validate(schema, raw);
}

/** Validate URL query parameters against a schema, or throw 400. */
export function parseQuery<T extends z.ZodTypeAny>(req: Request, schema: T): z.infer<T> {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  return validate(schema, params);
}
