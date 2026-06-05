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

/** Normalize a display name to Meta's required lowercase snake_case form. */
export function formatTemplateName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_");
}
