import type { HttpClient } from "../http";
import type { Template } from "../types";
export declare class TemplatesResource {
    private http;
    constructor(http: HttpClient);
    /**
     * List all WhatsApp templates (approved and pending review).
     * Requires scope `templates:read`.
     */
    list(): Promise<{
        templates: Template[];
    }>;
}
//# sourceMappingURL=templates.d.ts.map