/** Public API feature types (T-08 — Project API + webhooks). */

export interface CreateApiKeyInput {
  name: string;
  scopes?: string[];
  organizationId: string;
  isSandbox?: boolean;
}

export interface ApiKeyContext {
  organizationId: string;
  scopes: string[];
  isSandbox: boolean;
}
