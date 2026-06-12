"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactsResource = void 0;
class ContactsResource {
    constructor(http) {
        this.http = http;
    }
    /**
     * List or search CRM contacts.
     * Requires scope `contacts:read`.
     */
    async list(params = {}) {
        return this.http.get("/contacts", { params: params });
    }
    /**
     * Create a new contact or update an existing one matched by phone number.
     * Tags and attributes are **merged**, not replaced.
     * Requires scope `contacts:write`.
     *
     * @example
     * const { contact, created } = await client.contacts.upsert({
     *   phone: "+919876543210",
     *   name: "Rahul Verma",
     *   tags: ["vip", "newsletter"],
     *   attributes: { plan: "pro", mrr: 499 },
     * });
     */
    async upsert(params) {
        return this.http.post("/contacts", { body: params });
    }
    /**
     * Add tags to an existing contact (or create the contact if not found).
     * Shorthand for `upsert({ phone, tags })`.
     *
     * @example
     * await client.contacts.tag("+919876543210", ["paid", "cohort-june"]);
     */
    async tag(phone, tags) {
        const { contact } = await this.upsert({ phone, tags });
        return contact;
    }
}
exports.ContactsResource = ContactsResource;
//# sourceMappingURL=contacts.js.map