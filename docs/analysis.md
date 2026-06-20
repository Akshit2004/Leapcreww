# LeapCreww — Product Analysis & God-Level Roadmap

> **Updated:** 2026-06-11 · Reflects integration-layer build + round-2 (billing gates, message dedup, order_placed trigger, 3 new recipes, widget attribution, OpenAPI spec, /v1/events polling)
> **North star:** A business goes from "found LeapCreww" to "WhatsApp working with their system" in **minutes, with clicks, not code.**
> **Companion docs:** [`docs/PUBLIC_API.md`](docs/PUBLIC_API.md) · [`docs/FEATURE_LIST.md`](docs/FEATURE_LIST.md) · [`CONSTITUTION.md`](CONSTITUTION.md)

## ✅ What's genuinely good

  1. Engineering discipline most startups don't have. CONSTITUTION.md with enforced layering (api/ → services/ → 
  repositories/), verification gates, and a no-vibe-coding rule. The code I sampled actually follows it — thin routes,
  services throwing ApiError, prisma confined to repositories.

  2. Security posture is well above average. A real audit happened (SECURITY_REMEDIATION_PLAN.md) and 12/13 findings
  are fixed: mandatory HMAC on all webhooks with timingSafeEqual, SHA-256 hashed API keys shown once, tiered edge rate
  limiting (ai/publicApi/standard), OTP lockouts, role-gated multi-tenancy (OWNER/ADMIN/AGENT) on every route.

  3. Feature breadth matches the market leader. Campaigns, templates with AI compliance audit, visual chatbot builder,
  WhatsApp Flows, drip sequences, segments, CTWA ads, attribution/ROI ledger, white-label partners, wallet billing —
  that's the full AiSensy surface.

  4. AI is integrated properly. All LLM calls through one shared/lib/groq, graceful degradation when the key is
  missing, and the AI features are practical (template auditor, flow architect, reply suggestions) not gimmicks.

  5. The docs are excellent — FEATURE_LIST.md, ARCHITECTURE.md, deployment and troubleshooting guides.

## 1. Where LeapCreww stands vs the market

| Capability | LeapCreww | AiSensy | WATI | Interakt |
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

---
❌ What's missing — and this is where it hurts, because your stated goal is "easy to integrate"

🔴 The integration story is the weakest part of the product

  1. The public API is one endpoint. POST /v1/messages — and it's shallow: hardcoded en_US template language, no
  template variables/components, no media, no buttons (src/features/public-api/api/v1/messages/route.ts:25). There is
  no API for contacts (upsert/tag/attributes), templates, campaign triggering, sequence enrollment, or conversations.
  AiSensy/WATI/Interakt customers integrate primarily through contact + campaign APIs — you can't replace them with
  this.

  2. Outbound webhooks don't exist. WebhookSubscription is in the schema and FEATURE_LIST.md claims "HMAC-signed
  deliveries with event filtering" — but zero code references the model. No event emission, no delivery worker, no
  retries. For "other systems integrate with us," outbound webhooks are the feature. Right now an external system has
  no way to know a message arrived or an order was placed.

  3. No OpenAPI spec, no developer docs, no SDKs, no Postman collection. "Easy to integrate" is measured in
  time-to-first-call. Today a developer would have to read your source code.

### ✅ 2.4 Outbound Webhooks + Test Button — SHIPPED
Paste URL → pick events → Subscribe → `whsec_` secret shown once → **Send test** → `✓ 200 OK — 142ms`.
- Events: `message.received`, `message.status`, `order.placed` (all 4 order paths)
- HMAC-SHA256 signed (`x-leapcreww-signature`) · 5s timeout · 5 retries, exponential backoff (1m→4m→16m→1h) via `/api/cron/process-webhooks`
- Files: `src/features/webhooks/` (deliveryService, subscriptionRepo, WebhooksCard)

  4. No idempotency keys → retried requests double-send messages (and would double-charge once billing is wired). No
  request IDs, no documented error envelope, no wf_test_ sandbox keys, no API changelog/versioning policy.

  5. The public API isn't billed. canAfford() and recordUsage() are exported from billingService.ts but never called
  from any send path — API sends are free and unmetered. FEATURE_LIST.md claims a pre-send balance guard that doesn't
  exist in code. Docs over-claiming vs. reality is a pattern worth fixing.

🔴 Reliability foundations

  6. Zero tests. 35k LOC, money movement (wallet, Razorpay), security-critical webhook verification, segment
  resolution logic — no test file anywhere. Your constitution gates (tsc/build) catch type errors, not logic bugs.

  7. CI is actively dangerous. .github/workflows/deploy.yml does nothing but prisma db push against the production
  database on every push to main — no tsc, no build, no lint gate, and db push (not migrations) can silently drop
  columns. There's no prisma/migrations/ directory at all → no migration history, no rollback path. This contradicts
  Constitution Article V.

  8. The broadcast engine won't scale. Cron-route + in-process delay loops on serverless = timeout death on a
  10k-contact campaign, and a crash mid-send loses position. It needs a real queue (QStash/Vercel Queues/BullMQ) with
  per-message jobs and an outbox pattern.

🟡 Product & polish gaps

  9. Inbox is shallow vs competitors — RoutingRule model exists but no UI; no canned replies, internal notes, working
  hours, SLAs, or conversation assignment workflow. This is where teams live daily.

  10. Identity confusion in the codebase: features/contacts (repos only) vs features/customers (components only) —
  same domain, split weirdly. usecase/* appointment-booking and marketplace/* routes look like a bolted-on vertical
  demo inside the horizontal platform — decide if that's a product pillar or demo cruft.

| # | Task | Why | Size | Status |
|---|------|-----|------|--------|
| 6 | **Team inbox depth** — conversation assignment UI (RoutingRule model exists, no UI), canned replies, internal notes, working hours/auto-away, unassigned queue | WATI wins deals on inbox alone; daily-use surface for every agent seat | L | ⏳ |
| 7 | **Zapier + Make + n8n connectors** — `GET /api/v1/events` polling endpoint now live (trigger source); needs Zapier/Make app publication + n8n community node | The no-code integration channel every competitor has; unlocks 5,000+ app pairings | M | ⚠️ partial |
| 8 | **OpenAPI 3.1 spec** → ~~serve at `/api/v1/openapi`~~ ✅ → Scalar/Mintlify docs page → generated Node + Python SDKs | Time-to-first-call is the real "easy to integrate" metric; no competitor ships real SDKs | M | ⚠️ partial |
| 9 | ~~**More recipes**~~ — ~~order_confirmation, review_request, win_back added; order_placed trigger wired across all order paths~~ | ~~Each recipe = one more "enable and done" reason to choose LeapCreww~~ | M | ✅ |
| 10 | ~~**Widget → chatbot bridge**~~ — ~~widget-sourced contacts auto-tagged (`source:widget`, `widget` tag, `widget_key` attr)~~ | ~~Closes the loop: paste snippet → visitor chats → CRM + automation, all attributed~~ | S | ✅ |
| 11 | **Multi-number support** — N phone numbers per org, number picker on campaigns/inbox | Agencies and multi-brand businesses require it | L | ⏳ |

  11. Repo hygiene: README.md is still default create-next-app boilerplate (terrible first impression), a video/
  directory and .antigravitycli checked in, SystemLog.timestamp stored as an "HH:MM" string (webhookService.ts:54) —
  unsortable, timezone-blind.

  12. Enterprise readiness: no data export, no 2FA/SSO, single phone number per org, Flow encryption "model ready,
  Meta TBD."

---
🎯 Roadmap to "god-level" (priority order)

┌─────┬──────────────────────────────────────────────────────┬──────────────────────────────────────────────────┐
│  P  │                         Move                         │                       Why                        │
├─────┼──────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
│     │ Ship outbound webhooks for real — event emitter in   │ The #1 "integrate with us" feature; schema is    │
│ P0  │ services, delivery worker with retries + HMAC +      │ already there                                    │
│     │ dead-letter                                          │                                                  │
├─────┼──────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
│ P0  │ Expand /v1: contacts upsert, template send with      │ Without this, no one can migrate from            │
│     │ variables/media, campaign trigger, conversation read │ AiSensy/WATI                                     │
├─────┼──────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
│ P0  │ Wire billing into every send path + idempotency keys │ You're currently giving away unmetered sends     │
├─────┼──────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
│ P0  │ Fix CI: tsc + build + lint gates, switch db push →   │ One bad push can corrupt prod today              │
│     │ prisma migrate deploy                                │                                                  │
├─────┼──────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
│ P1  │ OpenAPI spec → hosted docs (Mintlify/Scalar) →       │ Time-to-first-call is the real "easy to          │
│     │ generated SDKs (Node, Python)                        │ integrate" metric                                │
├─────┼──────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
│ P1  │ Tests for money + security paths (billing math, HMAC │ These are the paths that destroy trust when they │
│     │  verify, segment resolution, OTP lockout)            │  break                                           │
├─────┼──────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
│ P1  │ Queue-based broadcast engine                         │ Current design caps you at small sends           │
├─────┼──────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
│     │ Zapier/Make/n8n connectors + an MCP server so AI     │ In 2026, "easy to integrate" includes agents as  │
│ P2  │ agents can use LeapCreww as a tool                    │ integrators — this would genuinely differentiate │
│     │                                                      │  you                                             │
├─────┼──────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤
│ P2  │ Inbox depth (assignment UI, canned replies, notes),  │                                                  │
│     │ real README + landing for developers                 │                                                  │
└─────┴──────────────────────────────────────────────────────┴──────────────────────────────────────────────────┘

Bottom line: the application is impressively complete and disciplined — top-decile for a clone-stage product. But
the platform (API + webhooks + docs + reliability) is ~15% built, and that's exactly the part your goal statement
depends on. The good news: the architecture makes all of the P0 items straightforward to add.

the north star is: a business should go from "found LeapCreww" to "WhatsApp working with their system" in 
minutes, with clicks, not code. Here's how that maps concretely onto what you have, in order of leverage:

The "few clicks" integration architecture

1. Embeddable WhatsApp Button Widget — literally one line
  The classic killer feature (AiSensy/WATI both sell this hard). A business pastes one script tag and gets a floating
  WhatsApp chat button on their site:
  `<script src="https://leapcreww.com/widget.js" data-wf="org_abc123"></script>`
  Every click becomes a Contact in your CRM with source tracking, fires the welcome chatbot flow, and feeds
  attribution. You give it a no-code configurator in Settings (color, position, prefilled message, live preview) and a
  "Copy snippet" button. This is the purest "just a button" integration — works on Shopify, WordPress, Wix, anything,
  with zero developer involvement.
  
2. One-click Use-Case Recipes
  You already have `useCasePresets.ts` and all the primitives (templates, sequences, triggers). Bundle them into
  installable recipes:
  - "🛒 Abandoned cart recovery" → [Enable] → auto-creates the template, submits to Meta, creates the sequence with
  `cart_abandoned` trigger, wires the Shopify webhook
  - "📦 Order confirmations", "👋 Welcome flow", "⭐ Review collector" — same pattern
  One click installs the whole working automation. This converts your feature breadth into instant time-to-value
  instead of a learning curve.
  
3. Instant Developer Quickstart (2-minute first API call)
  A "Developers" tab where one button does everything: generates the API key, and renders ready-to-paste curl / Node /
  Python snippets with their actual key, org, and a real template name pre-filled — plus a "Send test message to my
  own phone" button right there in the UI so they see it work before writing any code.

4. Webhook Connect with a Test button
  Paste endpoint URL → click Subscribe → secret shown → [Send test event] button → green checkmark when their server
  responds 200. (This requires building the outbound delivery system underneath, which doesn't exist yet — but the UX
  is what sells it.)

5. Platform connect buttons — Shopify OAuth already works; same one-click pattern for WooCommerce/Wix, and
  eventually Zapier/Make for non-developers.

  The widget (#1) and recipes (#2) need zero code from the customer. The quickstart (#3) reduces developer integration
  to copy-paste. That covers both audiences.

The honest summary: LeapCreww now *integrates* like a god-level product. To *be* one, P0 (trust) and P1-6/7 (inbox, Zapier) are the gap between "demo that wows" and "platform businesses bet on."
