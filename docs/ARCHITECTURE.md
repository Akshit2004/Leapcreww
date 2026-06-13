# LeapCreww Architecture & Folder Structure

This codebase follows a **feature-sliced** layout with a **thin-route / service / repository** layering. This document is the house style — build every roadmap task (see `PRODUCT_COMPARISON_AISENSY.md`) into this shape.

## Layering convention

```
src/features/<feature>/
  api/            thin Next.js route handlers — parse → guard → call service → respond
  services/       business logic (no req/res, no direct prisma)
  repositories/   ALL Prisma access for the feature (the only place prisma is imported)
  components/      React UI
  context/         feature-local React state/hooks (optional)
  types.ts         feature DTOs and shared types
```

Rules:
- **Routes never touch `prisma`.** They call a service.
- **Services never touch `req`/`res`.** They take plain inputs, return plain data, and throw `ApiError` for HTTP-mapped failures.
- **Repositories are the only place `@/shared/lib/prisma` is imported** inside a feature.
- UI components live in `components/` and call routes over `fetch`.

### Why the `src/app/api` shims exist
Next.js only serves routes under `src/app`. Each `src/app/api/**/route.ts` is a one-line re-export of the real handler in `src/features/<feature>/api/...`. This keeps domain logic in features while satisfying the router. Example:
```ts
// src/app/api/org/[orgId]/segments/route.ts
export { GET, POST } from "@/features/segments/api/segments/route";
```

## Shared foundation (`src/shared/lib`)

- **`api.ts`** — thin-route helpers: `route()` (error-boundary wrapper), `ok()`, `fail()`, `body()`, `requireFields()`, `requireSession()`, `requireOrg(orgId, minRole)`, and `ApiError`.
- **`authz.ts`** — typed session (`getAppSession`), `roleInOrg`, `hasOrgRole` (OWNER > ADMIN > AGENT).
- **`prisma.ts`, `whatsapp.ts`, `groq.ts`, `razorpay.ts`, `meta-catalog.ts`, `marketplace.ts`, `autoresponder.ts`** — cross-cutting infrastructure used by feature services.

A canonical thin route:
```ts
export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const input = await body<MyInput>(req);
  requireFields(input, ["name"]);
  return ok({ result: await myService.doThing(orgId, input) });
});
```

## New roadmap features (scaffolded)

| Feature | Task | State | Key files |
|---|---|---|---|
| `segments/` | T-04 | **Working** — rules→Prisma evaluator, CRUD, live count | `services/segmentRules.ts`, `segmentService.ts` |
| `sequences/` | T-03 | **Working** — enroll + cron step engine | `services/sequenceService.ts`, `api/process` (cron */15) |
| `billing/` | T-06 | **Working** — usage metering, wallet debit, pricing table | `services/billingService.ts`, `waPricing.ts` |
| `ads/` | T-01 | **Partial** — AI creative (Groq) + CRUD live; Meta publish = TODO | `services/adService.ts` |
| `flows/` | T-02 | **Partial** — CRUD live; Meta Flows publish = TODO | `services/flowService.ts` |
| `public-api/` | T-08 | **Working** — API keys (issue/verify) + `/v1/messages` | `services/apiKeyService.ts` |
| `partner/` | T-09 | **Partial** — CRUD + branding resolve; domain routing = TODO | `services/partnerService.ts` |
| `integrations/connectors/` | T-07 | **Scaffold** — `Connector` interface + registry + WooCommerce stub | `connectors/index.ts` |

Wiring hooks still to connect (documented in the service files):
- `sequences.enrollOnTrigger()` → call on tag-add / signup / cart-abandoned / ad-click.
- `billing.recordUsage()` → call in `shared/lib/whatsapp.ts` send success path.
- `ads.attributeLead()` → call in the WhatsApp webhook when an inbound `referral` is present.

## Existing-feature migration status

The layering was applied to these features (Prisma extracted to `repositories/`, logic to `services/`, routes made thin):

- ✅ `campaigns/` — consolidated the duplicated broadcast send-loop into `services/broadcastService.ts`.
- ✅ `inbox/` — `services/inboxService.ts` + `repositories/contactRepo.ts` (send, edit, import).
- ✅ `templates/` — `services/metaTemplateService.ts` (Meta resumable upload + submit).

Remaining features still in the original mixed-route style, to migrate with the **same mechanical pattern** (create `repositories/<x>Repo.ts` + `services/<x>Service.ts` + `types.ts`, slim the routes):

- ⏳ `campaigns/api/session-broadcast`
- ⏳ `dashboard` · `marketplace` · `settings` · `integrations` · `wallet`
- ⏳ `chatbot` · `ai` · `analytics` · `auth` · `webhooks`

> Each is independent and low-risk; do them one at a time and run `npx tsc --noEmit` after each. The build is green as of this commit.

## Verifying
```bash
npx prisma validate && npx prisma generate
npx tsc --noEmit
SKIP_ENV_VALIDATION=1 npx next build
```
