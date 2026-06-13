"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeapCreww = exports.LeapCrewwError = void 0;
const http_1 = require("./http");
const messages_1 = require("./resources/messages");
const contacts_1 = require("./resources/contacts");
const templates_1 = require("./resources/templates");
const events_1 = require("./resources/events");
var errors_1 = require("./errors");
Object.defineProperty(exports, "LeapCrewwError", { enumerable: true, get: function () { return errors_1.LeapCrewwError; } });
const DEFAULT_BASE_URL = "https://app.leapcreww.com";
const DEFAULT_TIMEOUT_MS = 30000;
/**
 * LeapCreww API client.
 *
 * @example
 * import { LeapCreww } from "@leapcreww/sdk";
 *
 * const client = new LeapCreww({ apiKey: "wf_live_..." });
 *
 * // Send a WhatsApp message
 * await client.messages.send({ to: "+919876543210", text: "Hello!" });
 *
 * // Upsert a CRM contact
 * await client.contacts.upsert({ phone: "+919876543210", name: "Rahul", tags: ["vip"] });
 *
 * // Poll recent events
 * const { events } = await client.events.list({ type: "message.received" });
 */
class LeapCreww {
    constructor(options) {
        if (!options.apiKey)
            throw new Error("LeapCreww: apiKey is required");
        this.http = new http_1.HttpClient(options.baseUrl ?? DEFAULT_BASE_URL, options.apiKey, options.timeout ?? DEFAULT_TIMEOUT_MS);
        this.messages = new messages_1.MessagesResource(this.http);
        this.contacts = new contacts_1.ContactsResource(this.http);
        this.templates = new templates_1.TemplatesResource(this.http);
        this.events = new events_1.EventsResource(this.http);
    }
    /**
     * Verify the API key and retrieve workspace info.
     * Useful as a health-check on startup.
     *
     * @example
     * const { name, scopes } = await client.me();
     * console.log(`Connected to "${name}" with scopes: ${scopes.join(", ")}`);
     */
    me() {
        return this.http.get("/me");
    }
}
exports.LeapCreww = LeapCreww;
//# sourceMappingURL=index.js.map