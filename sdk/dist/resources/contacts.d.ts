import type { HttpClient } from "../http";
import type { Contact, UpsertContactParams, UpsertContactResult, ListContactsParams, ListContactsResult } from "../types";
export declare class ContactsResource {
    private http;
    constructor(http: HttpClient);
    /**
     * List or search CRM contacts.
     * Requires scope `contacts:read`.
     */
    list(params?: ListContactsParams): Promise<ListContactsResult>;
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
    upsert(params: UpsertContactParams): Promise<UpsertContactResult>;
    /**
     * Add tags to an existing contact (or create the contact if not found).
     * Shorthand for `upsert({ phone, tags })`.
     *
     * @example
     * await client.contacts.tag("+919876543210", ["paid", "cohort-june"]);
     */
    tag(phone: string, tags: string[]): Promise<Contact>;
}
//# sourceMappingURL=contacts.d.ts.map