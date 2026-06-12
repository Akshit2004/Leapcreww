"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplatesResource = void 0;
class TemplatesResource {
    constructor(http) {
        this.http = http;
    }
    /**
     * List all WhatsApp templates (approved and pending review).
     * Requires scope `templates:read`.
     */
    async list() {
        return this.http.get("/templates");
    }
}
exports.TemplatesResource = TemplatesResource;
//# sourceMappingURL=templates.js.map