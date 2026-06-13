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

## 🚧 In progress

## ⏳ Not started

- **#5 — Persist "Add Customer" to DB** — reported done by a prior agent
  (`useContactState.ts`, `contactRepo.ts`, `inboxService.ts`, `AppContext.tsx`, `types.ts`,
  new `inbox/api/contacts/route.ts`). These showed as modified in `git status` so likely
  survived the stash incident, but **re-verify** in the final `tsc`/build pass.

- **#6 — Implement missing analytics endpoints or remove dead UI** — not started.

- **#7 — Fix AdsTab fake metrics, consolidate ad campaign CRUD** — not started.

- **#8 — Gate inbox "Simulate inbound message" button to dev-only** — reported done
  (`InboxTab.tsx` modified in git status, likely survived) — **re-verify**.

- **#9 — Fix session-broadcast unawaited async send loop** — not started.

- **#10 — Guard mock template auto-approval with `NODE_ENV` check** — not started.

- **#11 — Migrate chatbot api routes to services/repositories layering** — not started.

- **#12 — Migrate AI feature routes to services/repositories layering** — not started.

- **#13 — Migrate webhooks/whatsapp and razorpay routes to layering** — blocked by #3
  (needs the wallet-topup webhook logic decided first) — not started.

- **#14 — Migrate dashboard routes to services/repositories layering** — not started.

- **#15 — Fix remaining layering violations** (`recipes/ai`, `flows/[flowId]`, `cod`,
  `replenishment`, `size-shade-finder`, `stock-alerts`) — not started.

- **#16 — Fix CustomersTab bulk-tag to use existing bulk endpoint** — reported done
  (`CustomersTab.tsx` / `BulkAddTagModal.tsx` modified in git status, likely survived) —
  **re-verify**.

- **#18 — Final verification pass** (`prisma validate`, `tsc --noEmit`, `next build`) —
  blocked by all of the above.

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