/** Templates feature types (Meta-approved message templates). */

export interface CreateTemplateInput {
  name: string;
  category: string;
  body: string;
  buttons?: string[];
  mediaType?: string;
  mediaUrl?: string | null;
  organizationId: string;
}

/** Normalize a display name to Meta's required lowercase snake_case form.
 * Meta allows [a-z0-9_], so existing underscores are preserved (not stripped);
 * any other punctuation is dropped and runs of whitespace collapse to "_". */
export function formatTemplateName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_]/g, "")
    .replace(/\s+/g, "_");
}
