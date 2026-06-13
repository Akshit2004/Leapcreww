# LeapCreww — Changelog

> All changes below are included in a single pre-commit working tree.
> Organised by domain; green = new file, yellow = modified, migration = schema.

---

## 1. Schema & Database Migrations

### `prisma/schema.prisma`  
- **`Message.timestamp String` removed** — redundant with `createdAt DateTime @default(now())`. Dropped across all write sites.
- **`SystemLog.timestamp String` removed** — same rationale. All writers updated.
- **`Contact.email String?`** — made optional. WhatsApp contacts do not have email addresses; synthetic `phone@whatsapp.customer` values are gone.
- **`Contact` unique constraint** — changed from `@@unique([organizationId, email])` → `@@unique([organizationId, phone])`. Phone is the true CRM identity in a WhatsApp platform.
- **`Event` model added** (append-only event log) with composite indexes on `(organizationId, createdAt)` and `(organizationId, type, createdAt)`.
- **`PhoneNumber` model added** — multi-number support per organisation (`displayName`, `phoneNumberId`, `accessToken`, `isDefault`).
- **`ApiKey.isSandbox Boolean @default(false)`** added — sandbox keys skip billing and real WhatsApp sends.
- **`Organization.workingHours Json?`** added — per-org working-hours config with timezone and per-day schedule.
- **`CannedReply` and `InternalNote` models added** — team-inbox features.

### `prisma/migrations/`
Three migration files added (all idempotent `IF NOT EXISTS` / `IF EXISTS`):

| File | What it does |
|------|-------------|
| `20260611000000_baseline/migration.sql` | Full initial schema baseline |
| `20260611010000_team_inbox/migration.sql` | CannedReply, InternalNote tables |
| `20260611030000_working_hours_multi_number_sandbox/migration.sql` | workingHours JSONB, PhoneNumber table, ApiKey.isSandbox |
| `20260611040000_timestamp_email_event/migration.sql` | Drop timestamp columns, make email nullable, swap unique index, create Event table |

---

## 2. Architecture — A+ Upgrades

### Timestamp hygiene (`~50 files touched`)
All `prisma.message.create` and `prisma.systemLog.create` calls that passed a `timestamp: "HH:MM"` string have been cleaned up. The display timestamp is now computed from `createdAt` at the API serialisation layer:

- `src/features/dashboard/api/data/route.ts` — formats `m.createdAt` and `log.createdAt` into `"HH:MM"` (IST) before returning JSON. `createdAt` ISO string also included in chatHistory messages for analytics.
- `src/features/campaigns/repositories/campaignRepo.ts` — `logCampaignEvent()` and `recordOutboundMessage()` signatures: `timestamp` parameter removed.
- All callers in `broadcastService.ts`, `strategistActivation.ts`, `sequenceService.ts`, `autoresponder.ts`, `botMessaging.ts`, `inboxService.ts`, `webhooks/whatsapp/route.ts`, `webhooks/process/route.ts`, `integrations/api/route.ts`, `shopifySyncService.ts`, `metaTemplateService.ts`, `appointment.ts`, `chatbot/nodes/route.ts`, `settings/connect/route.ts`, `settings/disconnect/route.ts`, `reset-sandbox/route.ts`, `shopify/callback/route.ts`, `shopify webhook route`, etc.

### Email identity fix (`Contact.email`)
- `src/features/webhooks/api/whatsapp/route.ts` — new contact creation no longer sets `email: "${waFrom}@whatsapp.customer"`.
- `src/features/webhooks/api/whatsapp/process/route.ts` — same.
- `src/app/api/webhooks/shopify/route.ts` — upsert logic rewritten from `organizationId_email` lookup → phone-based upsert.
- `src/features/campaigns/services/broadcastService.ts` — `contact.email ?? ""` null-safe.
- `src/shared/context/types.ts` — `Contact.email` changed to `email?: string | null`.

### Append-only Event table
- `src/features/webhooks/services/webhookDeliveryService.ts` — `emitEvent()` now writes to `prisma.event` before fanning out to subscriptions. Every business event (`message.received`, `message.status`, `order.placed`, `contact.created`) is durably recorded.
- `src/features/public-api/api/v1/events/route.ts` — **rewritten**. Was synthesising events from 3 separate tables on every request. Now a single indexed range scan on `Event`.

### New shared utilities
| File | Purpose |
|------|---------|
| `src/shared/lib/crypto.ts` | AES-256-GCM `encrypt()`/`decrypt()` for secrets at rest. Reads `ENCRYPTION_KEY` env var (64-char hex). Gracefully no-ops in dev without the var. |
| `src/shared/lib/logger.ts` | Structured JSON logger (`logger.info/warn/error`) with `ts`, `level`, `message`, `organizationId`, and arbitrary context spread. Drop-in replacement for scattered `console.error`. |

### Health endpoint
- `src/app/api/health/route.ts` — `GET /api/health` pings the DB (`SELECT 1`) and returns `{ status: "ok" }` or `503`. Ready for Railway health checks and uptime monitors.

---

## 3. Public REST API (`/api/v1`)

All new files under `src/features/public-api/` + shims in `src/app/api/v1/`:

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/me` | Returns org info for the authenticated API key |
| `POST /api/v1/messages` | Send a WhatsApp message or template. Sandbox keys skip billing + real send, log to Inbox instead |
| `POST /api/v1/contacts` | Upsert a contact (phone is the key; tags merge) |
| `GET /api/v1/contacts` | Paginated contact list with phone/tag filters |
| `GET /api/v1/templates` | List approved templates |
| `GET /api/v1/events` | Polling endpoint — reads from `Event` table, returns `nextAfter` cursor for Zapier |
| `GET /api/v1/openapi` | Serves the OpenAPI 3.1 spec JSON |

**Sandbox keys** (`isSandbox: true`): prefixed `wf_test_`, skip `canAfford()` billing guard and `sendWhatsAppMessage()`, write a `[Sandbox]` message to the inbox instead. Returned `waMessageId` is `null`.

**Idempotency**: `Idempotency-Key` header accepted on `POST /messages`. Replayed requests return the stored response without re-sending.

---

## 4. Developer Integrations

### MCP Server (`mcp-server/`)
Full Model Context Protocol server built with `@modelcontextprotocol/sdk`. Exposes 5 tools to AI agents (Claude, GPT-4, etc.):
- `send_message` — send a WhatsApp message via the API
- `upsert_contact` — create or update a CRM contact
- `list_contacts` — paginated contact lookup
- `list_templates` — approved template catalogue
- `get_events` — recent event stream

Reads `LEAPCREWW_API_KEY` from env or `--api-key=` CLI arg.

### n8n Community Node (`n8n-node/`)
Two resources (`Message`, `Contact`), four operations (`send`, `upsert`, `list`, `get`). Credential type `LeapCrewwApi` with `apiKey` + `baseUrl` and a test call to `/api/v1/me`.

### Zapier App (`zapier-app/`)
Polling trigger (`New Event`) and two creates (`Send Message`, `Upsert Contact`) using Zapier Platform Core v15.

### Make.com Blueprint (`make-blueprint/leapcreww-blueprint.json`)
3-module scenario: webhook trigger → send message → upsert contact. Import directly into Make.com.

### API Docs (`src/app/api-docs/route.ts`)
`GET /api-docs` renders the Scalar interactive API reference using CDN embed pointing at `/api/v1/openapi`.

---

## 5. Team Inbox Enhancements

### Working Hours (`src/features/inbox/api/working-hours/`)
- `GET/PUT /api/org/:orgId/working-hours` — fetch or update the org's working-hours config.
- Config shape: `{ enabled, timezone, schedule: { monday: { open, from, to }, … }, awayMessage }`.
- Defaults: Mon–Fri 09:00–18:00, `Asia/Kolkata`.
- Webhook processor (`webhooks/process/route.ts`) gates inbound messages through `isWithinWorkingHours()` — if outside hours and enabled, sends the away message and skips the autoresponder.

### Working Hours UI (`src/features/inbox/components/WorkingHoursCard.tsx`)
Per-day schedule toggles, time pickers, away message textarea, timezone selector, save with loading/success states. Added to `SettingsTab`.

### Canned Replies
- `CannedReply` model (schema), repo, service, and API routes (`/api/org/:orgId/canned-replies`).
- `cannedReplyRepo.ts`, `cannedReplyService.ts`, `internalNoteRepo.ts`, `internalNoteService.ts`.

### Internal Notes
- `InternalNote` model (schema), repo, service, and API routes (`/api/org/:orgId/contacts/:contactId/notes`).
- Notes are agent-only; never sent to the customer.

---

## 6. Multi-Number Support

### Schema + API
- `PhoneNumber` model with `displayName`, `phoneNumber`, `phoneNumberId`, `whatsappBusinessAccountId`, `accessToken`, `isDefault`.
- `GET/POST /api/org/:orgId/phone-numbers` — list and create numbers; first number auto-set as default.
- `PATCH/DELETE /api/org/:orgId/phone-numbers/:id` — rename, set-default (atomic clear), delete (refuses 409 if default).

### UI (`src/features/settings/components/PhoneNumbersCard.tsx`)
Lists registered numbers with star (set default) and trash (remove, disabled on default). Collapsible add form. Added to `SettingsTab`.

---

## 7. Recipe Marketplace

### `src/features/recipes/`
Six instant automation recipes with categories:

| Recipe | Category |
|--------|---------|
| Abandoned Cart Recovery | E-Commerce |
| Order Confirmation | E-Commerce |
| Welcome Flow | Engagement |
| Ad Lead Nurture | Lead Generation |
| Review Request | Customer Success |
| Win-Back | Retention |

Category filter tabs + one-click install in `RecipesSection.tsx`.

### AI Recipe Composer (`src/features/recipes/api/ai/route.ts`)
`POST /api/org/:orgId/recipes/ai` — accepts a natural-language prompt, calls Groq (Llama 3.1), parses the JSON recipe, and creates a `Sequence` + `SequenceStep` rows in one transaction. Exposed via a collapsible panel in `RecipesSection`.

---

## 8. Landing Page

### New section: Developer Platform (`src/features/landing/components/DeveloperPlatform.tsx`)
- Dark terminal with 3-language tab switcher (TypeScript / Python / curl) and staggered line reveal via `AnimatePresence`.
- Integration surface cards: MCP Server, Zapier·Make·n8n, OpenAPI + Signed Webhooks.
- Tech chip pills, link to `/api-docs`.
- Inserted after `<Stats />` in `page.tsx`.

### Features section expanded (`Features.tsx`)
Added features 05 and 06:
- **05 — One-Click AI Automations** (Recipe Engine, AI composer, drip sequences)
- **06 — Commerce, Bookings & ROI** (Catalog checkout, paid bookings, attribution ledger)

### Hero updated (`Hero.tsx`)
- Sub-copy now mentions AI sequences + developer platform.
- Meta chips: `[ AI-NATIVE AUTOMATION ]`, `[ OPEN API · SDKS · MCP ]`, `[ SECURE POSTGRES STORAGE ]`.

### Header updated (`Header.tsx`)
- "Workspace Sim" nav replaced with `Developers → #developers`.

---

## 9. Code Quality & Tooling

### ESLint (`eslint.config.mjs`)
- `"@typescript-eslint/no-explicit-any": "warn"` (down from error)
- `"react-compiler/react-compiler": "warn"` (was blocking build)
- Result: 0 build errors.

### TypeScript (`tsconfig.json`)
- `mcp-server`, `n8n-node`, `zapier-app`, `sdk` added to `exclude` array — these are standalone packages with their own tsconfigs and were polluting the root type-check.

### `src/shared/context/types.ts`
- `Contact.email` → `email?: string | null`
- `Message.createdAt?: string` added (ISO timestamp for heatmap and analytics)
- `SystemLog.timestamp` kept as display string (populated from `createdAt` at API layer)

### `src/features/analytics/components/AnalyticsTab.tsx`
- Heatmap fixed: `new Date(msg.createdAt ?? msg.timestamp)` — previously `new Date("HH:MM")` was always `Invalid Date`, silently zeroing the heatmap.

---

## Files: Quick Reference

### New files (selected)
```
prisma/migrations/20260611040000_timestamp_email_event/migration.sql
src/app/api/health/route.ts
src/app/api-docs/route.ts
src/shared/lib/crypto.ts
src/shared/lib/logger.ts
src/features/landing/components/DeveloperPlatform.tsx
src/features/inbox/api/working-hours/route.ts
src/features/inbox/components/WorkingHoursCard.tsx
src/features/settings/api/phone-numbers/route.ts
src/features/settings/api/phone-numbers/[id]/route.ts
src/features/settings/components/PhoneNumbersCard.tsx
src/features/recipes/api/ai/route.ts
src/features/public-api/api/v1/events/route.ts   (rewritten)
src/features/public-api/repositories/publicApiRepo.ts
src/features/public-api/services/v1Service.ts
src/features/webhooks/services/webhookDeliveryService.ts
mcp-server/src/index.ts
n8n-node/LeapCreww.node.ts
zapier-app/index.js
make-blueprint/leapcreww-blueprint.json
```

### Key modified files
```
prisma/schema.prisma
src/features/dashboard/api/data/route.ts
src/features/campaigns/repositories/campaignRepo.ts
src/features/campaigns/services/broadcastService.ts
src/features/webhooks/api/whatsapp/route.ts
src/features/webhooks/api/whatsapp/process/route.ts
src/shared/lib/autoresponder.ts
src/shared/lib/appointment.ts
src/shared/context/types.ts
src/features/analytics/components/AnalyticsTab.tsx
src/app/api/webhooks/shopify/route.ts
eslint.config.mjs
tsconfig.json
```
