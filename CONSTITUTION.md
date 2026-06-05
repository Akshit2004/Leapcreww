# WappFlow Engineering Constitution

> **STATUS: MANDATORY.** This document governs all development in this repository — human or AI.
> Every change MUST comply. If a change cannot comply, the constitution must be amended first
> (Article X), with the reason recorded. "It works" is not an exception to these rules.
>
> Companion docs: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (the how), [`docs/PRODUCT_COMPARISON_AISENSY.md`](docs/PRODUCT_COMPARISON_AISENSY.md) (the what/roadmap).

---

## Article I — Architecture & Layering

Every feature lives under `src/features/<feature>/` and MUST use this layering:

```
api/            thin route handlers: parse → guard → call service → respond
services/       business logic — no req/res, no prisma
repositories/   the ONLY place @/shared/lib/prisma may be imported within a feature
components/      React UI (calls routes over fetch)
context/         feature-local React state (optional)
types.ts         feature DTOs & shared types
```

**MUST**
- Route handlers MUST be thin and use `@/shared/lib/api` (`route`, `ok`, `fail`, `body`, `requireFields`, `requireSession`, `requireOrg`).
- Business logic MUST live in `services/`. Services take plain inputs, return plain data, and throw `ApiError` for HTTP-mapped failures.
- All Prisma access MUST go through `repositories/`.
- New live routes MUST be exposed via a one-line re-export shim under `src/app/api/**` (Next.js routing requirement).

**MUST NOT**
- Route handlers MUST NOT import `prisma` or call the Meta/Groq/Razorpay APIs directly.
- Services MUST NOT read `request`/`Response` or `NextRequest`/`NextResponse`.
- Business logic MUST NOT live in React components or in `api/` handlers.

## Article II — Data Layer Discipline

**MUST**
- `prisma` is imported only inside `repositories/` (feature) or `src/shared/lib/*` (infra). Nowhere else.
- Repository functions MUST be scoped by `organizationId` for any tenant-owned model.
- Multi-step writes that must succeed together MUST use `prisma.$transaction`.

**MUST NOT**
- No raw SQL unless a documented performance need exists and is reviewed.
- No N+1 query loops where an `include`/`in` query would do.

## Article III — Security & Multi-Tenancy

**MUST**
- Every route MUST authenticate (`requireSession`) and, for org-scoped resources, authorize (`requireOrg(orgId, minRole)`).
- Role gates: reads ≥ `AGENT`, mutations of shared config/billing/keys ≥ `ADMIN`, destructive org-level actions ≥ `OWNER`.
- Secrets MUST come from environment variables. Webhooks MUST verify signatures (WhatsApp HMAC, Razorpay, cron secret).
- API keys (T-08) MUST be stored hashed; plaintext is shown exactly once.

**MUST NOT**
- No secrets, tokens, or keys committed to the repo or logged.
- No tenant data returned without an org-scoped query + access check.

## Article IV — Verification Gates (non-negotiable)

A change is **not done** until all of these pass locally:

```bash
npx prisma validate          # schema is valid
npx tsc --noEmit             # zero type errors
SKIP_ENV_VALIDATION=1 npx next build   # compiles, all routes generate
```

**MUST**
- Keep `main` green. If the build breaks, fixing it is the top priority.
- Report results honestly: if a gate fails or was skipped, say so explicitly.

**MUST NOT**
- No `// @ts-ignore`, `// @ts-nocheck`, `any` casts, or `eslint-disable` to silence a real problem. Fix the cause.

## Article V — Schema & Migrations

**MUST**
- Schema changes go in `prisma/schema.prisma`, then `prisma generate`, then update the model summary in `docs/PRODUCT_COMPARISON_AISENSY.md` §7 if it adds a roadmap model.
- New models MUST declare the `organization` relation with `onDelete` behavior and add indexes for cron/scan queries (e.g. `nextRunAt`, `createdAt`).

**MUST NOT**
- No destructive migrations (drop/rename) without an explicit, reviewed plan.

## Article VI — Code Quality

**MUST**
- Write code that reads like the surrounding code: match naming, comment density, and idioms.
- Deliberate structure over speed. **No vibe coding.** Separate data from UI.
- Prefer reusing existing helpers (`shared/lib/*`) over re-implementing.
- Consolidate duplication into a service when the same logic appears twice (precedent: the broadcast send-loop).

**MUST NOT**
- No dead code, no commented-out blocks left behind, no speculative abstractions for a single caller.

## Article VII — AI / LLM Usage

**MUST**
- All LLM calls go through `@/shared/lib/groq` (or a documented successor), never inline `fetch` to a provider.
- AI features (copilot, template auditor, ad/flow generation) MUST degrade gracefully when `GROQ_API_KEY` is absent — never crash a request path.
- When building new AI features, default to the latest, most capable models and confirm provider/model details against current docs rather than memory.

## Article VIII — Git & Commits

**MUST**
- Branch off `main`; do not commit directly to `main` unless explicitly asked.
- Commit only what was asked; commit messages describe the *why*.
- Conventional prefixes (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).

**MUST NOT**
- No committing build artifacts, `node_modules`, `.env`, or secrets.
- No force-push to shared branches.

## Article IX — UI Quality Bar

**MUST**
- Honor the Swiss-editorial system: sharp borders (`rounded-none`), off-white surfaces (`bg-[#fafaf9]`), strict typography, the `wa-green` accent. Custom SVG and purposeful motion over generic SaaS components.
- Mobile-first: bottom nav, responsive tables/canvas, graceful degradation.

**MUST NOT**
- No generic "SaaS slop" (heavy drop shadows, soft rounded corners, default component-library look).

## Article X — Amending the Constitution

- This document may be changed, but a change to a rule MUST be a deliberate, explicit edit to this file with a one-line rationale — not silently bypassed in a feature PR.
- When rules here conflict with `claude.md`, **this constitution wins**.

---

## Pre-merge checklist (paste into every PR description)

```
[ ] Feature uses api/ services/ repositories/ layering (Article I)
[ ] prisma imported only in repositories/ or shared/lib (Article II)
[ ] Route authenticates + authorizes with correct min role (Article III)
[ ] prisma validate · tsc --noEmit · next build all pass (Article IV)
[ ] No ts-ignore / any / eslint-disable added to silence errors (Article IV)
[ ] Schema changes generated + docs §7 updated if applicable (Article V)
[ ] Matches surrounding style; duplication consolidated; no dead code (Article VI)
[ ] LLM calls go through shared/lib/groq and degrade gracefully (Article VII)
[ ] UI honors the design system (Article IX)
```
