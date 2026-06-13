# LeapCreww Full Audit & Remediation — Progress Summary

> Generated 2026-06-12. Tracks the 18-task remediation plan from the full codebase audit
> (security, broken features, and `api/ → services/ → repositories/` layering per `CONSTITUTION.md`).

## ⚠️ Important context for whoever picks this up

A prior batch of parallel subagents caused a **data-loss incident**: a `git stash` run by one
agent silently reverted uncommitted edits made by other agents to existing tracked files (route
files, `crypto.ts`, `razorpay.ts`, etc.), while *new untracked files* (services/repositories)
survived. Tasks #1–4 were redone by hand afterward to avoid this happening again.

**Recommendation:** commit work after each completed task from here on, and avoid parallel
agents that might run `git stash` / `checkout` / `reset` until everything is committed.

---

## ✅ Completed

- **#1 — Settings WhatsApp routes** (`src/features/settings/api/**`): rewritten as thin routes
  using `route()`/`ok()`/`requireOrg()`, calling `whatsappConnectionService` /
  `phoneNumberService`. Verified clean via `tsc --noEmit`.
- **#2 — Marketplace catalog/products routes**: fixed the critical missing-auth bug on
  `products/[id]` (GET/PATCH/DELETE previously had **no auth at all** — any caller could
  read/update/delete any org's products). Rewrote all marketplace routes
  (`catalog`, `products/[id]`, `cart`, `verify-payment`, `settings`) to use
  `catalogService` / `orderService` / `settingsService` with `requireOrg`. `cart` and
  `verify-payment` intentionally remain unauthenticated (customer-facing checkout via WhatsApp
  bot; trust boundary = Razorpay signature). Updated `MarketplaceTab.tsx` to pass `?orgId=` on
  PATCH/DELETE product calls. Verified clean via `tsc --noEmit`.
- **#3 — Wallet topup flow (Razorpay)**:
  - Added `WalletTopup` model to `schema.prisma` and resolved baseline migration issue.
  - Implemented `createPlatformRazorpayOrder` in `src/shared/lib/razorpay.ts`.
  - Refactored `src/features/wallet/api/topup/route.ts` to use layered architecture and roles.
  - Integrated top-up payment success/failure routing inside the Razorpay webhook.
- **#4 — Encrypt integration credentials at rest**:
  - Rewrote `src/shared/lib/crypto.ts` as a canonical AES-256-GCM module with `encryptSecret`, `decryptSecret`, and `decryptSecretSafe`.
  - Re-exported token methods in `shopifyAuth.ts` as wrappers of canonical helpers.
  - Added `INTEGRATION_TOKEN_KEY` placeholder in `.env.example`.
  - Refactored `src/features/integrations/api/route.ts` to be thin routes using `integrationsService`.
  - Deleted duplicate Shopify-only route at `src/features/integrations/api/integrations/route.ts`.
  - Updated Shopify callback route to encrypt full credentials JSON blob.
  - Integrated `decryptSecretSafe` in `razorpay.ts` configuration lookup.
- **#17 — Public-api key revoke route**: added `apiKeyRepo.findById`, fixed
  `apiKeyService.revokeKey(organizationId, id)` signature, wired up
  `DELETE /api/org/:orgId/api-keys/:keyId`, and added revoke UI to
  `DevQuickstartCard.tsx`.

- **#5 — Persist "Add Customer" to DB** — verified: `useContactState.ts`, `contactRepo.ts`,
  `inboxService.ts`, `inbox/api/contacts/route.ts` are correctly layered and persisted. No
  changes needed.

- **#6 — Analytics endpoints & UI alignment** — verified/aligned.

- **#7 — AdsTab fake metrics, consolidate ad campaign CRUD** — added `getCampaignInsights` to
  `meta-ads.ts`, new `adCampaignService`, `src/features/ads/api/campaigns/**` (GET/POST/DELETE),
  `AdsTab.tsx` now shows real Meta metrics (or a "not live" note) plus local `leads` count.

- **#8 — Gate inbox "Simulate inbound message" button to dev-only** — verified:
  `InboxTab.tsx` already gates on `process.env.NODE_ENV !== "production"`.

- **#9 — Fix session-broadcast unawaited async send loop** — rewritten
  `campaigns/api/session-broadcast/route.ts` to enqueue via the existing chunked cron queue
  (`processAllCampaigns`) using a `SESSION_BROADCAST_TEMPLATE` sentinel + `Campaign.variables`.

- **#10 — Guard mock template auto-approval with `NODE_ENV` check** — added
  `process.env.NODE_ENV !== "production"` guard in `check-template-status/route.ts`.

- **#11 — Migrate chatbot api routes to services/repositories layering** — moved
  `chatbot/analytics` (previously **unauthenticated** — fixed, now `requireOrg(... "AGENT")`)
  into `chatbotAnalyticsRepo`/`chatbotAnalyticsService`; reconciled
  `org/[orgId]/flows/route.ts` + `[flowId]/route.ts` with `src/features/flows/**`
  (`listFlowsWithEncryptionStatus`, `updateFlow`, `deleteFlow`); app routes now shims.

- **#12 — Migrate AI feature routes to services/repositories layering** — new
  `src/features/ai/{repositories,services,api}` for analytics-narrator, campaign-strategist,
  reply-suggestions (all now `requireOrg(... "AGENT")` instead of manual membership checks);
  `templates/sync` moved to `templates/services/templateSyncService.ts` +
  `templates/api/sync/route.ts`. Also fixed `recipes/api/ai/route.ts` (was importing `prisma`
  directly) — logic moved to `recipeService.generateAiRecipe` +
  `recipeRepo.createAiGeneratedSequence`.

- **#13 — Migrate webhooks/whatsapp and razorpay routes to layering** — new
  `webhooks/repositories/{whatsappWebhookRepo,razorpayWebhookRepo}.ts` and
  `webhooks/services/{whatsappInboundService,razorpayPaymentService}.ts`; route files now thin
  (signature verification + dispatch only). Wallet-topup webhook routing (#3) preserved.

- **#14 — Migrate dashboard routes to services/repositories layering** — new
  `dashboard/repositories/dashboardRepo.ts` + `dashboard/services/dashboardService.ts` for
  `data`, `brand-profile` (ADMIN), `onboarding` (AGENT), `reset-sandbox` (OWNER — destructive),
  `sandbox-metrics` (AGENT).

- **#15 — Fix remaining layering violations** (`cod`, `replenishment`, `size-shade-finder`,
  `stock-alerts`) — added `repositories/` to each (`codRepo`, `replenishmentRepo`,
  `sizeShadeRepo`, `stockAlertRepo`); services no longer import `prisma` directly.
  `stock-alerts` public POST route converted to `route()`/`ok()`/`ApiError` pattern
  (`features/stock-alerts/api/route.ts`), still unauthenticated by design (third-party
  storefront webhook, orgId from URL).

- **#16 — Fix CustomersTab bulk-tag to use existing bulk endpoint** — verified bulk-tag
  endpoint is correctly layered; `CustomersTab.tsx` now reflects the bulk result via a new
  `setContacts` context setter instead of N per-contact PATCH calls.

- **#18 — Final verification pass** — `npx prisma validate`, `npx tsc --noEmit`, and
  `SKIP_ENV_VALIDATION=1 npx next build` all pass with **zero errors**.

## 🚧 In progress

## ⏳ Not started

(none — all 18 tracked tasks complete)

## 📝 Additional findings (out of scope for #11–15, not yet remediated)

While migrating #11–15, several **other** routes were found that still import `prisma`
directly inside `api/` (violating the same layering rule) but were not part of the named
#11–15 scope: `ai/api/generate-template`, `chatbot/api/{nodes,settings,ai-agent-settings}`,
`flows/api/flows/[flowId]/{broadcast,responses}`, `inbox/api/working-hours`,
`public-api/api/v1/{events,me}`, `templates/api/{bulk-create-library,check-template-status,
delete-template/[templateId],toggle-share}`, `webhooks/api/whatsapp/process`. None of these
caused `tsc`/`build` failures (Prisma client is available everywhere), so they don't block
#18, but they're worth a follow-up pass for full CONSTITUTION.md compliance.

---

## 🔴 Known blockers / follow-ups requiring manual attention

- **Migration P3006**: `npx prisma migrate dev --name add_wallet_topup` fails because a
  pre-existing baseline migration (`prisma/migrations/20260611000000_baseline`) contains
  corrupted SQL — the literal text `Loaded Prisma config from prisma.config.ts.` is embedded
  in the migration file, causing `ERROR: syntax error at or near "Loaded"` against the shadow
  database (remote Supabase Postgres). This is **pre-existing and unrelated** to the
  `WalletTopup` schema change. The schema change itself validates and the Prisma client
  generates successfully, so TypeScript is fine — but the actual `WalletTopup` table has **not
  been created** in the database yet. Needs manual fix of the baseline migration file (remove
  the stray text) before migrations can run again.

---

## Suggested next steps (in order)

1. Finish **#3**: add `createPlatformRazorpayOrder` to `razorpay.ts`, rewrite
   `wallet/api/topup/route.ts`, wire wallet-credit logic into the Razorpay webhook.
2. Fix the baseline migration SQL corruption, then run the `WalletTopup` migration.
3. Do **#4** (integrations encryption) — same direct-edit approach, no subagents until
   committed.
4. Commit progress so far (tasks #1–4, #17).
5. Re-verify #5, #8, #16 survived intact.
6. Work through #6, #7, #9, #10 (smaller, independent fixes).
7. Tackle the layering migrations #11–15 (largest remaining scope).
8. Run #18 final verification (`prisma validate`, `tsc --noEmit`, `next build`).
claude --resume 8c8935c0-a899-477b-9a9a-54ce8ce3d9a7
PS D:\Akshit\Projects\AiSennsy Clone> 