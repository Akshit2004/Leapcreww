import { MessagesResource } from "./resources/messages";
import { ContactsResource } from "./resources/contacts";
import { TemplatesResource } from "./resources/templates";
import { EventsResource } from "./resources/events";
import type { Me, LeapCrewwOptions } from "./types";
export { LeapCrewwError } from "./errors";
export type * from "./types";
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
export declare class LeapCreww {
    readonly messages: MessagesResource;
    readonly contacts: ContactsResource;
    readonly templates: TemplatesResource;
    readonly events: EventsResource;
    private http;
    constructor(options: LeapCrewwOptions);
    /**
     * Verify the API key and retrieve workspace info.
     * Useful as a health-check on startup.
     *
     * @example
     * const { name, scopes } = await client.me();
     * console.log(`Connected to "${name}" with scopes: ${scopes.join(", ")}`);
     */
    me(): Promise<Me>;
}
//# sourceMappingURL=index.d.ts.map