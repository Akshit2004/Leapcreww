"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesResource = void 0;
class MessagesResource {
    constructor(http) {
        this.http = http;
    }
    /**
     * Send a WhatsApp message to a phone number.
     *
     * Requires scope `messages:send`.
     *
     * @example — free-form text (requires active 24h session)
     * await client.messages.send({ to: "+919876543210", text: "Your order is ready!" });
     *
     * @example — approved template
     * await client.messages.send({
     *   to: "+919876543210",
     *   template: { name: "order_confirmation", variables: ["Rahul", "₹499"] },
     * });
     *
     * @example — media
     * await client.messages.send({
     *   to: "+919876543210",
     *   media: { type: "image", url: "https://cdn.example.com/receipt.jpg", caption: "Your receipt" },
     * });
     */
    async send(params) {
        const { idempotencyKey, ...body } = params;
        const headers = {};
        if (idempotencyKey)
            headers["Idempotency-Key"] = idempotencyKey;
        // Normalise shorthand template string → object
        if (typeof body.template === "string") {
            body.template = { name: body.template };
        }
        return this.http.post("/messages", { body, headers });
    }
}
exports.MessagesResource = MessagesResource;
//# sourceMappingURL=messages.js.map