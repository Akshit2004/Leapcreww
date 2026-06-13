# LeapCreww Public API & Webhooks

> Base URL: `https://<your-leapcreww-host>/api`
> Authentication: `Authorization: Bearer wf_live_...` (create keys in Settings → Developer Quickstart)

## Authentication & conventions

- Keys are scoped. Default scopes: `messages:send`, `contacts:read`, `contacts:write`, `templates:read`.
- Errors return `{ "error": "<message>" }` with a meaningful HTTP status (`401` bad key, `402` insufficient wallet, `403` missing scope, `422` validation).
- **Idempotency:** pass an `Idempotency-Key` header (≤255 chars) on `POST /v1/messages`. Replaying the same key returns the stored response (with `Idempotency-Replayed: true`) instead of sending twice.
- Rate limits apply per key; `429` responses include standard rate-limit headers.

## Messages

### `POST /v1/messages` — scope `messages:send`

Send a text, template, or media message. Sends are billed against the org wallet and appear in the Inbox.

```jsonc
// Session text (24h window)
{ "to": "+919876543210", "text": "Hello!" }

// Template with variables ({{1}}, {{2}}, ... in the template body)
{
  "to": "+919876543210",
  "template": {
    "name": "order_confirmation",
    "language": "en_US",          // optional, default en_US
    "variables": ["Asha", "Tomorrow", "https://track.example.com/1042"]
  }
}
// Shorthand for a variable-less template: "template": "welcome_message"

// Media (session window)
{ "to": "+919876543210", "media": { "type": "image", "url": "https://...", "caption": "New drop 🔥" } }
```

**Response:** `{ "ok": true, "waMessageId": "wamid...", "error": null }`

## Contacts

### `POST /v1/contacts` — scope `contacts:write`

Upsert by phone. Tags are merged, attributes shallow-merged. Returns `201` on create, `200` on update.

```json
{
  "phone": "+919876543210",
  "name": "Asha Rao",
  "email": "asha@example.com",
  "tags": ["vip", "newsletter"],
  "attributes": { "plan": "pro", "city": "Bengaluru" },
  "source": "my-crm"
}
```

### `GET /v1/contacts?phone=&tag=&limit=50&offset=0` — scope `contacts:read`

List/search contacts. `limit` is capped at 100.

## Templates

### `GET /v1/templates` — scope `templates:read`

Lists templates with their Meta approval status — check `metaStatus === "approved"` before sending.

## Outbound webhooks

Subscribe endpoints in **Settings → Outbound Webhooks**. Events:

| Event | Fires when |
|---|---|
| `message.received` | An inbound WhatsApp message arrives (includes contact + referral info) |
| `message.status` | A sent message changes status (`sent` → `delivered` → `read` / `failed`) |
| `order.placed` | An order is created (WhatsApp catalog, marketplace, Shopify, reorder) |

**Delivery format** — JSON POST:

```json
{
  "id": "<delivery id>",
  "event": "message.received",
  "createdAt": "2026-06-11T09:30:00.000Z",
  "data": { "...event payload..." }
}
```

**Verify the signature.** Every delivery is signed with your subscription's `whsec_...` secret:

```
x-leapcreww-event: message.received
x-leapcreww-signature: sha256=<HMAC-SHA256(secret, raw request body)>
```

```js
import crypto from "crypto";
const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
```

**Retries:** failed deliveries (non-2xx or timeout >5s) are retried up to 5 times with exponential backoff (~1m, 4m, 16m, ~1h). Respond `2xx` quickly; do heavy work async. Use the **Send test** button in Settings to verify your endpoint end-to-end.

## Cron requirements (self-hosting)

Schedule these with `Authorization: Bearer $CRON_SECRET`:

- `POST /api/cron/process-broadcasts` — campaign sends
- `POST /api/cron/process-sequences` — drip automation + abandoned-cart sweep
- `POST /api/cron/process-webhooks` — outbound webhook retries (every 1–5 min)
