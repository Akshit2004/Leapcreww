import type { HttpClient } from "../http";
import type { Template } from "../types";

export class TemplatesResource {
  constructor(private http: HttpClient) {}

  /**
   * List all WhatsApp templates (approved and pending review).
   * Requires scope `templates:read`.
   */
  async list(): Promise<{ templates: Template[] }> {
    return this.http.get<{ templates: Template[] }>("/templates");
  }
}
