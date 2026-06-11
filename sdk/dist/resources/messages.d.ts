import type { HttpClient } from "../http";
import type { SendMessageParams, SendMessageResult } from "../types";
export declare class MessagesResource {
    private http;
    constructor(http: HttpClient);
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
    send(params: SendMessageParams): Promise<SendMessageResult>;
}
//# sourceMappingURL=messages.d.ts.map