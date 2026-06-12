"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsResource = void 0;
class EventsResource {
    constructor(http) {
        this.http = http;
    }
    /**
     * Poll recent events (inbound messages, orders, new contacts).
     * Designed for webhook alternatives and Zapier-style integrations.
     *
     * Pass the returned `nextAfter` value back as `after` on the next
     * call to fetch only newer events — this is the cursor pattern.
     *
     * @example — simple poll
     * const { events, nextAfter } = await client.events.list({ type: "message.received" });
     *
     * @example — continuous polling loop
     * let after: string | null = null;
     * while (true) {
     *   const result = await client.events.list({ after: after ?? undefined });
     *   for (const event of result.events) processEvent(event);
     *   after = result.nextAfter;
     *   await new Promise(r => setTimeout(r, 60_000)); // poll every minute
     * }
     */
    async list(params = {}) {
        return this.http.get("/events", { params: params });
    }
}
exports.EventsResource = EventsResource;
//# sourceMappingURL=events.js.map