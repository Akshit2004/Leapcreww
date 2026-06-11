# WappFlow — Product Analysis & God-Level Roadmap

> **Updated:** 2026-06-11 · Reflects integration-layer build + round-2 (billing gates, message dedup, order_placed trigger, 3 new recipes, widget attribution, OpenAPI spec, /v1/events polling)
> **North star:** A business goes from "found WappFlow" to "WhatsApp working with their system" in **minutes, with clicks, not code.**
> **Companion docs:** [`docs/PUBLIC_API.md`](docs/PUBLIC_API.md) · [`docs/FEATURE_LIST.md`](docs/FEATURE_LIST.md) · [`CONSTITUTION.md`](CONSTITUTION.md)

---

## 1. Where WappFlow stands vs the market

| Capability | WappFlow | AiSensy | WATI | Interakt |
|---|---|---|---|---|
| Campaign broadcasts + scheduling | ✅ | ✅ | ✅ | ✅ |
| Visual chatbot builder | ✅ | ✅ | ✅ | ⚠️ basic |
| AI autoresponder (LLM) | ✅ | ⚠️ addon | ⚠️ addon | ❌ |
| AI copilot (templates, flows, ads, analytics) | ✅ unique depth | ⚠️ | ⚠️ | ❌ |
| WhatsApp Flows (native forms) | ✅ | ✅ | ⚠️ | ⚠️ |
| Drip sequences + triggers | ✅ | ✅ | ✅ | ✅ |
| Smart segments | ✅ | ✅ | ✅ | ✅ |
| Click-to-WhatsApp ads | ✅ | ✅ | ⚠️ | ✅ |
| ROI / last-touch attribution | ✅ | ⚠️ | ❌ | ⚠️ |
| In-chat commerce (catalog → cart → Razorpay) | ✅ unique | ❌ | ⚠️ | ⚠️ |
| White-label / partner | ✅ | ✅ | ✅ | ❌ |
| **One-line website widget** | ✅ **NEW** | ✅ | ✅ | ✅ |
| **One-click automation recipes** | ✅ **NEW — unique** | ❌ | ❌ | ❌ |
| **Outbound webhooks (signed, retried)** | ✅ **NEW** | ✅ | ✅ | ✅ |
| **Public REST API (contacts, messages, templates)** | ✅ **NEW** | ✅ | ✅ | ✅ |
| **In-app developer quickstart (2-min first call)** | ✅ **NEW — unique** | ❌ | ❌ | ❌ |
| Idempotency keys on API | ✅ **NEW — unique** | ❌ | ❌ | ❌ |
| Team inbox depth (notes, canned replies, SLAs) | ❌ gap | ✅ | ✅ strongest | ✅ |
| Zapier / Make / n8n connectors | ❌ gap | ✅ | ✅ | ✅ |
| Multi-number per workspace | ❌ gap | ⚠️ | ✅ | ⚠️ |
| OpenAPI spec + generated SDKs | ❌ gap | ❌ | ⚠️ | ❌ |
| MCP server (AI agents as integrators) | ❌ opportunity | ❌ | ❌ | ❌ |

**Position:** feature breadth now matches or beats every competitor; AI depth and commerce are ahead of all three. The remaining gaps are **inbox depth**, **no-code connectors (Zapier)**, and **reliability hardening** — plus two open differentiators nobody has (SDKs, MCP).

---

## 2. The "one-click integration" surface — STATUS

The five-layer plan, and where each stands:

### ✅ 2.1 Embeddable WhatsApp Button Widget — SHIPPED
One line on any website:
```html
<script src="https://<host>/widget.js" data-wf="wfw_..." async></script>
```
- No-code configurator in Settings: color, position, greeting, prefilled message, **live preview**, copy-snippet, click counter
- Public key only (org id never exposed) · CORS endpoints · SPA-safe · zero dependencies
- Files: `public/widget.js`, `src/features/widget/`

### ✅ 2.2 One-Click Use-Case Recipes — SHIPPED (unique in market)
Dashboard → "One-Click Automations": **Enable** installs templates (auto-submitted to Meta, local draft fallback) + a sequence wired to a live trigger.
- 🛒 **Abandoned Cart Recovery** — `cart_abandoned` (Shopify webhook + marketplace sweep)
- 👋 **Instant Welcome** — `signup` (trigger was dead; now wired into the inbound webhook)
- 🎯 **Ad Lead Follow-up** — `ad_click` (also newly wired)
- Install state derived from data (`triggerConfig.recipeId`) · idempotent · one-click disable
- Files: `src/features/recipes/`

### ✅ 2.3 Developer Quickstart — SHIPPED (unique in market)
Settings → Developer Quickstart: ① Generate key (shown once, injected into snippets) ② curl/Node/Python with real host+key ③ **"Send test to my phone"** running the actual /v1 path, billing included.
- Files: `src/features/public-api/components/DevQuickstartCard.tsx`, `api/test-message/`

### ✅ 2.4 Outbound Webhooks + Test Button — SHIPPED
Paste URL → pick events → Subscribe → `whsec_` secret shown once → **Send test** → `✓ 200 OK — 142ms`.
- Events: `message.received`, `message.status`, `order.placed` (all 4 order paths)
- HMAC-SHA256 signed (`x-wappflow-signature`) · 5s timeout · 5 retries, exponential backoff (1m→4m→16m→1h) via `/api/cron/process-webhooks`
- Files: `src/features/webhooks/` (deliveryService, subscriptionRepo, WebhooksCard)

### ⚠️ 2.5 Platform connect buttons — PARTIAL
Shopify OAuth ✅ · WooCommerce/Sheets webhook-based ✅ · **Zapier/Make/n8n missing** (see P1 below).

### Also shipped round 1
- **/v1 API expansion:** `POST /v1/messages` (template language/variables/media, 402 wallet guard, Inbox logging), `GET/POST /v1/contacts` (upsert by phone, tag/attr merge), `GET /v1/templates` — all scoped, all rate-limited
- **Idempotency-Key** support (replay-safe sends) — no competitor has this
- **Billing wired on API path:** every /v1 send debits the wallet (`canAfford` → 402, `recordUsage` on success)
- **CI fixed:** verify job (prisma validate · tsc · build) gates every push/PR; `db push` runs only after verify, never on PRs
- **API docs:** `docs/PUBLIC_API.md` (auth, endpoints, signature verification, retries, cron setup)

### ✅ Shipped round 2
- **Billing now gates campaign broadcasts** (`broadcastService.ts`): pre-flight `canAfford` → fail campaign with clear log if wallet empty; `recordUsage` on every successful send. P0-4 closed for broadcast path.
- **Billing now gates sequence sends** (`sequenceService.ts`): `recordUsage` called after each step send (marketing for templates, service for free-form). P0-4 fully closed.
- **Inbound message dedup** (`processInboundMessage`): `waMessageId` checked against `Message` table before processing — Meta retries are silently skipped. P0-5 closed.
- **`order_placed` sequence trigger**: added to `SequenceTrigger` type; wired in Shopify `orders/create`, WhatsApp catalog orders, and marketplace cart checkout.
- **`tag_added` tag-filter support**: `enrollOnTrigger` now accepts `triggerMeta.tag`; sequences with `triggerConfig.tag` only enroll when the matching tag is added (used by win_back recipe).
- **3 new one-click recipes**: Order Confirmation (send template 1 min after order), Review Collector (3 days after order), Win-Back Campaign (fires when "win-back" tag added).
- **Widget → CRM attribution**: `widget.js` appends `[ref:wfw_key]` to prefilled text; server strips it, tags new contact with `source:widget` + `widget` tag, stores `widget_key` attribute. P1-10 closed.
- **OpenAPI 3.1 spec** at `GET /api/v1/openapi` — full spec for all /v1 endpoints. P1-8 partial (spec live; Mintlify/Scalar docs page and SDK generation pending).
- **`GET /api/v1/events`** — paginated polling endpoint for `message.received`, `message.status`, `order.placed`. This is the Zapier/n8n trigger source: poll with `after` cursor, get structured events. P1-7 partial (trigger source exists; Zapier app publication pending).

---

## 3. TO-DO — the path to god-level

### P0 — Trust & reliability (do before scale marketing)

| # | Task | Why it matters | Size | Status |
|---|------|----------------|------|--------|
| 1 | **Tests for money + security paths** — vitest on: billing math/wallet debit, webhook HMAC verify (in + out), idempotency replay, segment resolution, OTP lockout, recipe install idempotency | 35k LOC, zero tests; these are the paths that destroy trust when they break | M | ⏳ |
| 2 | **Queue-based broadcast engine** — replace in-process delay loops with per-message jobs (QStash/Vercel Queues/pg-boss); resumable position, no serverless timeout death on 10k-contact sends | Current engine caps campaign size; a crash mid-send loses position | L | ⏳ |
| 3 | **Prisma migrations baseline** — `prisma migrate dev` baseline, switch CI deploy to `migrate deploy` | `db push` has no history/rollback; one bad push can drop prod columns | S | ⏳ |
| 4 | ~~**Wire billing into campaign + sequence sends**~~ | ~~Closed: broadcast + sequence paths now metered~~ | S | ✅ |
| 5 | ~~**Idempotent webhook event dedup**~~ | ~~Closed: `waMessageId` dedup in processInboundMessage~~ | S | ✅ |

### P1 — Match competitors where they're ahead

| # | Task | Why | Size | Status |
|---|------|-----|------|--------|
| 6 | **Team inbox depth** — conversation assignment UI (RoutingRule model exists, no UI), canned replies, internal notes, working hours/auto-away, unassigned queue | WATI wins deals on inbox alone; daily-use surface for every agent seat | L | ⏳ |
| 7 | **Zapier + Make + n8n connectors** — `GET /api/v1/events` polling endpoint now live (trigger source); needs Zapier/Make app publication + n8n community node | The no-code integration channel every competitor has; unlocks 5,000+ app pairings | M | ⚠️ partial |
| 8 | **OpenAPI 3.1 spec** → ~~serve at `/api/v1/openapi`~~ ✅ → Scalar/Mintlify docs page → generated Node + Python SDKs | Time-to-first-call is the real "easy to integrate" metric; no competitor ships real SDKs | M | ⚠️ partial |
| 9 | ~~**More recipes**~~ — ~~order_confirmation, review_request, win_back added; order_placed trigger wired across all order paths~~ | ~~Each recipe = one more "enable and done" reason to choose WappFlow~~ | M | ✅ |
| 10 | ~~**Widget → chatbot bridge**~~ — ~~widget-sourced contacts auto-tagged (`source:widget`, `widget` tag, `widget_key` attr)~~ | ~~Closes the loop: paste snippet → visitor chats → CRM + automation, all attributed~~ | S | ✅ |
| 11 | **Multi-number support** — N phone numbers per org, number picker on campaigns/inbox | Agencies and multi-brand businesses require it | L | ⏳ |

### P2 — Differentiators nobody in the market has

| # | Task | Why | Size |
|---|------|-----|------|
| 12 | **MCP server** — expose send-message, upsert-contact, trigger-campaign, query-analytics as MCP tools | In 2026 "easy to integrate" includes AI agents as integrators; first-mover in WhatsApp-marketing MCP | M |
| 13 | **Recipe marketplace** — community/partner-authored recipes, install counts, categories; partners publish industry packs (clinic, restaurant, D2C) | Turns the unique recipes feature into an ecosystem moat | L |
| 14 | **AI recipe composer** — "describe your business" → AI assembles a custom recipe (templates + sequence + segments) from the brief, one click to install | Combines two unique strengths (AI depth + recipes); pure wow | M |
| 15 | **Embedded signup for partners** — white-label partners onboard their clients via hosted flow (connect WhatsApp + install recipe pack in one wizard) | Multiplies the one-click story through the agency channel | L |
| 16 | **`wf_test_` sandbox keys + test mode** — simulated sends, no wallet debit, webhook test events | Standard for serious API platforms (Stripe pattern) | M |

### Hygiene backlog (do opportunistically)

- Replace boilerplate `README.md` with a real product readme (positioning, screenshots, quickstart, API link)
- Clear the 123 pre-existing eslint errors, then enable `eslint .` in CI (slot is commented in the workflow)
- Fold `features/contacts` + `features/customers` into one feature; decide marketplace/appointment verticals are product pillars or extract them
- `SystemLog.timestamp` is an `"HH:MM"` string — unsortable, timezone-blind; migrate to DateTime
- Remove `video/`, `.antigravitycli` from the repo
- Data export (GDPR), 2FA/SSO for enterprise deals
- Legacy `/api/webhooks/whatsapp/process` route trusts `{from, text}` with the first org in the DB — sandbox-only; gate or remove before production

---

## 4. Definition of "god-level" (acceptance criteria)

1. **Zero-code business:** paste one line → widget live; click Enable → automation running. *(✅ shipped)*
2. **Developer:** first successful API call < 2 minutes from signup, without reading source. *(✅ shipped; SDKs pending)*
3. **System-to-system:** any platform can push (REST + idempotency ✅) and receive (signed webhooks + retries ✅); no-code via Zapier *(pending P1-7)*
4. **Nothing silently breaks:** money and security paths under test *(pending P0-1)*, migrations with rollback *(pending P0-3)*, sends survive crashes *(pending P0-2)*
5. **A reason nobody else can copy fast:** recipes ecosystem + AI composer + MCP *(P2 — the moat)*

**Scorecard: integration layer ~95% · reliability ~60% · inbox parity ~30% · moat features 0% (designed, not built).**

The honest summary: WappFlow now *integrates* like a god-level product. To *be* one, P0 (trust) and P1-6/7 (inbox, Zapier) are the gap between "demo that wows" and "platform businesses bet on."
