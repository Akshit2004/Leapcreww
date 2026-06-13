import { HttpClient } from "./http";
import { MessagesResource } from "./resources/messages";
import { ContactsResource } from "./resources/contacts";
import { TemplatesResource } from "./resources/templates";
import { EventsResource } from "./resources/events";
import type { Me, LeapCrewwOptions } from "./types";

export { LeapCrewwError } from "./errors";
export type * from "./types";

const DEFAULT_BASE_URL = "https://app.leapcreww.com";
const DEFAULT_TIMEOUT_MS = 30_000;

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
export class LeapCreww {
  readonly messages: MessagesResource;
  readonly contacts: ContactsResource;
  readonly templates: TemplatesResource;
  readonly events: EventsResource;

  private http: HttpClient;

  constructor(options: LeapCrewwOptions) {
    if (!options.apiKey) throw new Error("LeapCreww: apiKey is required");
    this.http = new HttpClient(
      options.baseUrl ?? DEFAULT_BASE_URL,
      options.apiKey,
      options.timeout ?? DEFAULT_TIMEOUT_MS
    );
    this.messages = new MessagesResource(this.http);
    this.contacts = new ContactsResource(this.http);
    this.templates = new TemplatesResource(this.http);
    this.events = new EventsResource(this.http);
  }

  /**
   * Verify the API key and retrieve workspace info.
   * Useful as a health-check on startup.
   *
   * @example
   * const { name, scopes } = await client.me();
   * console.log(`Connected to "${name}" with scopes: ${scopes.join(", ")}`);
   */
  me(): Promise<Me> {
    return this.http.get<Me>("/me");
  }
}
